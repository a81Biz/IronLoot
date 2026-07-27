# PLAN_ACTUAL — PT-080: ciclo de pago fiable y modularidad de pasarelas

**PT-080** | **Fecha**: 2026-07-26 | **Tipo**: MIXTO (BUG + FEATURE + REFACTOR) | **Complejidad**: MAJOR
**Estado**: STATE 2 — esperando ACK

**Entrada**: `REFACTOR_SCOPE.md` (PT-080, ciclo reiniciado) · `DISCOVERY.md` §§ PT-080-F, F4, F5, R
**Decisiones del humano ya tomadas**: puerto de CORE adoptado · **tabla propia del ciclo** (no `payments`) ·
**resolución automática por plazos**: si no se resuelve en el plazo, se asume no resuelto.

---

## 1. Objetivo

Que **ningún pago cobrado por la pasarela quede sin acreditar ni se acredite dos veces**, y que
añadir o quitar una pasarela no obligue a tocar la lógica de transacción.

---

## 2. Estado de partida (hechos verificados hoy, no supuestos)

| Hecho | Evidencia |
|---|---|
| Una notificación en **formato IPN** (`topic`+`id`, sin `data.id`) se rechaza con **HTTP 500** | Probado contra la API viva: `Missing required webhook signature headers` |
| Un pago **real** aprobado en MP quedó **sin acreditar** durante ~1 h | Operación `169718720683`, 180 MXN |
| Ese mismo pago **sí acredita** entregado en formato Webhooks firmado | Saldo 5387.50 → 5567.50 |
| La deduplicación aguanta la reentrega sobre el id numérico | 2 reentregas, saldo sin cambio |
| Conviven **dos espacios de identificadores** en la tabla de reservas | `ORDTST01...` ×2 y `169718720683` |

---

## 3. Solución propuesta — tres fases en orden

### Fase A — Que las notificaciones reales entren y se identifiquen bien

**A-1. Reconocer los dos formatos documentados por Mercado Pago.**
La entrada se normaliza a un sobre `{formato, tipoRecurso, idRecurso}`:

- **Webhooks**: `data.id` en query; el tipo sale del cuerpo (`type` / `action`).
- **IPN**: `topic` + `id` en query, sin `data.id`.

**A-2. La validación difiere por formato** (es el corazón del fallo):

| Formato | Estrategia |
|---|---|
| Webhooks | Validar `x-signature` con el secret sobre el manifiesto. Si falla → **401**. Luego confirmar el recurso en la API. |
| IPN | La firma **no es validable** (documentado por MP). **Confirmación obligatoria** contra la API; la respuesta de la API es la única fuente de verdad. El payload solo aporta un identificador. |

**A-3. Identificador canónico = id numérico de pago.**
Resoluble en `/v1/payments/{id}`; es el que trae importe, estado y `external_reference`.

- Recurso `payment` → el id ya es canónico.
- Recurso `order` / `merchant_order` → resolver vía `/v1/payments/search?external_reference=`.

**A-4. Los rechazos de firma devuelven 4xx**, no 500, para que la pasarela deje de reintentar lo
que nunca va a funcionar.

### Fase B — Ciclo de pago persistido, con resolución automática

**B-1. Tabla propia** (decisión del humano), independiente de `payments` — que además exige
`orderId` y los depósitos de wallet no tienen orden.

```
payment_cycle
  id · provider · reference (única) · userId · amount · currency
  status · requestedAt · respondedAt · settledAt
  canonicalPaymentId · responseSnapshot
```

Estados: `REQUESTED` → `CONFIRMED` → `SETTLED` · `FAILED` · `ANOMALY` · `EXPIRED`

**B-2. Las tres fases y su invariante.**
La instancia nace en `/payments/initiate` (SOLICITUD). Al llegar la respuesta se registra
(CONFIRMACIÓN) y se cierra (PERSISTENCIA). **Las tres deben coincidir** en usuario, importe y
moneda. Si algo difiere → `ANOMALY`: se eliminan confirmación y persistencia, la solicitud queda
abierta para inspección y **no se acredita**.

**B-3. Primera respuesta gana**, positiva o negativa. Las posteriores se registran como
`CANCELLED` en una tabla hija, con su identificador, para que quede rastro de que llegaron y de
por qué no se procesaron. Un rechazo también cierra: no «mejora» con una notificación posterior.

**B-4. Resolución automática por plazos** (instrucción del humano).
Un job periódico toma las solicitudes en `REQUESTED` y **consulta a la pasarela** por
`external_reference`:

| Momento | Acción |
|---|---|
| T+2 min, T+10 min, T+30 min, T+2 h, T+6 h | Consultar. Si hay pago aprobado → confirmar y acreditar. Si hay rechazo → cerrar como `FAILED` |
| **T+24 h** | **`EXPIRED`: se asume no resuelto.** No acredita. Queda visible para revisión |

Plazos **propuestos**, sujetos a tu criterio.

Esto convierte el webhook en **vía rápida** y la consulta en **vía garantizada**. Es lo que habría
detectado los 180 MXN perdidos, y **quita el túnel del camino crítico**: el sistema ya no depende
de que la notificación llegue.

