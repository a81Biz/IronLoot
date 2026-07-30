# Casos de Uso Detallados (Escenarios) — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/B/D`, controllers y services de `src/api`/`src/apps`/`src/admin` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 04-App-Flow, 02-PRD, 08-API-Catalog |
| **Código usado** | `auth`, `auctions`, `bids`, `wallet`, `disputes`, `admin`, `scheduler` |
| **Nivel de confianza** | Alto |

> Escenarios **Happy / Alternativo / Excepción** verificados contra el código. La lista completa y la matriz actor×caso están en [Catálogo de Casos de Uso](../transversal/Catalogo-Maestro-de-Casos-de-Uso.md). Aquí se detallan los flujos críticos. Reglas por `RN-*`.

---

## UC-01 — Registrarse y verificar email
- **Actor:** Visitante · **Precondición:** email no registrado.
- **Happy:** completa formulario (BASE) → `POST /auth/register` → usuario en `PENDING_VERIFICATION` + email con enlace → `POST /auth/verify-email?token` → estado `ACTIVE`. `[auth.controller.ts:49,161]`
- **Alternativo:** reenvío de verificación `POST /users/me/resend-verification`. `[users.controller.ts:206]`
- **Excepción:** email/username duplicado → 409; recaptcha inválido → rechazo (`RecaptchaGuard`); rate limit 5/60s. `[RN-52]`

## UC-02 — Iniciar sesión (con 2FA opcional)
- **Actor:** Comprador/Vendedor · **Precondición:** cuenta ACTIVE.
- **Happy:** `POST /auth/login` → JWT (15m) + refresh (7d); si 2FA activo exige código TOTP. `[auth.service.ts:259]`
- **Alternativo:** refrescar token `POST /auth/refresh`.
- **Excepción:** no verificado → 403 `USER_NOT_VERIFIED` (`RN-03`); SUSPENDED/BANNED → bloqueado (`RN-04`); credenciales inválidas → 401; rate limit 5/60s.

## UC-05 — Pujar en una subasta ✅ (cadena completa desde 2026-07-29)
- **Actor:** Comprador · **Precondición:** subasta ACTIVE/PUBLISHED no expirada; wallet con saldo.
- **Happy (backend):** `POST /auctions/:id/bids` → valida (`RN-13/15/16`) → bloquea fondos (`RN-22`) → crea puja → actualiza `currentPrice` → libera al líder anterior (`RN-23`) → si tardía, soft-close extiende (`RN-17`) → emite `bid:new`/`auction:extended`. `[bids.service.ts:71-176]`
- **Alternativo:** ser superado → notificación BID_OUTBID + liberación de fondos.
- **Excepción:** puja ≤ actual → `BID_TOO_LOW`; puja a su propia subasta → `BID_ON_OWN_AUCTION`; fondos insuficientes → error + no se crea puja; fallo en TX → compensación libera lo recién retenido. `[bids.service.ts:79-202]`
- **✅ Estado real (2026-07-29):** la puja se hace desde el detalle de la subasta, con cliente Socket.io en `pages-auction-detail.js` (`AUD-002` **corregido**). El incremento mínimo configurado no se aplica (`AUD-009`).

## UC-06 — Cierre de subasta y adjudicación (Sistema)
- **Actor:** Sistema (scheduler) · **Trigger:** cron cada minuto.
- **Happy:** con lock Redis (`lock:auction-close`): subastas `ACTIVE` con `endsAt≤now` → `CLOSED`; puja más alta = ganador → Orden `PAID`; captura del ganador (`DEBIT_ORDER`) → crédito vendedor (`CREDIT_SALE`) − comisión (`FEE_PLATFORM`); libera held de perdedores; notifica y emite `auction:ended`. `[auction-scheduler.service.ts:105-254]`
- **Alternativo:** sin pujas → cierra sin orden.
- **Excepción:** otra instancia tiene el lock → se omite (evita doble proceso). **Riesgo:** el settlement tenía baja cobertura; el `CloseAuctionUseCase` de `core` se retiró por ADR-033 y la orquestación vive en los services (`AUD-012` corregido, PT-191).

## UC-08 — Depositar en el monedero ✅
- **Actor:** Comprador/Vendedor.
- **Happy:** inicia pago `POST /payments/initiate` (MP/PayPal) → paga en proveedor → webhook `POST /payments/webhook/:provider` (valida firma HMAC o verify-webhook-signature, `RN-50`) → si `COMPLETED`, acredita el **monto verificado** (`RN-24`). `[wallet.controller.ts:83, payments.service.ts:159]`
- **Excepción:** monto verificado ≠ solicitado → `PaymentMismatchException`; firma inválida o secreto ausente → rechazo.
- **✅ Estado real (2026-07-29):** el CLIENT proxya al API por su BFF (`main.ts:86`), que inyecta el `Authorization` desde la cookie HttpOnly. **`AUD-003` corregido.**

## UC-17 — Declarar el envío (vendedor) ✅
- **Actor:** **Vendedor**, y sólo él · **Precondición:** pedido en `PAID`.
- **Happy:** `PATCH /shipments/:id` con `SHIPPED` → el pedido pasa a `SHIPPED` y se avisa al comprador. La
  transición la valida `OrderStateMachine`; `carrier` y `trackingNumber` son **campos manuales** — no hay
  integración con transportista en v1.0 (`RN-35`, `AUD-024`).
- **Excepción:** el **comprador** no puede declarar el envío → **403**.
- **Nota:** hasta PT-173 `shipments` escribía `order.status` **por fuera** de la máquina de estados: había **dos
  puertas al mismo estado y sólo una con cerradura**, y un pedido `PAID` podía saltar directo a `DELIVERED`.

