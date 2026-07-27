# Catálogo Maestro de Reglas de Negocio — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción documental (consolida reglas antes dispersas ×4, y el catálogo PTSA CR-001..015) |
| **Fuente** | `audit/raw/B-api-backend.md` (reglas en código), `F-core-tests.md`, PTSA `F-1`/`F6`, `02-PRD` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 01-Overview, 02-PRD, 03-TRD, 04-App-Flow, 09-Security, 11-Conventions, PTSA F-1/F6 |
| **Código usado** | `src/api/src/modules/*`, `src/packages/core/src/domain/*` |
| **Nivel de confianza** | Alto (cada regla citada `archivo:línea`; discrepancias marcadas) |

> **✅ Post-remediación (2026-07-23):** los ítems marcados ⚠️ que apuntaban a hallazgos fueron corregidos y fusionados a master (RN-14 incremento, RN-27 moneda pagos, RN-31 comisión configurable, RN-52/53 auth admin, RN-54 CSRF admin, RN-55 WS). Detalle por hallazgo en [../Informe-Remediacion.md](../Informe-Remediacion.md). El *estado real* de abajo describe el estado auditado original + el PT que lo resolvió.
>
> **Fuente única.** Cada regla aparece **una sola vez**. La columna *Estado real* refleja lo que el **código** hace (gana el código en conflictos). Se conserva la referencia `CR-XXX` de PTSA donde aplica, **corrigiendo** la incoherencia de numeración F-1↔F6 (AUD-021): aquí el ID es definitivo.

## 1. Identidad y acceso

| ID | Regla | Estado real (código) | Evidencia | Hallazgo |
|---|---|---|---|---|
| RN-01 | Contraseñas con bcrypt, saltRounds=12. | ✅ Cumple | `auth.service.ts:52` | — |
| RN-02 | Token de acceso JWT 15m; refresh 7d (persistido como Session). | ✅ Cumple | `auth.service.ts:70` | AUD-035 (cookie 7d/30d ≠ TTL) |
| RN-03 | Usuario no verificado no puede iniciar sesión (`USER_NOT_VERIFIED`). | ✅ Cumple | `auth.service.ts:733` | — |
| RN-04 | Usuario SUSPENDED/BANNED bloqueado en login/validación. | ✅ Cumple | `auth.service.ts:636,733` | — |
| RN-05 | `forgot-password` nunca revela existencia del email (siempre 200). | ✅ Cumple | `auth.service.ts:480` | — |
| RN-06 | Reset de contraseña revoca todas las sesiones; token reset 1h, verificación email 24h. | ✅ Cumple | `auth.service.ts:488,128,539` | — |
| RN-07 | 2FA TOTP: secreto guardado deshabilitado hasta verificar; enable/disable exigen token válido. | ✅ Cumple | `two-factor-auth.service.ts:14` | — |
| RN-08 | Rol derivado de `isSeller` (no hay columna de rol en BD). | ✅ Cumple | `auth.service.ts:364` | — |

## 2. Subastas y pujas

| ID | Regla | Estado real | Evidencia | Hallazgo |
|---|---|---|---|---|
| RN-10 | Crear subasta requiere `isSeller`; se crea en DRAFT; fin > inicio. | ✅ Cumple | `auctions.service.ts:47,56,78` | — |
| RN-11 | Editar/publicar sólo desde DRAFT (dueño); transición validada por FSM core. | ✅ Cumple | `auctions.service.ts:188,194` | — |
| RN-12 | Moderación opcional: si `REQUIRE_AUCTION_MODERATION`, publish→PENDING_MODERATION. | ✅ Cumple | `auctions.service.ts:250` | — |
| RN-13 | Puja debe ser estrictamente `> currentPrice`. | ✅ Cumple | `bid-validation.ts:35` | — |
| RN-14 | **Incremento mínimo de puja** (config `AUCTION_MIN_INCREMENT_AMOUNT`, default 10 MXN). | ⚠️ **No aplicado** — el código sólo exige `>currentPrice`; el "+1" es un hint. | `system-config.service.ts:29`, `bid-validation.ts:35` | **AUD-009** |
| RN-15 | Vendedor no puede pujar su propia subasta; ni auto-superarse siendo líder. | ✅ Cumple | `bid-validation.ts:31`, `bids.service.ts:85` | — |
| RN-16 | Puja sólo sobre subasta no expirada. **Estado real:** el API acepta PUBLISHED **y** ACTIVE (core sólo ACTIVE). | ⚠️ Divergencia API↔core | `bids.service.ts:59,78` | AUD-012 |
| RN-17 | Soft-close: puja en los últimos 120s extiende `endsAt` en esa ventana. | ✅ Cumple | `bids.service.ts:100` | — |
| RN-18 | Primera puja fuerza estado ACTIVE. | ✅ Cumple | `bids.service.ts:126` | — |

