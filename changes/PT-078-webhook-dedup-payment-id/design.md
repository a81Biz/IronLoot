# design.md — PT-078: deduplicación de webhooks por identificador de pago

**PT-078** | 2026-07-25 | BUG | STANDARD | Rama prevista: `fix/PT-078-webhook-dedup-payment-id`
**Ramifica desde**: `feature/PT-076-paypal-orders-v2` (no desde `master`)

---

## 1. Contexto

PT-076 introdujo `creditOnce()` y la tabla `processed_webhook_events` para impedir que la
reentrega de un webhook acreditara un depósito dos veces. Esa protección se ató a
`WebhookResult.eventId`, que hoy solo informa PayPal: **Mercado Pago, Stripe y Hey Banco
quedaron sin ninguna protección** (TD-006).

Al investigar el comportamiento real de Mercado Pago apareció además que la clave elegida es
insuficiente incluso conceptualmente.

---

## 2. Decisiones de arquitectura

### AD-01 — La clave de deduplicación es `paymentId`, no `eventId`

Mercado Pago reintenta a los 0 min, 15 min, 30 min, 6 h, 48 h, 96 h y después cada 96 h
**hasta recibir un 2xx**, con un timeout de 22 s por intento. Además emite **varias
notificaciones distintas sobre el mismo pago** (`payment.created`, `payment.updated`), cada
una con su propio identificador.

Deduplicar por identificador de notificación protege frente al reintento de *una misma*
notificación, pero no frente a dos notificaciones distintas que informan del mismo pago
aprobado. La única clave que impide acreditar dos veces el mismo dinero es el identificador
del pago en el proveedor.

`WebhookResult.paymentId` ya existe y está poblado en los cuatro proveedores:

| Proveedor | Valor | Origen |
|---|---|---|
| Mercado Pago | id de pago / id de orden | `mercadopago.provider.ts:130,210,222` |
| PayPal | id de captura | `paypal.provider.ts:210,248` |
| Stripe | `client_reference_id` | `stripe.provider.ts:89,110` |
| Hey Banco | `reference` | `heybanco.provider.ts:118,152` |

**Consecuencia**: `eventId` se elimina de `WebhookResult`. Lo introdujo PT-076, que sigue sin
fusionar, así que no deja rastro en `master`. **ADR-025 queda sustituida por ADR-027.**

**Salvedad documentada**: el `paymentId` de Stripe es `client_reference_id`, es decir la
referencia `DEP-<userId>-<ts>` que generamos nosotros, no un identificador del proveedor. Es
único por intento de depósito, así que sirve como clave, pero su semántica difiere de la de
los otros tres y conviene que quede escrito.

### AD-02 — Fail-open si falta `paymentId`

Si un webhook llegara sin `paymentId`, la reserva es imposible. Se registra un error y **se
acredita igualmente**.

**Por qué**: el riesgo de no acreditar un depósito legítimo (dinero real del usuario que no
aparece) se juzga peor que el de una acreditación duplicada detectable y corregible por
`ADJUSTMENT` en el ledger. La decisión es deliberada, no accidental, y va con test propio
para que no se convierta en un agujero silencioso.

### AD-03 — Renombrar `event_id` → `payment_id`

Migración de renombrado sobre `processed_webhook_events`. La tabla nació en PT-076, no está en
`master` y no tiene datos productivos.

**Por qué**: una columna llamada `event_id` que contiene un id de pago es el tipo de nombre
engañoso que provoca el siguiente error en una tabla que gobierna dinero.

### AD-04 — Los fallos de acreditación propagan en todos los proveedores

PT-076 dejó un comportamiento asimétrico: PayPal propaga (no-2xx → la pasarela reintenta),
el resto registra y responde 200. Se unifica: todos propagan, liberando antes la reserva.

**Por qué**: responder 200 tras un fallo de acreditación hace que la pasarela nunca reintente
— el depósito se pierde en silencio. Ese comportamiento solo era defendible mientras no
hubiera deduplicación, porque reintentar era peligroso. Con la reserva por `paymentId`,
reintentar es seguro, y no reintentar pasa a ser el defecto restante.

**Riesgo asumido**: cambia el comportamiento observable de Mercado Pago, validado con dinero
real en PT-063..065. Aprobado explícitamente por el humano en el ACK de STATE 2.

---

## 3. Flujo objetivo

```
webhook → provider.handleWebhook() → WebhookResult{ paymentId, externalId, amount?, status }
  → si status != COMPLETED  → fin
  → extraer userId de externalId (DEP-<userId>-<ts>)
  → resolver importe
  → creditOnce(provider, result, userId, amount):
        ├── sin paymentId  → log de error + acreditar (fail-open, AD-02)
        └── con paymentId:
              INSERT processed_webhook_events(provider, payment_id)
                ├── violación de unicidad (P2002) → ya procesado → 200 sin acreditar
                └── ok → acreditar
                       └── si falla → DELETE reserva + propagar (AD-04)
```

---

## 4. Superficie de cambio

| Fichero | Naturaleza |
|---|---|
| `payments.service.ts` — `creditOnce()` | Clave `eventId` → `paymentId`; desaparece la rama sin protección; propagación unificada |
| `interfaces/payment-provider.interface.ts` | Eliminar `eventId?` (introducido y no fusionado) |
| `providers/paypal.provider.ts` | Dejar de informar `eventId` |
| `prisma/schema.prisma` + migración | Renombrar `eventId`/`event_id` → `paymentId`/`payment_id` |
| `test/unit/payments/payments-dedup-amount.spec.ts` | Reescribir los casos de dedup sobre la clave nueva |
| Registro Maestro de ADR | ADR-027 sustituye a ADR-025 |
| `10-Technical-Debt.md` | Cerrar TD-006 |

**No se toca**: `WalletService`, la ruta `@Public` del webhook, ni la lógica interna de
ningún proveedor más allá de retirar `eventId` de PayPal.

---

## 5. Estrategia de verificación

1. **Los 47 tests de PT-076 deben seguir verdes** salvo los de dedup, que se reescriben.
2. Cobertura de dedup **por proveedor**, no solo PayPal: es el objetivo del PT.
3. Caso explícito de «dos notificaciones distintas del mismo pago» — el escenario que
   `eventId` no cubría y que motiva el PT.
4. Caso explícito de fail-open sin `paymentId` (AD-02).
5. Caso explícito de propagación en Mercado Pago (AD-04), que sustituye al T-32c de PT-076.
6. Esquema real verificado por consulta a PostgreSQL tras la migración.
7. **Todo verificable con tests unitarios: PT-078 no necesita credenciales de nadie.**
