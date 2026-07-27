# design.md — PT-076: PayPal Orders v2 API + Webhooks

**PT-076** | 2026-07-25 | FEATURE | MAJOR | Rama prevista: `feature/PT-076-paypal-orders-v2`

---

## 1. Contexto

PayPal está implementado en el repo desde `59d82c9` sobre **WPS (Website Payments Standard) + IPN**, pero nunca se configuró ni se probó. La UI lo ofrece y la API lo declara disponible; cualquier intento de depósito falla en tiempo de ejecución con `PAYPAL_BUSINESS_EMAIL not configured`.

El desarrollador decidió (ACK STATE 1-E) migrar a **Orders v2 API + Webhooks** en lugar de activar el WPS existente, evitando nacer sobre tecnología legacy y alineando PayPal con el patrón REST+firma que ya usa MercadoPago.

---

## 2. Decisiones de arquitectura

### AD-01 — La captura ocurre dentro del webhook `CHECKOUT.ORDER.APPROVED`

Orders v2 es un flujo en dos tiempos: crear orden → el comprador aprueba → **capturar**. La interfaz `PaymentProvider` (`createPayment` / `verifyPayment` / `handleWebhook`) no modela la captura.

**Decisión**: la captura se ejecuta dentro de `PaypalProvider.handleWebhook()` al recibir `CHECKOUT.ORDER.APPROVED`. El proveedor devuelve `null` para ese evento (todavía no hay nada que acreditar) y devuelve un `WebhookResult` completo al recibir `PAYMENT.CAPTURE.COMPLETED`.

**Razones**:
- No modifica la interfaz compartida → los otros tres proveedores quedan intactos.
- Es el mismo lugar donde el repo ya coloca lógica específica de pasarela: `MercadoPagoProvider.handleWebhook()` ya resuelve la Orders API de MP internamente.
- Robusto ante abandono del navegador: no depende de que el comprador regrese al sitio.

**Rechazado**: capturar en la URL de retorno (pierde pagos aprobados si el comprador cierra el navegador) y añadir `capture()` a la interfaz (toca 4 proveedores para beneficiar a 1).

### AD-02 — `WebhookResult.amount` opcional y aditivo

En Orders v2 el importe viaja en `resource.amount.value` (string). La cadena actual de extracción (`transaction_amount` ?? `mc_gross` ?? `amountTotal`) no lo contempla.

**Decisión**: añadir `amount?: number` a `WebhookResult` y **anteponerlo** a la cadena existente, que se conserva sin tocar:

```ts
const rawAmount =
  result.amount ??
  result.metadata?.transaction_amount ??
  result.metadata?.mc_gross ??
  (result.metadata?.amountTotal ? Number(result.metadata.amountTotal) / 100 : 0);
```

**Razón**: para MercadoPago y Stripe `result.amount` es `undefined`, así que su comportamiento queda idéntico. Es la forma de cambiar código compartido sin tocar un flujo ya validado con dinero real.

### AD-03 — Idempotencia por `id` de evento, en transacción

PayPal reintenta hasta 25 veces durante 3 días hasta recibir un 2xx. Sin deduplicación, cada reintento acredita de nuevo.

**Decisión**: modelo Prisma `ProcessedWebhookEvent` con restricción única `(provider, eventId)`. El registro se inserta **en la misma transacción** que la acreditación del wallet. Una violación de la restricción única significa "ya procesado" → responder 200 sin acreditar.

**Razón**: la clave que PayPal repite en los reintentos es el `id` del evento (`WH-...`), no el de la captura. La transacción es lo único que evita la condición de carrera entre dos reintentos concurrentes.

**Alcance**: se aplica **solo a PayPal** en este PT. MercadoPago tiene el mismo agujero, pero incluirlo metería un flujo validado con dinero real en el radio de cambio. Registrado como deuda en `out-of-scope.md`.

### AD-04 — Token OAuth2 cacheado en memoria

A diferencia de MercadoPago (token estático de entorno), PayPal exige `client_credentials` con token de vida limitada.