## UC-18 — Confirmar la recepción (comprador) ✅ **la llave la tiene quien recibe**
- **Actor:** **Comprador**, y sólo él · **Precondición:** pedido en `SHIPPED`.
- **Happy:** `PATCH /shipments/:id` con `DELIVERED` → el pedido pasa a `DELIVERED` y **arranca el reloj del
  holdback**: `shipment.deliveredAt` es el instante desde el que se cuentan las `SETTLEMENT_HOLDBACK_HOURS` (72)
  antes de que el neto del vendedor pase de `pendingBalance` a disponible (`RN-64`).
- **Excepción:** el **vendedor** no puede confirmar la recepción → **403**. Lo comprueba `QA-CL-07` en la fase 35
  de la suite por navegador.
- **Por qué esto es una regla y no un detalle (PT-174):** hasta entonces **todo** cambio de estado era del
  vendedor, y el cron liberaba el holdback en cuanto el pedido estaba `DELIVERED`. Es decir: **el vendedor
  marcaba entregado su propio envío y liberaba su propio dinero**, sin enviar nada y sin que nadie confirmara.
  El holdback protege al comprador durante la ventana de disputa, y lo podía desactivar **la única parte de la
  que protege**.
- **Y hay dos mentiras posibles, no una:** el vendedor puede mentir al enviar —ya no puede, no tiene la llave— y
  el comprador puede mentir **negando** la recepción, lo que retendría el dinero del vendedor para siempre. Por
  eso el vencimiento se conserva: a los `DISPUTE_WINDOW_DAYS` (14) desde la creación del pedido **se libera
  igual**. Antes eso existía por accidente, como el otro brazo de un `OR`; ahora es una regla con su prueba.

## UC-09 — Retirar del monedero (vendedor, con aprobación admin) ✅
- **Precondición:** KYC APPROVED (`RN-62`) + método bancario con CLABE válida (`RN-63`) + saldo **disponible** suficiente (el `pendingBalance` retenido no cuenta, `RN-64`).
- **Happy (solicitud):** `POST /wallet/withdrawals {amount, paymentMethodId}` → valida gates → crea `WithdrawalRequest` REQUESTED y **reserva** los fondos (disponible↓ + asiento `WITHDRAWAL`, `RN-65`). El vendedor ve el estado en `GET /wallet/withdrawals`.
- **Happy (admin):** `GET /admin/withdrawals` → `PATCH .../:id/approve` (REQUESTED→APPROVED) → el admin ejecuta el **SPEI manual** → `PATCH .../:id/mark-paid` (APPROVED→PAID, `PayoutProvider` manual, `RN-66`).
- **Excepción:** sin KYC/método/saldo o excede límite diario → 400; **rechazo** admin (`PATCH .../:id/reject`) → REJECTED y **reintegra** los fondos (`ADJUSTMENT`). `[withdrawals.service.ts, admin.controller.ts]`
- **Nota:** el viejo `POST /wallet/withdraw` inmediato ahora **delega** en la solicitud (ya no mueve dinero directo). Dispersión bancaria automática = Fase 2 (`RN-67`).

## UC-16 — Abrir disputa
- **Actor:** Comprador/Vendedor (participante) · **Precondición:** orden PAID/SHIPPED/DELIVERED, dentro de 14 días de entrega.
- **Happy:** `POST /disputes` → crea `OPEN`. `[disputes.service.ts:34-59]`
- **Excepción:** fuera de ventana → `DISPUTE_WINDOW_EXPIRED`; ya existe disputa → rechazo; no participante → 403.

## UC-19 — Resolver disputa (Admin) ✗
- **Happy (parcial):** `POST /admin/disputes/:id/resolve-buyer|seller` → estado `RESOLVED` + nota. `[admin.service.ts:868-891]`
- **✅ Estado real (PT-191):** resolver a favor del comprador **ejecuta el reembolso en el mismo acto**, y el importe **sale del vendedor** —del holdback si sigue retenido, y si ya se liberó queda descubierto—. Antes dejaba una nota pidiendo que alguien llamara a otro endpoint (`AUD-010` corregido). El admin pasa ahora por `AuctionStateMachine` (`AUD-011` corregido).

## UC-20 — Procesar reembolso (Admin) ⚠️
- **Happy:** `POST /admin/refunds` → 0<monto≤total, uno por orden → acredita comprador (`REFUND`), orden→`REFUNDED`, audit event, en TX. `[refunds.service.ts:19-89]`
- **⚠️ Estado real (2026-07-29):** el servicio **sí tiene pruebas** — 16 en 3 suites de comisiones y reembolsos (`AUD-013` corregido). Lo que se citaba como abierto —el `ProcessRefundUseCase` de `core`— **ya no existe**: se retiró por ADR-033 (`AUD-012` corregido, PT-191).

## UC-23 — Generar CFDI (Admin) ✗
- **Intención:** `POST /admin/cfdi/:orderId/generate` → factura timbrada por el PAC.
- **✗ Estado real:** `generate()` escribe registro ERROR/PENDING y lanza `NotImplementedException` — sin proveedor PAC (`AUD-016`).

---

### Cobertura de escenarios
De los flujos críticos: UC-01/02/06/16 operables; UC-05/08/09/19/20/23 con excepción o eslabón roto documentado. Trazabilidad completa en [Matriz Global de Trazabilidad](../transversal/Matriz-Global-de-Trazabilidad.md).
