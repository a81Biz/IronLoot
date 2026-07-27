# spec-changes.md — PT-080

## 1. Modelo de datos — dos tablas nuevas

```prisma
model PaymentCycle {
  id                String          @id @default(uuid()) @db.Uuid
  provider          PaymentProvider
  reference         String          @unique          // DEP-<userId>-<ts>
  userId            String          @db.Uuid
  amount            Decimal         @db.Decimal(10,2)
  currency          String          @default("MXN") @db.VarChar(3)

  status            PaymentCycleStatus @default(REQUESTED)
  canonicalPaymentId String?                          // id canónico del proveedor
  responseSnapshot   Json?                            // respuesta observada al confirmar

  requestedAt       DateTime  @default(now())
  respondedAt       DateTime?
  settledAt         DateTime?
  nextCheckAt       DateTime?                         // vía garantizada
  checkCount        Int       @default(0)

  events            PaymentCycleEvent[]

  @@index([status, nextCheckAt])
  @@index([canonicalPaymentId])
}

model PaymentCycleEvent {
  id          String   @id @default(uuid()) @db.Uuid
  cycleId     String?  @db.Uuid                        // nullable: llega antes que su ciclo
  provider    PaymentProvider
  externalId  String                                    // id canónico observado
  format      String                                    // WEBHOOK | IPN | POLL
  outcome     String                                    // PROCESSED | DUPLICATE | CANCELLED | REJECTED | ANOMALY
  receivedAt  DateTime @default(now())
  payload     Json
}

enum PaymentCycleStatus {
  REQUESTED
  CONFIRMED
  SETTLED
  FAILED
  ANOMALY
  EXPIRED
}
```

**`processed_webhook_events` se mantiene**: sigue siendo la barrera de idempotencia por id
canónico. `payment_cycle_event` responde a otra pregunta —*qué llegó y qué se hizo con ello*— y no
la sustituye.

**Sin cambios** en `payments`, `wallets` ni `ledger`.

---

## 2. Configuración

| Variable | Antes | Después |
|---|---|---|
| `PAYMENT_EXPIRATION_HOURS` | Configurada (72) y leída en `configuration.ts:68`, **sin uso** | **En uso**: plazo tras el cual un ciclo pasa a `EXPIRED` |

Sin variables nuevas. La cadencia de consulta es constante en código, no configuración.

---

## 3. Comportamiento de API

### `POST /payments/webhook/:provider`

| Escenario | Antes | Después |
|---|---|---|
| Formato **IPN** (`topic`+`id`) | **HTTP 500**, nunca acredita | Procesado: confirmación obligatoria contra la API |
| Formato Webhooks firmado | Acredita | Igual |
| Firma inválida | **500** | **401** |
| Cabeceras ausentes (formato Webhooks) | 500 | 401 |
| Notificación duplicada | 2xx sin acreditar | Igual, **y** registrada como `DUPLICATE` |
| Respuesta posterior a la primera | Se procesaba | **Cancelada** y registrada |
| Desajuste importe/moneda/usuario | Acreditaba | `ANOMALY`, **no acredita** |
| Id `PAY...` | Consulta a `/v1/orders` → **400** | Resuelto al id canónico |

### `POST /payments/initiate`

Crea el ciclo en `REQUESTED`. La respuesta al cliente no cambia.

### Proceso nuevo — resolución automática

Job en `scheduler` que consulta la pasarela por `external_reference` para ciclos `REQUESTED`, en
`T+1min · T+5min · T+15min · T+1h · T+6h · cada 12h` hasta **72 h**, momento en el que el ciclo
pasa a `EXPIRED` **sin acreditar**.

### `GET /admin/payments/reconcile`

Pasa a leer `payment_cycle`. Deja de estar tipado a `'MERCADO_PAGO' | 'PAYPAL'` en duro.

---

## 4. Contrato interno

`WebhookResult` se traslada a CORE como resultado normalizado. El puerto `IPaymentProvider`
evoluciona:

- identidad + alias declarados por el adaptador
- `isConfigured()`
- `validateWebhook(...)` pasa a ser **asíncrono**
- `handleWebhook(...)` devuelve resultado normalizado
- `getTransactionStatus(...)` devuelve resultado normalizado

El duplicado `api/src/modules/payments/interfaces/payment-provider.interface.ts` **se elimina**.

`PaymentCompletedEvent` (CORE, hoy nunca emitido) **se emite** al pasar a `SETTLED`.

---

## 5. Documentación afectada

- **ADR nueva**: dos formatos de notificación con validación distinta por formato.
- **ADR nueva**: vía rápida (webhook) + vía garantizada (consulta), con expiración a 72 h.
- **ADR**: sustitución del identificador canónico (id numérico de pago).
- **Reglas de negocio**: ciclo de tres fases, primera-respuesta-gana, anomalía → `RefundRequest`.
- **10-Technical-Debt**: TD-006 se reabre y se cierra de verdad; TD-002 revisada.
