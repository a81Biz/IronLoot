# PLAN_ACTUAL — PT-076: Migración de PayPal a Orders v2 API + Webhooks

**PT-076** | **Fecha**: 2026-07-25 | **Tipo**: FEATURE | **Complejidad**: MAJOR | **Estado**: STATE 2 — esperando ACK

**Entrada**: `ENRICHMENT.md` (PT-076, ACK 2026-07-25) · `DISCOVERY.md` § PT-076-INV · `CONTEXT_ANALYSIS.md` § PT-076

---

## 1. Objetivo

Sustituir la integración PayPal actual (WPS + IPN, legacy, nunca configurada ni probada) por una integración **Orders v2 API + Webhooks**, dejando el depósito de wallet vía PayPal operativo end-to-end en sandbox, con acreditación verificada en base de datos y sin regresión en MercadoPago.

---

## 2. Solución propuesta

### 2.1 Decisión central — dónde ocurre la captura (resuelve `DISCOVERY.md` I-08)

**Elegido: capturar dentro de `PaypalProvider.handleWebhook()` al recibir `CHECKOUT.ORDER.APPROVED`.**

Flujo completo:

```
CLIENT /wallet/deposit (PAYPAL)
  → API POST /payments/initiate
  → PaypalProvider.createPayment()
       ├── OAuth2 client_credentials (token cacheado)
       └── POST /v2/checkout/orders  intent=CAPTURE, MXN, custom_id=DEP-<userId>-<ts>
  → redirect al enlace HATEOAS de aprobación (rel: payer-action | approve)
  → el comprador aprueba en sandbox.paypal.com
  → PayPal → webhook CHECKOUT.ORDER.APPROVED
       └── PaypalProvider.handleWebhook(): verifica firma → POST /v2/checkout/orders/{id}/capture → devuelve null (no acredita todavía)
  → PayPal → webhook PAYMENT.CAPTURE.COMPLETED
       └── PaypalProvider.handleWebhook(): verifica firma → WebhookResult{status: COMPLETED, amount}
  → payments.service: dedup por id de evento → walletService.deposit()
```

**Por qué así**: mantiene toda la lógica de dos fases encapsulada dentro del proveedor PayPal, exactamente donde el repo ya pone el comportamiento específico de pasarela (MercadoPago ya resuelve su Orders API dentro de su propio `handleWebhook`). No toca la interfaz compartida y por tanto **no arrastra a los otros tres proveedores**. Además es robusto ante abandono del navegador: la captura no depende de que el comprador vuelva.

### 2.2 Cambios por componente

**A. `providers/paypal.provider.ts` — reescritura completa**

| Pieza | Detalle |
|---|---|
| `checkStatus()` | `!!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET && PAYPAL_WEBHOOK_ID)` — las credenciales que el proveedor realmente usa (CA-03) |
| Token OAuth2 | Cache en memoria con expiración `expires_in − 60s` de margen; reintento único ante 401 (CA-04, R-07) |
| `createPayment()` | `POST /v2/checkout/orders`, `intent=CAPTURE`, `custom_id` con la referencia `DEP-<userId>-<ts>`, cabecera `PayPal-Request-Id` para idempotencia de creación |
| Enlace de aprobación | Resolver aceptando `rel` ∈ {`payer-action`, `approve`} (CA-06, R-08) |
| `handleWebhook(payload, headers)` | Verificación vía `POST /v1/notifications/verify-webhook-signature`; despacho por `event_type` |
| Captura | `POST /v2/checkout/orders/{id}/capture` al recibir `CHECKOUT.ORDER.APPROVED` |
| URLs de retorno | `CLIENT_URL` con fallback a `http://localhost:5175`, no 5173 (CA-14) |

**B. `interfaces/payment-provider.interface.ts` — cambio aditivo mínimo**

Añadir a `WebhookResult` un campo **opcional** `amount?: number`. Es aditivo: no rompe a ningún proveedor existente y evita que la extracción de importe se resuelva hurgando en `metadata` con nombres específicos de pasarela.

**C. `payments.service.ts` — tres cambios acotados**

