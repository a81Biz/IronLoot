# spec-changes.md — PT-076

Cambios de especificación derivados de la migración de PayPal a Orders v2 + Webhooks.

---

## 1. Variables de entorno

| Variable | Antes | Después |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Declarada, usada **solo como interruptor** en `checkStatus()` | Credencial funcional real (OAuth2) |
| `PAYPAL_CLIENT_SECRET` | Declarada, **no leída en ningún punto del código** | Credencial funcional real (OAuth2) |
| `PAYPAL_WEBHOOK_ID` | **No existe** | **Nueva.** Obligatoria. Necesaria para verificar la firma de los webhooks |
| `PAYPAL_BUSINESS_EMAIL` | Obligatoria (parámetro del formulario WPS) | **Obsoleta.** Se marca como tal; no se elimina en este PT para no romper entornos existentes |
| `PAYPAL_MODE` | `sandbox` / `production` — conmutaba `www.paypal.com` vs `www.sandbox.paypal.com` | Se conserva; ahora conmuta `api-m.paypal.com` vs `api-m.sandbox.paypal.com` |

---

## 2. Contrato interno — `WebhookResult`

**Cambio aditivo, no ruptura.**

```ts
export interface WebhookResult {
  paymentId: string;
  externalId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  metadata?: Record<string, unknown>;
  amount?: number;   // ← NUEVO: importe normalizado por el proveedor
}
```

Los proveedores existentes (MercadoPago, Stripe, Hey Banco) **no se modifican**: al no informar `amount`, la cadena de extracción actual sigue aplicándose a ellos sin cambio de comportamiento.

La interfaz `PaymentProvider` **no se modifica**. `PaypalProvider.handleWebhook()` pasa a aceptar un segundo parámetro opcional `headers`, igual que ya hace `MercadoPagoProvider`.

---

## 3. Modelo de datos

**Tabla nueva** (aditiva; no altera `payments`, `wallets` ni `ledger`):

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

Sin backfill. Sin cambios en enums existentes: `PaymentProvider` ya contiene `PAYPAL`.

---

## 4. Comportamiento de API

### `GET /payments/providers`

| Antes | Después |
|---|---|
| `MERCADO_PAGO` y `PAYPAL` **hardcodeados** como disponibles; solo `STRIPE` y `HEY_BANCO` pasaban por `checkStatus()` | **Los cuatro** derivan de `checkStatus()` |

**Consecuencia observable**: con la configuración actual del repo, PayPal **desaparece** de la respuesta hasta que se aporten sus credenciales. Es el comportamiento correcto — hoy aparece disponible y falla al usarse.

**Riesgo asociado (R-12)**: MercadoPago solo seguirá apareciendo si `MERCADO_PAGO_ACCESS_TOKEN` está presente en el entorno. Cubierto por test explícito.

### `POST /payments/webhook/PAYPAL`

- Ruta y decorador `@Public` **sin cambios**.
- Cambia el formato de entrada: JSON de evento de PayPal en lugar de formulario IPN codificado.
- Cambia la verificación: `verify-webhook-signature` en lugar de `cmd=_notify-validate`.
- Nuevo: eventos ya procesados devuelven `200` sin acreditar.

---

## 5. Integración externa

| Aspecto | Antes (WPS+IPN) | Después (Orders v2) |
|---|---|---|
| Autenticación | Ninguna | OAuth2 `client_credentials` con token cacheado |
| Creación de pago | Formulario `cgi-bin/webscr?cmd=_xclick` | `POST /v2/checkout/orders` |
| Captura | Implícita | `POST /v2/checkout/orders/{id}/capture` explícita |
| Referencia de usuario | Campo `invoice` | Campo `custom_id` |
| Importe en la notificación | `mc_gross` | `resource.amount.value` (string) |
| Verificación | `POST` a `ipnpb.*.paypal.com` | `POST /v1/notifications/verify-webhook-signature` |
| Reintentos del proveedor | IPN, ~4 días | Webhooks, **hasta 25 veces en 3 días** |

---

## 6. Documentación afectada

- `docs/enterprise-documentation/10-Technical-Debt.md:17` — afirma "Only Mercado Pago and PayPal are operational". **Falso**: PayPal nunca estuvo operativo. Corregir.
- **Registro Maestro de ADR** — nuevo ADR: migración de PayPal de WPS+IPN a Orders v2 + Webhooks, con las decisiones AD-01..AD-06 de `design.md`.
- `@ironloot/core` — `buildIpnVerificationPayload()` y `validateIpnResponse()` quedan sin consumidores. Se marcan `@deprecated`; **no se eliminan** en este PT.
