# tasks.md — PT-076: PayPal Orders v2 API + Webhooks

**Rama**: `feature/PT-076-paypal-orders-v2` (no creada hasta el ACK del Proposal Gate)
**Orden**: secuencial. Las tareas de test preceden siempre a su implementación (RED → GREEN).

Estados: `PENDING` · `IN_PROGRESS` · `BLOCKED` · `DONE`

---

## Fase 0 — Línea base

### PT-076.1 — Capturar línea base de regresión
- **Objetivo**: tener evidencia del comportamiento actual **antes** de tocar código compartido.
- **Inputs**: `src/api` en `master`, suite QA por navegador.
- **Outputs**: `evidence/PT-076/00-baseline/` con salida de `npm test`, `lint:check`, `typecheck` y depósito MP verde.
- **Validación**: los tres comandos en verde y depósito MP acreditando.
- **Estado**: DONE

---

## Fase 1 — Tests RED

### PT-076.2 — Tests: token OAuth2 y `checkStatus()`
- **Objetivo**: fijar CA-03 y CA-04 antes de implementar.
- **Inputs**: `DISCOVERY.md` I-01; `design.md` AD-04.
- **Outputs**: `paypal.provider.spec.ts` — cache de token, renovación por expiración, margen de 60s, reintento único ante 401, `checkStatus()` sobre ClientID+Secret+WebhookID.
- **Validación**: tests **fallan** (RED).
- **Estado**: DONE

### PT-076.3 — Tests: `createPayment()` sobre Orders v2
- **Objetivo**: fijar CA-05, CA-06, CA-13, CA-14.
- **Inputs**: `DISCOVERY.md` I-02/I-03/I-10; `design.md` AD-06.
- **Outputs**: tests de cuerpo de orden (`intent=CAPTURE`, MXN, `custom_id=DEP-<userId>-<ts>`, `PayPal-Request-Id`), resolución del enlace con `payer-action` **y** con `approve`, error explícito si no hay ninguno, URLs de retorno a 5175.
- **Validación**: RED.
- **Estado**: DONE

### PT-076.4 — Tests: `handleWebhook()` — firma, despacho y captura
- **Objetivo**: fijar CA-07, CA-08, CA-11.
- **Inputs**: `DISCOVERY.md` I-04/I-05/I-06; `design.md` AD-01/AD-05.
- **Outputs**: tests de verificación de firma (SUCCESS vs FAILURE), rechazo con firma inválida, `CHECKOUT.ORDER.APPROVED` → dispara captura y devuelve `null`, `PAYMENT.CAPTURE.COMPLETED` → `WebhookResult` con `amount`, evento no suscrito → `null`.
- **Validación**: RED.
- **Estado**: DONE

### PT-076.5 — Tests: `payments.service` — importe, disponibilidad y dedup
- **Objetivo**: fijar CA-01, CA-09, CA-12, CA-15.
- **Inputs**: `design.md` AD-02/AD-03.
- **Outputs**: tests de precedencia de importe **por proveedor** (PayPal usa `amount`; MP sigue usando `transaction_amount`; Stripe sigue usando `amountTotal`), `getAvailableProviders()` derivado de `checkStatus()` **incluyendo que MP siga apareciendo** (R-12), y dedup por `id` de evento repetido.
- **Validación**: RED.
- **Estado**: DONE

---

## Fase 2 — Implementación

### PT-076.6 — Modelo `ProcessedWebhookEvent` + migración
- **Objetivo**: soporte de idempotencia (AD-03).
- **Inputs**: `design.md` AD-03.
- **Outputs**: modelo en `schema.prisma`, migración Prisma, cliente regenerado.
- **Validación**: migración aplica limpia; tabla verificada en la BD real; `payments` y `wallets` sin cambios.
- **Estado**: DONE

### PT-076.7 — `WebhookResult.amount?` (aditivo)
- **Objetivo**: AD-02 sin romper proveedores existentes.
- **Inputs**: `interfaces/payment-provider.interface.ts`.
- **Outputs**: campo opcional añadido.
- **Validación**: `typecheck` en verde; los otros 3 proveedores compilan sin cambios.
- **Estado**: DONE

### PT-076.8 — Provider: OAuth2 con cacheo
- **Objetivo**: GREEN de PT-076.2.
- **Outputs**: obtención y cacheo de token contra `/v1/oauth2/token`, conmutación sandbox/producción por `PAYPAL_MODE`, `checkStatus()` corregido.
- **Validación**: PT-076.2 en verde.
- **Estado**: DONE

### PT-076.9 — Provider: `createPayment()` Orders v2
- **Objetivo**: GREEN de PT-076.3.
- **Outputs**: `POST /v2/checkout/orders` y resolución del enlace de aprobación.
- **Validación**: PT-076.3 en verde.
- **Estado**: DONE

### PT-076.10 — Provider: `handleWebhook()` con verificación y captura
- **Objetivo**: GREEN de PT-076.4.
- **Outputs**: verificación de firma, despacho por `event_type`, captura en `APPROVED`, `WebhookResult` en `CAPTURE.COMPLETED`.
- **Validación**: PT-076.4 en verde.
- **Estado**: DONE