1. `getAvailableProviders()`: derivar de `checkStatus()` en lugar del hardcodeo actual de la línea 250 (CA-01).
2. Pasar `headers` a `paypalProvider.handleWebhook()` (hoy la línea 209 solo pasa `payload`). Necesario para verificar la firma.
3. Extracción de importe: **anteponer** `result.amount` a la cadena existente, que se conserva intacta:
   `result.amount ?? metadata.transaction_amount ?? metadata.mc_gross ?? metadata.amountTotal/100` (CA-09).
4. Deduplicación por `id` de evento antes de acreditar (CA-12).

**D. Idempotencia — modelo nuevo `ProcessedWebhookEvent`**

```prisma
model ProcessedWebhookEvent {
  id          String   @id @default(uuid()) @db.Uuid
  provider    PaymentProvider
  eventId     String   @map("event_id") @db.VarChar(255)
  processedAt DateTime @default(now()) @map("processed_at") @db.Timestamptz
  @@unique([provider, eventId], name: "uq_webhook_event")
  @@map("processed_webhook_events")
}
```

El registro se inserta **en la misma transacción** que la acreditación. Una violación de la restricción única significa "ya procesado" → responder 200 sin acreditar. Es la única defensa correcta frente a los 25 reintentos en 3 días de PayPal (R-02).

**E. `apps/client/views/pages/wallet/deposit.html`**

Renderizar las opciones desde `GET /payments/providers` en lugar del `<option>` estático de la línea 15 (CA-02).

**F. Configuración**

`PAYPAL_WEBHOOK_ID` nueva en `.env` y `.env.example`. `PAYPAL_BUSINESS_EMAIL` marcada como obsoleta (era parámetro WPS). `PAYPAL_MODE` se conserva para conmutar entre `api-m.sandbox.paypal.com` y `api-m.paypal.com`.

**G. Tests (RED primero)**

Suite unitaria nueva del proveedor — hoy hay **cero**. Cubre CA-03..CA-09, CA-11..CA-14 con la red simulada. Más regresión de MercadoPago (CA-15) ejecutada **antes** de tocar `payments.service.ts` para tener línea base.

**H. Documentación**

Corregir `10-Technical-Debt.md:17` y registrar un ADR de la migración WPS → Orders v2 en el Registro Maestro de ADR.

---

## 3. Alternativas consideradas

| # | Alternativa | Veredicto |
|---|---|---|
| A1 | **Capturar en la URL de retorno** del comprador | **Rechazada.** Si el comprador cierra el navegador tras aprobar, la captura nunca ocurre: la orden queda `APPROVED` y expira. Pérdida silenciosa de pagos aprobados. |
| A2 | **Ampliar `PaymentProvider` con un método `capture()`** | **Rechazada.** Toca los cuatro proveedores para beneficiar a uno. Máximo riesgo de regresión (R-05) a cambio de una explicitud que la opción elegida ya consigue dentro del proveedor. |
| A3 | **Mantener WPS+IPN** (Ruta A del ENRICHMENT) | **Rechazada por decisión explícita del desarrollador** en el ACK de STATE 1-E. |
| A4 | **Verificación local de firma** (CRC32 + certificado) en vez de llamar a `verify-webhook-signature` | **Diferida.** Evita una llamada de red por webhook, pero implica criptografía propia y cacheo de certificados sin cobertura de tests previa. Se adopta la verificación por API; la local queda como optimización futura. |
| A5 | **Dedup por `txn_id`/`capture id`** en vez de por `id` de evento | **Rechazada.** El `id` de evento (`WH-...`) es el identificador que PayPal repite en los reintentos; es la clave natural de la reentrega. |
| A6 | **Aplicar la deduplicación también a MercadoPago** | **Diferida a un PT posterior.** Correcto en el fondo, pero mete a MP —flujo validado con dinero real— en el radio de cambio de este PT. Se registra como deuda conocida. |

---

## 4. Análisis de regresión (obligatorio — MAJOR)

### Qué puede romperse