## 3. Wallet y dinero

| ID | Regla | Estado real | Evidencia | Hallazgo |
|---|---|---|---|---|
| RN-20 | `balance >= 0` siempre. | ✅ Cumple | `07-Database:224` | — |
| RN-21 | Fondos retenidos: `held` no puede exceder el balance **al momento de bloquear**; tras bloquear **puede** exceder el restante (corregido PT-032). | ✅ Cumple | `wallet-calculation.ts:9`, `02-PRD AC-3.2` | **AUD-015** (PTSA F-1 aún lo enuncia mal) |
| RN-22 | Bloqueo de fondos hold-first: verifica disponibilidad, wallet activa, mueve balance→held atómicamente. | ✅ Cumple | `wallet.service.ts:164-215` | AUD-013 (race no probado) |
| RN-23 | Superado libera fondos del líder anterior + notificación BID_OUTBID. | ✅ Cumple | `bids.service.ts:137` | — |
| RN-24 | Depósito acredita el **monto verificado** del proveedor, no el input del usuario (`PaymentMismatchException`). | ✅ Cumple | `wallet.controller.ts:104` | AUD-003 (auth UI) |
| RN-25 | **Retiro del vendedor (PT-072):** flujo de **solicitud con aprobación manual del admin** (REQUESTED→APPROVED→PAID / REJECTED). Reserva fondos al solicitar (disponible↓ + `WITHDRAWAL`); el rechazo reintegra (`ADJUSTMENT`). Límite diario `WITHDRAWAL_DAILY_LIMIT` (def 5000). Ver RN-62..67. | ✅ Cumple | `withdrawals.service.ts`, `wallet.controller.ts` | PT-072 (VALIDATION_PENDING) |
| RN-26 | Ledger inmutable, sólo-inserción; correcciones vía ADJUSTMENT. | ✅ Cumple | `wallet.service.ts` | AUD-018 (retención audit) |
| RN-27 | Moneda MXN global; `Decimal` no `Float`. | ⚠️ `payments.currency` default DB `USD` (esquema dice MXN). | `schema.prisma:304`, `migration ...123540:13` | **AUD-008** |

## 4. Cierre, órdenes, comisión

| ID | Regla | Estado real | Evidencia | Hallazgo |
|---|---|---|---|---|
| RN-30 | Al cierre: se elige la puja más alta como ganadora, se crea orden PAID, se captura del ganador y se liberan los perdedores, en una TX con lock Redis. | ✅ Cumple | `auction-scheduler.service.ts:127-160,45` | AUD-012 (core use-case no cableado) |
| RN-31 | **Comisión de plataforma.** | ⚠️ **Doble mecanismo:** 10% fijo en captura vs `CommissionsService` configurable (default 10, override vendedor→global) **no cableado** al cierre. | `wallet.service.ts:285`, `commissions.service.ts:37-47` | **AUD-005** |
| RN-32 | Una orden por subasta (`auction_id` UNIQUE, 1:1). | ✅ Cumple | `schema.prisma:253` | — |
| RN-33 | Orden sigue FSM: PENDING_PAYMENT→PAID→SHIPPED→DELIVERED (+REFUNDED/CANCELLED). | ✅ Cumple (servicio); admin la salta | `order-state-machine.ts:5` | AUD-011 |
| RN-34 | Envío requiere orden PAID + vendedor; un envío por orden; estado cascada a la orden. | ✅ Cumple | `shipments.service.ts:34-48,103` | — |
| RN-35 | Sin integración de transportista real: `carrier`/`trackingNumber` son campos manuales. | ⚠️ Doc lo sobredimensiona | `create-shipment.dto.ts:24` | **AUD-024** |

## 5. Disputas, reembolsos, reputación

| ID | Regla | Estado real | Evidencia | Hallazgo |
|---|---|---|---|---|
| RN-40 | Disputa: ventana 14 días desde entrega; orden PAID/SHIPPED/DELIVERED; una por orden; sólo participante. | ✅ Cumple | `disputes.service.ts:34-59` | — |
| RN-41 | Resolución de disputa (admin). | ⚠️ **No mueve dinero**: sólo cambia estado + nota "iniciar refund manual". | `admin.service.ts:868` | **AUD-010** |
| RN-42 | Reembolso: 0<monto≤total; uno por orden; acredita al comprador; orden→REFUNDED; asiento REFUND; todo en TX. | ✅ Cumple (servicio) | `refunds.service.ts:17-89` | AUD-013 (sin tests) |
| RN-43 | Calificación: requiere envío DELIVERED; sólo participante; una por autor; objetivo = contraparte. | ✅ Cumple | `ratings.service.ts:33-55` | — |

