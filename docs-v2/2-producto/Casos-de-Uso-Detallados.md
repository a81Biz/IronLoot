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

## UC-05 — Pujar en una subasta ⚠️ (cadena rota)
- **Actor:** Comprador · **Precondición:** subasta ACTIVE/PUBLISHED no expirada; wallet con saldo.
- **Happy (backend):** `POST /auctions/:id/bids` → valida (`RN-13/15/16`) → bloquea fondos (`RN-22`) → crea puja → actualiza `currentPrice` → libera al líder anterior (`RN-23`) → si tardía, soft-close extiende (`RN-17`) → emite `bid:new`/`auction:extended`. `[bids.service.ts:71-176]`
- **Alternativo:** ser superado → notificación BID_OUTBID + liberación de fondos.
- **Excepción:** puja ≤ actual → `BID_TOO_LOW`; puja a su propia subasta → `BID_ON_OWN_AUCTION`; fondos insuficientes → error + no se crea puja; fallo en TX → compensación libera lo recién retenido. `[bids.service.ts:79-202]`
- **⚠️ Estado real:** **no hay pantalla de puja ni cliente Socket.io** en CLIENT; el CTA "Pujar ahora" enlaza a una ruta inexistente → el caso **no es operable desde la UI** (`AUD-002`). Además el incremento mínimo configurado no se aplica (`AUD-009`).

## UC-06 — Cierre de subasta y adjudicación (Sistema)
- **Actor:** Sistema (scheduler) · **Trigger:** cron cada minuto.
- **Happy:** con lock Redis (`lock:auction-close`): subastas `ACTIVE` con `endsAt≤now` → `CLOSED`; puja más alta = ganador → Orden `PAID`; captura del ganador (`DEBIT_ORDER`) → crédito vendedor (`CREDIT_SALE`) − comisión (`FEE_PLATFORM`); libera held de perdedores; notifica y emite `auction:ended`. `[auction-scheduler.service.ts:105-254]`
- **Alternativo:** sin pujas → cierra sin orden.
- **Excepción:** otra instancia tiene el lock → se omite (evita doble proceso). **Riesgo:** el use-case `CloseAuctionUseCase` de core no se usa; settlement con baja cobertura (`AUD-012`).

## UC-08 — Depositar en el monedero ⚠️
- **Actor:** Comprador/Vendedor.
- **Happy:** inicia pago `POST /payments/initiate` (MP/PayPal) → paga en proveedor → webhook `POST /payments/webhook/:provider` (valida HMAC/IPN, `RN-50`) → si `COMPLETED`, acredita el **monto verificado** (`RN-24`). `[wallet.controller.ts:83, payments.service.ts:159]`
- **Excepción:** monto verificado ≠ solicitado → `PaymentMismatchException`; firma inválida o secreto ausente → rechazo.
- **⚠️ Estado real:** el formulario client-side de depósito llama al API cross-origin sin ruta de auth válida (`AUD-003`).

## UC-09 — Retirar del monedero ⚠️
- **Happy:** `POST /wallet/withdraw` → verifica método de pago registrado + límite diario 5.000 MXN (`RN-25`) + saldo suficiente → asiento WITHDRAWAL.
- **Excepción:** sin método registrado → rechazo; excede límite diario → rechazo; saldo insuficiente → rechazo. `[wallet.controller.ts:113-137]` · **⚠️** auth UI (`AUD-003`).

## UC-16 — Abrir disputa
- **Actor:** Comprador/Vendedor (participante) · **Precondición:** orden PAID/SHIPPED/DELIVERED, dentro de 14 días de entrega.
- **Happy:** `POST /disputes` → crea `OPEN`. `[disputes.service.ts:34-59]`
- **Excepción:** fuera de ventana → `DISPUTE_WINDOW_EXPIRED`; ya existe disputa → rechazo; no participante → 403.

## UC-19 — Resolver disputa (Admin) ✗
- **Happy (parcial):** `POST /admin/disputes/:id/resolve-buyer|seller` → estado `RESOLVED` + nota. `[admin.service.ts:868-891]`
- **✗ Estado real:** **no ejecuta el reembolso**; deja nota "iniciar refund vía `POST /admin/refunds`" → el dinero se mueve en un paso manual separado (`AUD-010`). Además admin escribe estado sin FSM (`AUD-011`).

## UC-20 — Procesar reembolso (Admin) ⚠️
- **Happy:** `POST /admin/refunds` → 0<monto≤total, uno por orden → acredita comprador (`REFUND`), orden→`REFUNDED`, audit event, en TX. `[refunds.service.ts:19-89]`
- **⚠️ Estado real:** servicio de producción **sin tests** (`AUD-013`); el `ProcessRefundUseCase` de core (probado) no se usa.

## UC-23 — Generar CFDI (Admin) ✗
- **Intención:** `POST /admin/cfdi/:orderId/generate` → factura timbrada por el PAC.
- **✗ Estado real:** `generate()` escribe registro ERROR/PENDING y lanza `NotImplementedException` — sin proveedor PAC (`AUD-016`).

---

### Cobertura de escenarios
De los flujos críticos: UC-01/02/06/16 operables; UC-05/08/09/19/20/23 con excepción o eslabón roto documentado. Trazabilidad completa en [Matriz Global de Trazabilidad](../transversal/Matriz-Global-de-Trazabilidad.md).
