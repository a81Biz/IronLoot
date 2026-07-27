# spec-changes.md — PT-078

## 1. Contrato interno — `WebhookResult`

```ts
export interface WebhookResult {
  paymentId: string;      // pasa a ser la CLAVE DE DEDUPLICACIÓN
  externalId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  metadata?: Record<string, unknown>;
  amount?: number;
  // eventId?: string;    ← ELIMINADO (introducido por PT-076, sin fusionar)
}
```

`paymentId` ya era obligatorio; lo que cambia es su papel. No hay ruptura para ningún
proveedor: los cuatro ya lo informan.

## 2. Modelo de datos

Renombrado sobre `processed_webhook_events` (tabla creada por PT-076, sin datos productivos):

| Antes | Después |
|---|---|
| `eventId` / `event_id` | `paymentId` / `payment_id` |
| `@@unique([provider, eventId])` | `@@unique([provider, paymentId])` |

Sin cambios en `payments`, `wallets` ni `ledger`. Sin backfill.

## 3. Comportamiento de API

### `POST /payments/webhook/:provider`

| Escenario | Antes de PT-078 | Después |
|---|---|---|
| Reentrega del mismo pago — PayPal | 200 sin acreditar | 200 sin acreditar (igual) |
| Reentrega del mismo pago — **MP / Stripe / Hey Banco** | **Acredita de nuevo** | 200 sin acreditar |
| Dos notificaciones distintas del mismo pago | Acredita dos veces | Acredita una vez |
| Fallo de acreditación — PayPal | no-2xx (propaga) | no-2xx (igual) |
| Fallo de acreditación — **MP / Stripe / Hey Banco** | **200, pérdida silenciosa** | **no-2xx: la pasarela reintenta** |
| Webhook sin `paymentId` | Acredita | Acredita + log de error (fail-open, AD-02) |

**Cambio observable para integraciones existentes**: Mercado Pago pasa a recibir un no-2xx
cuando la acreditación falla, y por tanto reintentará. Es el objetivo, no un efecto lateral:
antes esos depósitos se perdían sin rastro accionable.

## 4. Documentación afectada

- **ADR-027** — deduplicación por identificador de pago. Sustituye a **ADR-025**, que pasa a
  estado *Sustituida* con nota explicativa.
- **TD-006** — se cierra en `10-Technical-Debt.md`.