| Riesgo de regresión | Superficie | Mitigación |
|---|---|---|
| **Acreditación de MercadoPago** | `payments.service.ts` es compartido. Se modifican la extracción de importe y la ruta de acreditación | La cadena existente se **antepone**, no se sustituye: `result.amount` es `undefined` para MP, así que el comportamiento actual se mantiene byte a byte. Regresión MP ejecutada antes y después (CA-15) |
| **Stripe / Hey Banco** | Comparten `WebhookResult` y `getAvailableProviders()` | El campo `amount?` es opcional y aditivo. `getAvailableProviders()` ya llamaba a `checkStatus()` para ambos: su comportamiento no cambia |
| **Proveedores visibles en la UI** | Al derivar de `checkStatus()`, MP deja de estar hardcodeado | **MP debe seguir apareciendo**: verificar que `MERCADO_PAGO_ACCESS_TOKEN` está presente en el entorno o MP desaparecería del desplegable. Test explícito |
| **Ruta pública del webhook** | `@Public` en `payments.controller.ts:45` | No se toca. La firma sigue siendo el único control de acceso |
| **Suite QA por navegador** | `tests/qa-browser-suite/` incluye depósito por MP | Ejecutar la suite completa antes de cerrar |
| **Esquema de BD** | Migración nueva (`processed_webhook_events`) | Tabla nueva, aditiva. No altera `payments` ni `wallets`. Sin backfill |

### Flujos que deben seguir intactos

Depósito por MercadoPago · acreditación de wallet y ledger · retiro del vendedor (PT-069..072) · puja con bloqueo de fondos · cierre de subasta y creación de orden.

---

## 5. Dependencias

- **Externas**: PayPal sandbox (Orders v2, Webhooks, OAuth2). Túnel HTTPS público en 443.
- **Internas**: `WalletModule.deposit()` (sin cambios) · `@ironloot/core` (las utilidades IPN quedan huérfanas: marcar como obsoletas, no borrar en este PT) · `webhook-retry` BullMQ (sin cambios) · Prisma (migración nueva).
- **Credenciales humanas**: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, URL de túnel, cuenta personal sandbox MX. **Bloquean STATE 4, no STATE 3.**

---

## 6. Riesgos

Se heredan R-01..R-09 del `ENRICHMENT.md` §8. Añadidos en esta fase:

| ID | Riesgo | Mitigación |
|---|---|---|
| R-10 | La captura dentro del webhook `APPROVED` falla (red/500) → orden aprobada sin capturar | Devolver no-2xx para que PayPal reintente (hasta 25 veces); la cola `webhook-retry` como segunda red |
| R-11 | Orden en `APPROVED` que nunca se captura pese a los reintentos | Fuera de alcance de PT-076: se registra como deuda para un job de reconciliación en `scheduler` |
| R-12 | `getAvailableProviders()` derivado de config podría **ocultar MercadoPago** si el entorno no tiene su token | Test explícito + verificación en QA antes de merge |

---

## 7. Restricciones

- MXN, moneda global del proyecto (confirmado: soportada y con decimales).
- CORE no hace HTTP: la I/O se queda en el provider.
- Webhook `@Public`; la firma es el único control — no debilitarlo.
- Secretos solo en `src/api/.env` (gitignored). Nunca en el repo ni en el chat.
- Tests-first (RED) antes de cualquier código de implementación.
- Commits atómicos trazables a PT-076.

---

## 8. Criterios de éxito

1. CA-01..CA-16 del `ENRICHMENT.md` §3 verificados con evidencia.
2. Depósito real en sandbox acreditado en wallet, comprobado por consulta directa a BD.
3. Reentrega del mismo webhook demostrada como no-acreditante (CA-12).
4. Suite QA por navegador **100% verde**, incluido el depósito por MercadoPago.
5. `npm run lint:check`, `npm run typecheck` y `npm test` en verde en `src/api`.
6. Evidencia completa en `docs/implementation/evidence/PT-076/`.

---

## 9. Estado

**STATE 2 COMPLETO — ESPERANDO ACK HUMANO**

Siguiente paso tras el ACK: STATE 3 — Proposal Package en `changes/PT-076-paypal-orders-v2/` (`design.md`, `tasks.md`, `spec-changes.md`, `test-scenarios.md`, `out-of-scope.md`).

Rama prevista (**no creada todavía**): `feature/PT-076-paypal-orders-v2`.

Prohibido hasta el ACK del Proposal Package (STATE 3): creación de rama, modificación de código fuente.
