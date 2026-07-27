# design.md — PT-080: ciclo de pago fiable y modularidad de pasarelas

**PT-080** | 2026-07-26 | MIXTO (BUG + FEATURE + REFACTOR) | MAJOR
**Rama prevista**: `feature/PT-080-payment-cycle`, desde `master`

---

## 1. Decisiones tomadas (delegadas por el desarrollador)

Cada una se apoya en una convención que **el proyecto ya tenía**, no en un criterio inventado.

### D-1 — Expiración del ciclo: **72 horas**, desde `PAYMENT_EXPIRATION_HOURS`

`PAYMENT_EXPIRATION_HOURS=72` ya está en `.env` y `.env.example`, y se lee en
`configuration.ts:68` como `payments.expirationHours`. **Está configurado y no se usa en ningún
sitio.** PT-080 lo pone en uso en lugar de introducir una constante nueva.

Además es el valor correcto por el negocio: el checkout de Mercado Pago ofrece **efectivo**
(Santander, BBVA) y **transferencia SPEI**, que tardan horas o días. Las 24 h que propuse antes
habrían matado pagos legítimos en efectivo. 72 h cubre el voucher típico.

### D-2 — Cadencia de consulta: retroceso exponencial

`T+1min · T+5min · T+15min · T+1h · T+6h · después cada 12h hasta las 72h`

Máximo ~10 consultas por ciclo. Los pagos con tarjeta se resuelven en segundos —de ahí la
consulta temprana— y los de efectivo/SPEI tardan días, donde consultar seguido no aporta nada y
solo carga la API de la pasarela.

### D-3 — Anomalías: detección automática, contención automática, **decisión de dinero al admin**

El proyecto ya tiene tres colas de revisión con el mismo patrón: `KycSubmission`,
`WithdrawalRequest` y `RefundRequest`. Y **ADR-022** establece que la salida de dinero exige
aprobación manual del admin.

Por coherencia con esa arquitectura:

- **Automático**: detectar el desajuste, **no acreditar**, cerrar las notificaciones sobrantes
  como canceladas, dejar el ciclo en `ANOMALY`.
- **Al admin**: cuando la anomalía implique un **cobro duplicado**, se crea automáticamente un
  `RefundRequest` (modelo existente, estados `PENDING_REFUND → PROCESSING → COMPLETED → FAILED`),
  que aterriza en la cola que el admin ya usa.

El proceso es automático de punta a punta; el humano solo aparece donde sale dinero, que es
exactamente donde ADR-022 dice que debe aparecer.

### D-4 — Rechazo de firma: **401**

Semánticamente es un fallo de autenticación de la petición, no un error interno. Hoy devuelve 500,
que además contamina el panel de errores tratando como fallo propio lo que es un rechazo correcto.

**Matiz honesto**: afirmé antes que un 4xx haría que la pasarela dejara de reintentar. **No está
documentado** que Mercado Pago se comporte así — su documentación solo dice que espera 200 o 201.
El beneficio real del 401 es la corrección semántica y la observabilidad, no la garantía de que
cesen los reintentos.

---

## 2. Arquitectura de la Fase A — entrada de notificaciones

### AD-01 — El discriminador es el **topic**, no la forma del identificador

Documentado por Mercado Pago: `data.id` significa cosas distintas según el topic, y cada topic se
confirma en un endpoint distinto. El adaptador actual enruta con `/^(ORD|PAY)/i`, es decir por el
aspecto del id, y por eso manda ids `PAY...` a `/v1/orders/{id}` → **HTTP 400** verificado.

La entrada se normaliza a un sobre:

```
{ formato: WEBHOOK | IPN,
  tipoRecurso: payment | order | merchant_order,
  idRecurso: string }
```

- **WEBHOOK** — `data.id` presente en query; tipo desde el cuerpo (`type` / `action`).
- **IPN** — `topic` + `id` en query, sin `data.id`.

### AD-02 — La validación difiere por formato

| Formato | Validación | Fuente de verdad |
|---|---|---|
| WEBHOOK | HMAC sobre el manifiesto con el secret. Falla → 401 | Confirmación en la API tras validar |
| IPN | **No se puede validar** (documentado por MP) | **La API, obligatoriamente.** El payload solo aporta un identificador |

Esto **no debilita RULE-04**: en IPN el payload nunca se cree; lo que se procesa es la respuesta
de la API de la pasarela, consultada con nuestras credenciales.

Es también la razón por la que el puerto compartido no puede tener un único `validateWebhook`:
la validación difiere **dentro del mismo proveedor**.

### AD-03 — Identificador canónico: id numérico de pago

Verificado contra la API real:

| Consulta | Resultado |
|---|---|
| `/v1/payments/169718720683` | **200**, con `external_reference`, importe y estado |
| `/v1/payments/PAY01KYE...` | **404** |
| `/v1/orders/PAY01KYE...` | **400** |

El id `PAY...` **no se resuelve en ningún endpoint**; existe solo dentro del documento de la orden.
El canónico es el numérico.

Normalización: `payment` → el id ya es canónico; `order` / `merchant_order` → se resuelve con
`/v1/payments/search?external_reference=`.

---

## 3. Arquitectura de la Fase B — ciclo persistido

### AD-04 — Tabla propia, no `payments`

Decisión del desarrollador, y además `Payment.orderId` es obligatorio y apunta a `Order`: los
depósitos de wallet no tienen orden, y por eso `payments` lleva vacía desde siempre.