## 6. Pagos y seguridad transversal

| ID | Regla | Estado real | Evidencia | Hallazgo |
|---|---|---|---|---|
| RN-50 | Webhook: validar la firma antes de procesar; rechazar si el secreto no está configurado. MP y HeyBanco por HMAC; PayPal por `verify-webhook-signature` desde PT-076 (antes IPN). | ✅ Cumple (MP/PayPal/HeyBanco) | `mercadopago.provider.ts:137` | AUD-023 (HeyBanco no doc.) |
| RN-51 | Webhook acredita sólo si `status=COMPLETED` y referencia `DEP-<userId>-<ts>`. | ✅ Cumple | `payments.service.ts:159` | — |
| RN-52 | Rate limit global 100/min; estricto en auth (5/60s), wallet deposit (10/60s), withdraw (5/60s), webhook (20/60s). | ✅ Cumple; login admin sin throttle en master → **PT-036 (VALIDATION_PENDING)** añade 10/min | `auth.controller.ts:18`, `wallet.controller.ts:41` | AUD-004 |
| RN-53 | Puerta de secretos en prod: `JWT_SECRET`/`SESSION_SECRET`/`ADMIN_API_KEY`/`ALLOWED_ORIGINS` no placeholder o `process.exit(1)`. | ⚠️ Parcial en master; **PT-036 (VALIDATION_PENDING)** añade el gate de `ADMIN_USERNAME/PASSWORD`. | `main.ts`, `common/config/validate-startup-config.ts` | **AUD-004** |
| RN-54 | CSRF. | ⚠️ **Contradictorio:** doc afirma doble-cookie; BASE/CLIENT confían en Bearer+SameSite; **ADMIN no tiene CSRF ni CSP**. | `09-Security §6`, `admin/src/main.ts` | **AUD-014, AUD-007** |
| RN-55 | Gateways WebSocket. | ⚠️ **Sin autenticación** (guard comentado). | `auctions.gateway.ts:9` | **AUD-006** |
| RN-56 | Onboarding vendedor: aceptar términos, estado ACTIVE, email verificado, displayName, dirección/ciudad/país **y KYC APPROVED (PT-069, obligatorio)**. | ✅ Cumple | `users.service.ts:377-414` + gate KYC en `enableSeller` | PT-069 (cierra OBS-01) |

## Reglas de retención / operación

| ID | Regla | Estado real | Evidencia | Hallazgo |
|---|---|---|---|---|
| RN-60 | Retención de logs de auditoría. | ⚠️ **Dos crons en conflicto** (90d vs 30d) → efectiva 30d. | `system-cleanup` (×2) | **AUD-018** |
| RN-61 | `PAYMENT_EXPIRATION_HOURS` (72h) para órdenes impagas. | Config presente; aplicación no verificada en runtime. | `configuration.ts:68` | — |

## 8. Retiro del vendedor, KYC y liquidación (PT-069..072)

> MVP de **retiro real con payout manual (SPEI)** y aprobación admin. Decisiones de producto:
> mecanismo manual (Fase 1), holdback liberado por entrega **o** vencimiento de disputa, aprobación
> **siempre manual**, KYC **obligatorio**. Dispersión bancaria automática = Fase 2 (ver RN-67).