**Decisión**: cache en memoria dentro del proveedor, con expiración `expires_in − 60s` de margen y un reintento único ante 401.

**Razón**: sin margen, una petición lanzada justo antes de expirar falla. El reintento cubre revocaciones fuera de banda. No se persiste: es estado reconstruible y ponerlo en Redis añadiría acoplamiento sin beneficio.

### AD-05 — Verificación de firma por API, no local

**Decisión**: `POST /v1/notifications/verify-webhook-signature` con las cinco cabeceras `PAYPAL-*` más `webhook_id` y `webhook_event`. Aceptar solo `verification_status: "SUCCESS"`.

**Rechazado por ahora**: verificación local (CRC32 + certificado). Ahorra una llamada de red por webhook, pero implica criptografía propia y cacheo de certificados sin ninguna cobertura de tests previa. Optimización futura.

### AD-06 — Tolerar `payer-action` y `approve`

La documentación actual de PayPal devuelve el enlace de aprobación con `rel: "payer-action"`; SDKs y documentación anterior usan `rel: "approve"`. La ambigüedad no se resolvió documentalmente (`DISCOVERY.md` I-03).

**Decisión**: resolver el enlace aceptando ambos valores, en ese orden de preferencia. Si no aparece ninguno, error explícito, no `undefined` propagado.

---

## 3. Flujo objetivo

```
CLIENT /wallet/deposit (PAYPAL)
  → POST /payments/initiate
  → PaypalProvider.createPayment()
       ├── OAuth2 client_credentials (cacheado)
       └── POST /v2/checkout/orders
             intent=CAPTURE · amount{currency_code:MXN, value}
             custom_id = DEP-<userId>-<timestamp>
             PayPal-Request-Id = <clave de idempotencia>
  → redirect al enlace HATEOAS (payer-action | approve)

  ── el comprador aprueba en sandbox.paypal.com ──

  → webhook CHECKOUT.ORDER.APPROVED
       verificar firma → POST /v2/checkout/orders/{id}/capture → return null

  → webhook PAYMENT.CAPTURE.COMPLETED
       verificar firma → WebhookResult{
           paymentId: resource.id,
           externalId: resource.custom_id,
           status: 'COMPLETED',
           amount: Number(resource.amount.value)
       }
  → payments.service: dedup por event.id → walletService.deposit() [transacción]
```

---

## 4. Superficie de cambio

| Fichero | Naturaleza |
|---|---|
| `src/api/src/modules/payments/providers/paypal.provider.ts` | Reescritura completa |
| `src/api/src/modules/payments/interfaces/payment-provider.interface.ts` | Aditivo (`amount?`) |
| `src/api/src/modules/payments/payments.service.ts` | 4 cambios acotados |
| `src/api/prisma/schema.prisma` + migración | Tabla nueva, aditiva |
| `src/apps/client/views/pages/wallet/deposit.html` (+ controller) | Opciones dinámicas |
| `src/api/.env` · `.env.example` | `PAYPAL_WEBHOOK_ID` nueva |
| `src/api/test/…` | Suite nueva (hoy hay 0 tests de PayPal) |
| `docs/enterprise-documentation/10-Technical-Debt.md` · Registro de ADR | Corrección + ADR |

**No se toca**: `WalletModule`, `webhook-retry`, la ruta `@Public` del webhook, ni ningún otro proveedor.

---

## 5. Estrategia de verificación

1. **Línea base primero**: ejecutar la regresión de MercadoPago **antes** de tocar `payments.service.ts`, para tener con qué comparar.
2. **Tests-first (RED)**: ninguna línea de implementación antes de un test que falle.
3. **Red simulada** en unitarios; PayPal sandbox real solo en la prueba E2E.
4. **Verificación en la fuente real**: la acreditación se comprueba por consulta directa a BD, no por logs.
5. **Reentrega provocada**: reenviar manualmente el mismo webhook desde el dashboard de PayPal para demostrar CA-12.