### PT-076.11 — Service: importe, cabeceras y disponibilidad
- **Objetivo**: GREEN parcial de PT-076.5.
- **Outputs**: precedencia `result.amount ?? …` (cadena existente intacta), paso de `headers` a `paypalProvider.handleWebhook()`, `getAvailableProviders()` derivado de `checkStatus()`.
- **Validación**: PT-076.5 en verde salvo dedup; **regresión MP en verde** contra la línea base de PT-076.1.
- **Estado**: DONE

### PT-076.12 — Service: deduplicación transaccional
- **Objetivo**: GREEN del resto de PT-076.5 (CA-12).
- **Outputs**: inserción de `ProcessedWebhookEvent` en la misma transacción que `walletService.deposit()`; violación de unicidad → 200 sin acreditar.
- **Validación**: test de reentrega concurrente en verde; una sola acreditación en BD.
- **Estado**: DONE

### PT-076.13 — CLIENT: opciones de depósito dinámicas
- **Objetivo**: CA-02.
- **Outputs**: `deposit.html` + su controller consumen `GET /payments/providers` en lugar del `<option>` estático.
- **Validación**: con PayPal desconfigurado, la opción no aparece; con MP configurado, MP sí aparece.
- **Estado**: DONE

### PT-076.14 — Configuración
- **Objetivo**: variables alineadas con el uso real.
- **Outputs**: `PAYPAL_WEBHOOK_ID` en `.env` y `.env.example`; `PAYPAL_BUSINESS_EMAIL` marcada obsoleta; `PAYPAL_CLIENT_SECRET` documentada con uso real.
- **Validación**: API arranca; `GET /payments/providers` refleja el estado real.
- **Estado**: BLOCKED — requiere credenciales del humano

---

## Fase 3 — Evidencia y cierre

### PT-076.15 — Prueba E2E real en sandbox
- **Objetivo**: CA-05, CA-07, CA-08, CA-10, CA-13.
- **Inputs**: credenciales + túnel HTTPS.
- **Outputs**: `evidence/PT-076/` con capturas, logs de API, consulta a BD del saldo y del ledger.
- **Validación**: saldo incrementado exactamente en el importe pagado, verificado en BD.
- **Estado**: BLOCKED — requiere credenciales del humano

### PT-076.16 — Prueba de reentrega e importe decimal
- **Objetivo**: CA-12 y depósito con decimales (99.99 MXN).
- **Outputs**: evidencia de reenvío manual del webhook desde el dashboard de PayPal sin doble acreditación.
- **Validación**: una sola fila de acreditación en el ledger.
- **Estado**: BLOCKED — requiere credenciales del humano

### PT-076.17 — Regresión completa
- **Objetivo**: CA-15.
- **Outputs**: suite QA por navegador completa + depósito real por MercadoPago.
- **Validación**: 100% verde, comparado contra la línea base de PT-076.1.
- **Estado**: PENDING

### PT-076.18 — Documentación y ADR
- **Objetivo**: CA-16 y trazabilidad de la decisión.
- **Outputs**: corrección de `10-Technical-Debt.md:17`; ADR de la migración WPS → Orders v2 en el Registro Maestro; utilidades IPN de `@ironloot/core` marcadas como obsoletas (**no borradas** en este PT).
- **Validación**: revisión documental.
- **Estado**: DONE

---

## Resumen

| Fase | Tareas | Bloqueadas por credenciales |
|---|---|---|
| 0 — Línea base | 1 | 0 |
| 1 — Tests RED | 4 | 0 |
| 2 — Implementación | 9 | 1 (PT-076.14) |
| 3 — Evidencia y cierre | 4 | 2 (PT-076.15, .16) |
| **Total** | **18** | **3** |

**15 de 18 tareas avanzan sin credenciales.** Las tres bloqueadas son las que tocan el entorno real de PayPal.

---

## Delta real vs planificado (2026-07-25)

**D-01 — Idempotencia sin transacción única (PT-076.12).**
El plan decía insertar la reserva «en la misma transacción» que la acreditación.
`WalletService.deposit()` abre su propia `$transaction` y no admite un cliente externo;
cambiar su firma está explícitamente fuera de alcance. Se adopta **reserva-luego-acredita**:
se inserta el id de evento, se acredita y, si la acreditación falla, se libera la reserva y
se propaga el error para que la pasarela reintente. La restricción única sigue siendo lo que
impide la doble acreditación ante entregas concurrentes; el diseño no pierde su garantía.

**D-02 — Propagación de errores asimétrica por proveedor.**
Para PayPal, un fallo de acreditación propaga (no-2xx → PayPal reintenta). Para los
proveedores sin `eventId` se conserva el comportamiento anterior (registrar y responder 200),
porque cambiarlo alteraría Mercado Pago, validado con dinero real en PT-063..065.
Cubierto por T-32c como guarda de regresión.

**D-03 — Tests añadidos sobre lo planificado.**
47 tests unitarios frente a los ~35 escenarios previstos: se añadieron variantes
(T-02b, T-10b, T-11b, T-17b/c, T-24b/c, T-31b, T-32b/c, T-33b, T-04b/c) que surgieron al
concretar el contrato.

**D-04 — PT-077 intercalado.**
La línea base de PT-076.1 destapó una suite en rojo preexistente (`users.service.spec.ts`,
21 tests). Se trató como PT-077 aparte —BUG TRIVIAL, validado y fusionado— para no meter un
cambio ajeno al alcance dentro de PT-076.