| ID | Regla | Estado real | Evidencia | PT |
|---|---|---|---|---|
| RN-62 | **KYC obligatorio para vender.** El vendedor envía documentos (`POST /api/v1/kyc` → `KycSubmission` PENDING). `enable-seller` exige **KYC APPROVED**; la aprobación admin (`PATCH /admin/kyc/:id/approve`) habilita `isSeller`. | ✅ Cumple | `kyc.controller.ts`, `users.service.ts` (gate) | **PT-069** (cierra OBS-01) |
| RN-63 | **Método de pago bancario (destino del retiro).** CLABE de 18 dígitos con **dígito verificador válido** (módulo 10 ponderado 3-7-1); nombre del titular obligatorio; una CLABE única por usuario; `is_verified=false` al alta. | ✅ Cumple | `clabe.util.ts`, `payments.service.ts addBankAccount` | **PT-070** |
| RN-64 | **Retención de liquidación (holdback).** El neto de una venta (bruto − comisión) entra a `wallet.pendingBalance` (NO disponible). Se libera a disponible cuando el pedido está **DELIVERED** o vence la **ventana de disputa** (`DISPUTE_WINDOW_DAYS`=14), lo que ocurra; asiento `SETTLEMENT_RELEASE`. Cron `EVERY_30_MINUTES`. | ✅ Cumple | `wallet.service.captureHeldFunds/releaseSettlement`, `auction-scheduler.releaseMaturedSettlements` | **PT-071** |
| RN-65 | **Solicitud de retiro reserva fondos.** Al solicitar se descuenta del **disponible** (no del pending) + asiento `WITHDRAWAL`. Gates: KYC APPROVED + método válido + saldo disponible suficiente + límite diario. | ✅ Cumple | `withdrawals.service.request` | **PT-072** |
| RN-66 | **Aprobación de retiro siempre manual (admin).** Estados REQUESTED→APPROVED→PAID; rechazo (REQUESTED/APPROVED)→REJECTED **reintegra** los fondos (`ADJUSTMENT`). El admin marca **PAID** tras ejecutar el SPEI manual. | ✅ Cumple | `withdrawals.service.{approve,reject,markPaid}`, `admin.controller` | **PT-072** |
| RN-67 | **Dispersión bancaria automática** (SPEI vía API / MP disbursement): **NO implementada** (Fase 2). El `PayoutProvider` abstrae el mecanismo; MVP usa `ManualPayoutProvider` (el admin transfiere y marca PAID). | ⏳ Pendiente (Fase 2) | `payout/payout-provider.ts` | **PT-072** (out-of-scope) |
| RN-68 | **Un pago de pasarela acredita el wallet una sola vez.** La reentrega de un webhook, o varias notificaciones distintas sobre el mismo pago, no vuelven a acreditar. Clave: identificador de PAGO del proveedor, reservado en `processed_webhook_events` con unica `(provider, payment_id)`. Aplica a los cuatro proveedores. | ✅ Cumple (verificado solo con tests unitarios) | `payments.service.creditOnce`, migracion `pt078_dedup_by_payment_id` | **PT-078** (TD-006) |
| RN-69 | **Si no se puede deduplicar, se acredita igualmente** (fail-open). Sin identificador de pago se registra el error y se acredita: un duplicado es corregible por `ADJUSTMENT`; un deposito legitimo perdido, no. En ese caso el fallo no se propaga, porque reintentar sin reserva duplicaria. | ✅ Cumple | `payments.service.creditOnce` | **PT-078** (AD-02) |
| RN-70 | **Un fallo de acreditacion nunca se responde con 200.** Se libera la reserva y se propaga, para que la pasarela reintente. Antes MercadoPago respondia 200 y el deposito se perdia en silencio. | ✅ Cumple (verificado solo con tests unitarios) | `payments.service.creditOnce` | **PT-078** (AD-04) |
| RN-71 | **Deposito por PayPal en dos fases.** `CHECKOUT.ORDER.APPROVED` dispara la captura; solo `PAYMENT.CAPTURE.COMPLETED` acredita. La firma del webhook se verifica contra PayPal antes de procesar. | ⏳ Implementada, **sin verificar contra sandbox real** | `paypal.provider.handleWebhook` | **PT-076** (ADR-024) |
| RN-72 | **Solo se ofrecen los metodos de pago realmente configurados.** `GET /payments/providers` deriva de `checkStatus()`; la UI de deposito se construye desde esa respuesta. | ✅ Cumple | `payments.service.getAvailableProviders`, `client/app.controller.deposit` | **PT-076** (ADR-026) |
| RN-73 | **Un pago se identifica siempre por el mismo identificador canonico**, llegue notificado como orden, como pago de orden o como pago. Es la clave de deduplicacion. | ✅ Cumple (verificado contra la pasarela real) | `mercadopago.provider.resolveCanonicalPayment` | **PT-080** |
| RN-74 | **Solicitud, confirmacion y persistencia deben coincidir** en usuario, importe y moneda. Si difieren: ANOMALY, no se acredita y la solicitud queda abierta para inspeccion. | ✅ Cumple | `payment-cycle.service.checkInvariant` | **PT-080** |
| RN-75 | **Primera respuesta gana**, positiva o negativa. Las posteriores se cancelan y quedan registradas con su identificador. Un rechazo no «mejora» con una notificacion posterior. | ✅ Cumple | `payment-cycle.service.evaluate` | **PT-080** |
| RN-76 | **Una referencia, un pago.** Varios cobros bajo una misma referencia son una anomalia, no un caso de negocio: implica que la pasarela cobro de mas. Queda en la cola de revision del admin. | ✅ Cumple | `payment-cycle.service`, `GET /admin/payments/anomalies` | **PT-080** |
| RN-77 | **Ningun pago cobrado queda sin acreditar.** Si la notificacion no llega, la consulta periodica lo encuentra. Si no se resuelve en 72 h, EXPIRED: se asume no resuelto y no acredita. | ✅ Cumple (verificado: pago real de 412.30 MXN acreditado sin notificacion) | `payment-reconciliation.service` | **PT-080** |
| RN-78 | **De cada pago queda traza completa**: solicitud, lo que se envio a la pasarela y su respuesta, notificaciones con cabeceras, validacion de firma, decision y acreditacion con saldos. Es el respaldo ante una disputa. | ✅ Cumple (verificado contra la pasarela real) | `payment-trace.service`, `GET /admin/payments/trace/:reference` | **PT-086** |
| RN-79 | **Ninguna credencial se persiste en la traza.** Se redactan por lista explicita y lo redactado se MARCA, no se borra en silencio: quien lea la traza debe saber que ese campo existia. | ✅ Cumple | `payment-trace.service.redact` | **PT-086** |
| RN-80 | **La trazabilidad nunca bloquea el cobro.** Si escribir la traza o el registro contable falla, la acreditacion sigue adelante: el saldo del usuario no depende de un apunte de reporting. | ✅ Cumple | `payment-trace.service`, `payment-cycle.service` | **PT-085 / PT-086** |
| RN-81 | **Toda pasarela registrada debe rechazar una firma invalida con 401, nunca con 500.** Un rechazo de seguridad no es una averia interna: devolver 500 contamina la tasa de error y le dice a la pasarela «reintenta». | ✅ Cumple | `provider-guarantees.spec` G-02 | **PT-087** |
| RN-82 | **La via garantizada es opcional en el contrato, y quien la declara devuelve `null` —nunca lanza— cuando el pago no existe.** El reconciliador recorre todos los ciclos abiertos: un adaptador que lance ante «no encontrado» convertiria un caso normal en un fallo del lote. | ✅ Cumple | `payment-provider.interface.findPayment` | **PT-087** |
| RN-83 | **Un ciclo solo esta cerrado cuando el dinero llego al monedero.** Si la acreditacion falla tras la confirmacion, el ciclo se reabre para reintento. | ✅ Cumple | `payments.service.applyProviderResult` | **PT-087** |
| RN-84 | **Un deposito crea el monedero si no existe.** Ningun cobro puede perderse porque el usuario nunca abriera su monedero. | ✅ Cumple | `wallet.service.deposit` | **PT-087** |
| RN-85 | **Una solicitud es un pago: el asiento contable es idempotente por referencia.** Un reintento no puede duplicar la cifra con la que el administrador cuadra frente a la pasarela. | ✅ Cumple | `payment-cycle.writePaymentRow` (upsert) | **PT-087** |
| RN-86 | **Ninguna URL que salga del sistema lleva un puerto suelto.** Las URLs entre sitios y las de retorno de las pasarelas se derivan de `PUBLIC_SCHEME`/`PUBLIC_DOMAIN`: lo que se prueba en local tiene la misma forma que en produccion. | ✅ Cumple | `return-urls.ts`, `docker-compose.yml` | **PT-088** |
| RN-87 | **Todas las pasarelas devuelven a la misma ruta**, y el estado viaja como parametro. | ✅ Cumple | `depositReturnUrl` | **PT-088** |
| RN-88 | **El resultado que muestra la pagina de retorno lo dicta la API, no la URL.** El `status` de la query lo escribe el navegador. | ✅ Cumple | `GET /payments/status/:reference` | **PT-088** |
| RN-89 | **Un deposito ajeno se responde como inexistente**, no como prohibido: distinguirlos confirmaria que existe. | ✅ Cumple | `payment-cycle.statusFor` | **PT-088** |
| RN-90 | **Un ciclo abierto se informa como pendiente, jamas como fallido.** Efectivo y SPEI tardan horas; decir «fallo» provoca un segundo pago. | ✅ Cumple | `deposit-return.html` | **PT-088** |

---

*Total: 40+ reglas canónicas. Las marcadas ⚠️ tienen un hallazgo asociado en el [Registro de Hallazgos](Registro-de-Hallazgos.md).*
