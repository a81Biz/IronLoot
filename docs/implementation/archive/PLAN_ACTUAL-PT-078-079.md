# PLAN_ACTUAL — PT-078 y PT-079

**Fecha**: 2026-07-25 | **Estado**: STATE 2 — esperando ACK
**Entrada**: `DISCOVERY.md` § PT-078 y § PT-079 (ACK 2026-07-25)

Dos PT independientes entre sí, planificados juntos por brevedad. PT-078 depende de PT-076;
PT-079 no depende de nada.

---

# PT-078 — BUG STANDARD: deduplicación de webhooks por identificador de pago

## 1. Objetivo

Impedir que la reentrega de un webhook acredite un depósito más de una vez, en **los cuatro**
proveedores de pago, no solo en PayPal.

## 2. Solución propuesta

### 2.1 Cambiar la clave de deduplicación: `eventId` → `paymentId`

`creditOnce()` deja de depender de `WebhookResult.eventId` y pasa a usar
`WebhookResult.paymentId`, presente en los cuatro proveedores. Desaparece la rama «sin
`eventId`»: **todos** los proveedores pasan por la reserva.

`eventId` se elimina de `WebhookResult`. Lo introdujo PT-076, que sigue sin fusionar, así que
no deja rastro en `master`.

**Por qué**: el identificador de notificación solo protege frente al reintento de *una misma*
notificación. Mercado Pago emite varias notificaciones distintas sobre el mismo pago
(`payment.created`, `payment.updated`), cada una con id propio. La única clave que impide
acreditar dos veces el mismo dinero es el identificador del pago.

### 2.2 Renombrar la columna: `event_id` → `payment_id`

Migración de renombrado sobre `processed_webhook_events`. La tabla nació en PT-076, no está
en `master` y no tiene datos productivos, así que el renombrado es limpio.

**Por qué**: dejar una columna llamada `event_id` conteniendo un id de pago es exactamente el
tipo de nombre engañoso que provoca el siguiente error en una tabla que gobierna dinero.

### 2.3 Propagar los fallos de acreditación en todos los proveedores

Hoy —tras PT-076— un fallo al acreditar propaga en PayPal (no-2xx → la pasarela reintenta)
pero se registra y se responde 200 en los demás, que es el comportamiento histórico.

Se unifica: **todos** propagan, liberando antes la reserva.

**Por qué**: tragarse el error responde 200 y la pasarela nunca reintenta — el depósito se
pierde en silencio. Ese comportamiento solo era defendible mientras no hubiera deduplicación,
porque reintentar era peligroso. Con la reserva por `paymentId`, reintentar es seguro y no
reintentar es el defecto que queda.

**Esta es la decisión de mayor riesgo del PT y es separable**: si se prefiere no tocar el
comportamiento de Mercado Pago, §2.1 y §2.2 siguen resolviendo la doble acreditación por sí
solas. Decisión del humano en el ACK.

### 2.4 ADR

ADR-027 sustituye a ADR-025 (deduplicación por `eventId`), marcada como *Sustituida*.

## 3. Alternativas consideradas

| # | Alternativa | Veredicto |
|---|---|---|
| A1 | Deduplicar por `eventId` también en MP | **Rechazada.** No resuelve el caso real: dos notificaciones distintas del mismo pago tienen ids distintos. Daría falsa sensación de protección. |
| A2 | Deduplicar por `externalId` (la referencia `DEP-<userId>-<ts>`) | **Rechazada.** Identifica el *intento de depósito*, no el pago. Un reintento legítimo del usuario tras un fallo reutilizaría la referencia y quedaría bloqueado. |
| A3 | Comprobar el ledger antes de acreditar en vez de una tabla propia | **Rechazada.** El ledger indexa por `referenceId`, no por id de pago del proveedor, y la comprobación no sería atómica frente a entregas concurrentes. |
| A4 | Deduplicar por `(paymentId, eventId)` compuesto | **Rechazada.** Permite acreditar dos veces el mismo pago si llega con dos ids de evento. Es el fallo que se quiere evitar. |
| A5 | Mantener la propagación asimétrica de errores (§2.3) | **Viable.** Se ofrece como opción explícita al humano; reduce el alcance y el riesgo a costa de conservar la pérdida silenciosa en MP. |

## 4. Análisis de regresión (obligatorio)