**B-5. Anomalía visible, no un log.** Varios pagos bajo una misma referencia implican que la
pasarela cobró más de una vez sobre una sola solicitud y probablemente haya que devolver dinero.
Debe aparecer en una cola de revisión.

### Fase C — Modularidad

Puerto de CORE evolucionado + registro por inyección; el núcleo sin nombres de pasarela;
`reconcilePayments` sin proveedores en duro.

**Va al final a propósito**: si el puerto se hubiera diseñado antes, habría fijado un único
`validateWebhook`. A-2 demuestra que la validación difiere **por formato dentro del mismo
proveedor**. Se habría congelado en CORE un contrato equivocado.

---

## 4. Alternativas consideradas

| # | Alternativa | Veredicto |
|---|---|---|
| A1 | Seguir dependiendo solo del webhook | **Rechazada.** El caso de los 180 MXN demuestra que pierde dinero en silencio |
| A2 | Solo consulta periódica, sin webhook | **Rechazada.** Acreditación lenta y carga innecesaria sobre la API de MP. El webhook es buena vía rápida cuando llega |
| A3 | Usar la tabla `payments` para el ciclo | **Rechazada por decisión del humano**, y además `Payment.orderId` es obligatorio y los depósitos no tienen orden |
| A4 | Aceptar solo el formato Webhooks y forzar a MP | **Rechazada.** IPN está deprecado pero vivo, y el formato no lo elegimos nosotros |
| A5 | Resolver la recepción con un túnel estable | **Rechazada como solución.** Es infraestructura de pruebas, no arquitectura. Con B-4 deja de ser necesaria |
| A6 | Deducir el formato por la forma del id | **Rechazada.** Es el defecto actual: MP documenta que el discriminador es el **topic** |
| A7 | Hacer la modularidad primero | **Rechazada.** Congelaría en CORE un contrato que A-2 ya demuestra insuficiente |

---

## 5. Análisis de regresión (obligatorio — MAJOR)

| Riesgo | Superficie | Mitigación |
|---|---|---|
| **A rompe la acreditación de MP ya verificada** | Adaptador MP, ruta de dinero | Arnés real antes y después de cada paso. Línea base de hoy: 5567.50, 3 reservas, 3 asientos |
| **Cambio de id canónico invalida reservas existentes** | `processed_webhook_events` tiene hoy 2 ids de orden y 1 numérico | En desarrollo son 3 filas. **No hay producción.** Se documenta que en producción exigiría plan de datos |
| **Carrera entre webhook y consulta periódica** → doble acreditación | Fases A y B a la vez | La reserva por id canónico ya serializa; además «primera respuesta gana» cierra el ciclo |
| A-4 hace que MP deje de reintentar un fallo legítimo | Rechazo de firma | El 4xx **solo** en fallo de firma, nunca en fallo de proceso |
| El job de consulta satura la API de MP | Nuevo scheduler | Plazos espaciados y solo sobre solicitudes abiertas |
| C arrastra a los cuatro adaptadores | Puerto compartido | Estrangulamiento: MP primero (único verificable) |

**Debe preservarse exactamente**: acreditación por MP, deduplicación, resolución de
`DEP-<uuid>-<ts>`, captura en dos fases de PayPal, retiro del vendedor, suite QA 148/148.

---

## 6. Dependencias

- **Ninguna externa bloqueante.** A, B y C se verifican con tests unitarios más el arnés de MP,
  que funciona. **No requiere túnel ni credenciales de PayPal.**
- Fase B añade migración (tabla nueva) y un job en `scheduler`.
- Fase C exige recompilar `@ironloot/core`.

---

## 7. Restricciones

RULE-01 (nada de código antes del ACK del Proposal Package) · RULE-02 (CORE sin framework) ·
RULE-04 (ningún payload sin validar; en IPN la validación es la confirmación contra la API) ·
RULE-05 (ledger insert-only) · RULE-06 (tests en RED primero) · MXN · commits atómicos.

---

## 8. Criterios de éxito

1. Una notificación en formato **IPN** se procesa correctamente (hoy: 500).
2. Una notificación en formato **Webhooks** sigue funcionando igual que hoy.
3. Firma inválida → **4xx**; duplicado → **2xx** sin acreditar.
4. El mismo pago notificado por **dos rutas distintas** acredita **una sola vez**.
5. Un pago aprobado **sin notificación** se acredita solo por la vía de consulta, dentro del plazo.
6. Una solicitud sin resolver al vencer el plazo queda `EXPIRED`, **sin acreditar** y visible.
7. Un desajuste entre solicitud, confirmación y persistencia produce `ANOMALY` y **no acredita**.
8. Añadir o quitar una pasarela no requiere editar `payments.service.ts`.
9. Suite API y CORE en verde, typecheck y lint sin errores, suite QA 148/148.

---

## 9. Estado

**STATE 2 COMPLETO — ESPERANDO ACK**

Pendiente de tu criterio: **los plazos de B-4** (propuestos T+2 min … T+6 h, expiración a T+24 h)
y **quién atiende la cola de anomalías**.

Siguiente paso tras el ACK: STATE 3 — Proposal Package en `changes/PT-080-payment-cycle/`.
Rama prevista (**no creada**): `feature/PT-080-payment-cycle`.