```
payment_cycle
  id · provider · reference (única) · userId · amount · currency
  status · requestedAt · respondedAt · settledAt
  canonicalPaymentId · responseSnapshot · nextCheckAt · checkCount

payment_cycle_event        (hijas: toda notificación recibida)
  id · cycleId · provider · externalId · format · outcome · receivedAt · payload
```

Estados: `REQUESTED → CONFIRMED → SETTLED` · `FAILED` · `ANOMALY` · `EXPIRED`

### AD-05 — Invariante de las tres fases

SOLICITUD nace en `/payments/initiate`. CONFIRMACIÓN registra la respuesta. PERSISTENCIA cierra.
**Las tres deben coincidir en usuario, importe y moneda.**

Si difieren → `ANOMALY`: se eliminan confirmación y persistencia, la solicitud queda abierta para
inspección, **no se acredita**.

### AD-06 — Primera respuesta gana

La primera respuesta cierra el ciclo, sea positiva o negativa. Las posteriores se registran en
`payment_cycle_event` con `outcome = CANCELLED` y su identificador. Un rechazo también cierra: no
«mejora» con una notificación posterior.

### AD-07 — Vía rápida y vía garantizada

- **Vía rápida**: el webhook, cuando llega.
- **Vía garantizada**: job en `scheduler` que consulta la pasarela por `external_reference` para
  los ciclos en `REQUESTED`, con la cadencia de D-2.
- Al vencer las 72 h sin resolución → `EXPIRED`. **Se asume no resuelto**, no acredita, queda
  visible.

Esto quita la notificación del camino crítico. Es lo que habría detectado los 180 MXN perdidos
hoy, y hace que el sistema no dependa de un túnel en desarrollo ni de la fiabilidad de la red en
producción.

### AD-08 — Trazabilidad tipada, sin romper el 200

`PaymentAlreadyProcessedException` existe y nunca se ha lanzado, pero está mapeada a **409**
(`constants.ts:124`). Lanzarla haría que la pasarela reintentara **sobre los duplicados**, que es
el caso más frecuente.

Decisión: el duplicado se registra como `payment_cycle_event` con `outcome = DUPLICATE` y se emite
el evento de auditoría. **No se lanza la excepción**; la respuesta sigue siendo 2xx.

### AD-09 — Se emite `PaymentCompletedEvent`

Existe en CORE con los campos exactos (`orderId`, `paymentId`, `amount`, `provider`, `occurredAt`)
y nunca se ha emitido. Se emite al pasar a `SETTLED`.

---

## 4. Arquitectura de la Fase C — modularidad

Puerto de CORE evolucionado (identidad + alias, `isConfigured`, validación **asíncrona**,
resultado normalizado), registro de proveedores por inyección, núcleo sin nombres de pasarela, y
`reconcilePayments` leyendo el ciclo en lugar de la tabla vacía.

**Va al final**: A-2 demuestra que la validación difiere por formato. Diseñar el puerto antes
habría congelado en CORE un contrato equivocado.

---

## 5. Trazabilidad de hallazgos — nada queda suelto

| Hallazgo | Destino |
|---|---|
| F-01 firma inválida → 500 | Fase A (D-4) |
| F-02 tres identificadores / rama `PAY` rota | Fase A (AD-01, AD-03) |
| F-03 excepción mapeada a 409 | Fase B (AD-08) |
| F-04 pago cobrado sin acreditar | Fase B (AD-07) |
| F-05 dos formatos de notificación | Fase A (AD-01, AD-02) |
| G-01 puerto `IPaymentProvider` muerto | Fase C |
| G-02 contrato duplicado en la API | Fase C |
| G-03 `PaymentCompletedEvent` nunca emitido | Fase B (AD-09) |
| G-04 `PaymentAlreadyProcessedException` sin uso | Fase B (AD-08) |
| G-05 tabla `payments` nunca escrita | Fase B (AD-04: tabla propia) + Fase C (`reconcilePayments` lee el ciclo) |
| G-06 `reconcilePayments` inoperante y con proveedores en duro | Fase C |
| H-03 contrato de importe divergente | Fase C |
| PT-076 R-11 órdenes PayPal aprobadas sin capturar | Fase B: la vía garantizada las detecta |
| `PAYMENT_EXPIRATION_HOURS` configurada y sin uso | Fase B (D-1) |
| Depósitos perdidos históricamente | Fase B: script de reconciliación puntual |
| G-07 `ProcessPaymentUseCase` documentado pero sin fuente | **PT-082** |
| Purga de `processed_webhook_events` | **PT-082** |
| Cobertura KYC de `withdrawals.request` | **PT-083** |

Los tres PT nuevos quedan numerados, no «registrados como deuda».

---

## 6. Estrategia de verificación

1. **Línea base**: saldo 5567.50, 3 reservas, 3 asientos `DEPOSIT`.
2. **Tests en RED** antes de cada implementación.
3. **Arnés real de Mercado Pago** (`mp-deposit.cjs`) antes y después de cada fase.
4. **El arnés se amplía** para entregar en formato **IPN** y con **id numérico** — su carencia es
   la razón por la que F-02 y F-05 no se detectaron.
5. La vía garantizada se verifica **sin túnel**: se crea un pago real y se deja que el job lo
   descubra por consulta.