| Riesgo | Superficie | Mitigación |
|---|---|---|
| **Mercado Pago deja de acreditar** si `paymentId` llegara vacío o cambiante entre notificaciones | `creditOnce()` afecta ahora a MP, flujo validado con dinero real (PT-063..065) | Test por proveedor de que `paymentId` es estable; si falta, se registra error y **no** se bloquea la acreditación (fail-open explícito y probado) |
| **MP empieza a devolver no-2xx** ante fallos de acreditación (§2.3) | Cambio de comportamiento observable | Test dedicado; solo se aplica si el humano aprueba §2.3 |
| Hey Banco usa `reference` como `paymentId`; sin credenciales ni cobertura | `heybanco.provider.ts:118,152` | Proveedor no configurado; se cubre con test unitario y se registra la limitación |
| Stripe usa `client_reference_id`, semánticamente nuestra referencia y no un id del proveedor | `stripe.provider.ts:89,110` | Es único por intento de depósito; se documenta la diferencia en el ADR |
| Migración de renombrado sobre tabla existente en el entorno de desarrollo | `processed_webhook_events` | Tabla sin datos productivos; se verifica el esquema real tras aplicar |
| Efecto en PT-076 | PT-078 modifica código de PT-076 | PT-078 ramifica desde `feature/PT-076-paypal-orders-v2`; los tests de PT-076 deben seguir verdes |

**Flujos que deben permanecer intactos**: depósito por MercadoPago · acreditación y ledger ·
retiro del vendedor (PT-069..072) · puja con bloqueo de fondos · cierre de subasta.

## 5. Dependencias

PT-076 (rama sin fusionar) · Prisma (migración de renombrado) · ningún servicio externo:
**PT-078 se verifica entero con tests unitarios, sin credenciales**.

## 6. Criterios de éxito

1. Un webhook reentregado con el mismo `paymentId` no acredita dos veces, **en los cuatro proveedores**.
2. Dos notificaciones distintas sobre el mismo pago acreditan una sola vez.
3. Dos pagos distintos del mismo usuario acreditan por separado.
4. Entregas concurrentes del mismo pago acreditan una sola vez.
5. Los 47 tests de PT-076 siguen verdes.
6. Suite completa de la API en verde; typecheck y lint sin errores.
7. Esquema real verificado tras la migración.

---

# PT-079 — BUG TRIVIAL: cobertura de la puerta de KYC en `enableSeller()`

## 1. Objetivo

Verificar con tests el camino de rechazo de la regla de KYC obligatorio (ADR-021, RN-62),
hoy sin ejercitar.

## 2. Solución propuesta

Añadir casos a `test/unit/users/users.service.spec.ts`:

1. KYC no aprobado (`PENDING`) → `ValidationException` y **no** se habilita vendedor.
2. KYC inexistente (`null`) → `ValidationException` con `kycStatus: 'NOT_SUBMITTED'`.
3. KYC rechazado (`REJECTED`) → `ValidationException`.
4. La puerta se evalúa **después** de los requisitos de perfil, no antes (preserva el orden
   de errores que ve el usuario).
5. KYC aprobado → habilita vendedor (ya existe; se conserva).

El mock pasa de valor fijo a configurable por test. **Sin cambios en código de producto**:
la regla ya funciona; lo que falta es la verificación.

## 3. Alternativas consideradas

| # | Alternativa | Veredicto |
|---|---|---|
| B1 | Test de integración contra BD real | **Rechazada.** Desproporcionado para una regla de negocio pura; el unitario la cubre entera. |
| B2 | Cubrir también la puerta KYC de `withdrawals.request` (misma ADR-021) | **Diferida.** Es otro servicio y otro fichero de test; ampliaría el alcance TRIVIAL. Se registra como deuda. |

## 4. Análisis de regresión

Riesgo mínimo: solo se toca un fichero de test. El único efecto posible es que el mock
configurable altere tests existentes del mismo fichero — se verifica que los 21 actuales
siguen verdes.

## 5. Criterios de éxito

1. Los 21 tests actuales de `users.service.spec.ts` siguen verdes.
2. Los casos nuevos fallan si se elimina la puerta KYC de `users.service.ts` (verificación de
   que el test **realmente** protege la regla).
3. Suite completa de la API en verde.

---

## Estado

**STATE 2 COMPLETO — ESPERANDO ACK**

Decisión pendiente del humano: **§2.3 de PT-078** (propagar fallos de acreditación en todos
los proveedores) entra o se queda fuera.

Siguiente paso tras el ACK:
- PT-078 (STANDARD) → STATE 3, Proposal Package en `changes/PT-078-webhook-dedup-payment-id/`.
- PT-079 (TRIVIAL) → implementación directa; no requiere Proposal Package.

Ramas previstas (**no creadas**): `fix/PT-078-webhook-dedup-payment-id` (desde
`feature/PT-076-paypal-orders-v2`) y `fix/PT-079-kyc-gate-coverage` (desde `master`).
