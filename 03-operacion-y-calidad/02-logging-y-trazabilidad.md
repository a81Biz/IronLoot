## 1. Propósito

Este documento define:

* **cómo se estructura técnicamente un log** en Iron Loot (formato, campos, niveles),
* qué se imprime en consola vs qué se persiste,
* y **qué se guarda por ambiente** (local/qa/prod),

para garantizar trazabilidad completa sin exponer datos sensibles.

Este documento complementa:

* `01-observabilidad-y-entornos.md`

---

## 2. Tipos de registros en Iron Loot

Iron Loot maneja tres tipos de registro, cada uno con su finalidad:

### 2.1 Log técnico (Operational Log)

Sirve para:

* diagnóstico,
* monitoreo,
* rendimiento,
* errores de infraestructura.

Ejemplos:

* request recibido / response enviado
* latencias
* errores de DB
* timeouts
* rate limiting activado

### 2.2 Error log (Error Event)

Sirve para:

* capturar errores controlados (negocio) y no controlados (excepciones),
* correlacionarlos con request y entidad.

Ejemplos:

* `BID_TOO_LOW`
* `USER_NOT_VERIFIED`
* excepción inesperada en cierre de subasta

### 2.3 Evento de negocio (Audit Event)

Sirve para:

* auditoría,
* reconstrucción de historia por entidad,
* confianza y soporte al usuario.

Ejemplos:

* `BID_PLACED`
* `AUCTION_CLOSED`
* `PAYMENT_CONFIRMED`

> Nota: Un log técnico puede existir sin evento de negocio.
> Pero un evento de negocio siempre debe ser persistente.

---

## 3. Principios de estructura del log

### 3.1 Logs estructurados (obligatorio)

Todos los logs deben emitirse como un objeto estructurado (JSON), nunca como strings libres.

**Motivo:**

* filtrado por campos,
* correlación,
* exportación a DB / sistemas externos,
* consistencia.

### 3.2 Campo de correlación obligatorio

Todo registro debe incluir:

* `trace_id`

y cuando aplique:

* `user_id`
* `entity_type` + `entity_id`

### 3.3 Whitelisting de payload

Nunca se registra un payload completo sin filtrar.
Se define una lista de campos permitidos por tipo de evento.

---

## 4. Modelo estándar de log técnico (Operational Log)

### 4.1 Estructura base (campos mínimos)

Todo log técnico debe tener:

* `timestamp` (ISO8601)
* `level` (DEBUG/INFO/WARN/ERROR)
* `service` (ej. `Iron Loot-api`)
* `env` (`local` / `qa` / `prod`)
* `trace_id`
* `message` (texto corto)
* `context` (objeto con campos adicionales)

### 4.2 Campos recomendados en `context`

Según el tipo de log:

**Request/Response**

* `http.method`
* `http.path`
* `http.status_code`
* `duration_ms`
* `ip` (cuidando privacidad)
* `user_id` (si existe)
* `user_role_state` (ej. `VERIFIED`, `SELLER_ENABLED`)
* `client.app` (web, mobile)
* `ua` (user agent) — opcional, con control

**DB**

* `db.operation` (SELECT/UPDATE/INSERT)
* `db.table` (si aplica)
* `db.duration_ms`
* `db.error` (si ocurrió)

**Jobs/Scheduler**

* `job.name`
* `job.run_id`
* `job.result`
* `job.duration_ms`

---

## 5. Modelo estándar de error log (Error Event)

### 5.1 Estructura base (campos mínimos)

* `timestamp`
* `level` (ERROR o WARN)
* `service`
* `env`
* `trace_id`
* `error_code`
* `http_status` (si aplica a request)
* `message` (controlado)
* `user_id` (si existe)
* `entity_type` (si aplica)
* `entity_id` (si aplica)
* `context` (endpoint, acción, metadatos)
* `stack` (solo local/qa, recortado o omitido en prod)

### 5.2 Errores de negocio vs errores no controlados

**Errores de negocio**:

* son “esperados”
* deben tener `error_code` estable
* no deben incluir stacktrace en prod

**Errores no controlados**:

* tienen `error_code = UNHANDLED_EXCEPTION`
* stacktrace:

  * completo en local
  * parcial en qa
  * recortado/omitido en prod

---

## 6. Modelo estándar de evento de negocio (Audit Event)

### 6.1 Estructura base (campos mínimos)

* `event_id` (uuid)
* `timestamp`
* `event_type` (ej. `BID_PLACED`)
* `trace_id`
* `actor_type` (`user` | `system`)
* `actor_user_id` (nullable si system)
* `entity_type` (Auction/Order/Dispute)
* `entity_id`
* `result` (`SUCCESS` | `FAIL`)
* `reason_code` (si FAIL, ej. `BID_TOO_LOW`)
* `payload` (solo whitelist, mínimo necesario)

### 6.2 Payload permitido (whitelist)

Regla:

* El payload es un **resumen mínimo**, no el request completo.
* Nunca contiene PII sensible.

Ejemplos permitidos:

**BID_PLACED**

* `amount`
* `auction_current_price_before`
* `auction_current_price_after`
* `auction_ends_at_before`
* `auction_ends_at_after`

**PAYMENT_CONFIRMED**

* `order_amount`
* `payment_provider`
* `payment_ref_masked`

---

## 7. Qué se imprime vs qué se guarda (por ambiente)

> Nota: “Guardar” puede significar “persistir en DB” o “en un sistema externo”.
> En Iron Loot, como base, asumimos persistencia en DB para:

* errores (siempre)
* eventos de negocio (siempre)
  y logs técnicos según ambiente.

### 7.1 Ambiente `local`

**Imprimir en consola**

* logs técnicos: DEBUG/INFO/WARN/ERROR
* errores: sí
* resumen de eventos: opcional (INFO)

**Guardar en DB**

* eventos de negocio: sí (obligatorio)
* errores: sí (recomendado)
* logs técnicos: opcional (configurable)

Objetivo local:

* máximo detalle para desarrollo.

---

### 7.2 Ambiente `qa`

**Imprimir en consola**

* logs técnicos: INFO/WARN/ERROR
* errores: sí
* eventos: opcional

**Guardar en DB**

* eventos: sí (obligatorio)
* errores: sí (obligatorio)
* logs técnicos: sí (recomendado, para reproducir bugs)

Objetivo QA:

* reproducibilidad y evidencia.

---

### 7.3 Ambiente `prod`

**Imprimir en consola**

* logs técnicos: INFO/WARN/ERROR (sin DEBUG)
* errores: sí (sin datos sensibles)
* eventos: no necesariamente (opcional)

**Guardar en DB**

* eventos: sí (obligatorio)
* errores: sí (obligatorio)
* logs técnicos: recomendado con muestreo o solo métricas (según costo)

Objetivo prod:

* auditoría + diagnóstico sin exponer secretos.

---

## 8. Reglas de sanitización y privacidad

### 8.1 Nunca registrar

* password / passwordHash
* tokens (JWT, refresh)
* provider secrets
* datos bancarios completos
* direcciones completas sin necesidad
* identificaciones

### 8.2 Masking recomendado

Si se requiere referencia:

* `payment_ref` → “masked” (ej. últimos 4)
* correos → parcial (ej. `a***@domain.com`) en prod si se registra
* IP → opcional y controlado

---

## 9. Trazabilidad completa: cómo se correlaciona todo

### 9.1 Por request (traceId)

* request log: incluye traceId
* error log: incluye traceId
* audit event: incluye traceId

### 9.2 Por entidad (entityId)

Además del traceId, se debe poder reconstruir por:

* `auctionId`
* `orderId`
* `disputeId`

Esto habilita auditoría a nivel negocio:

* “historial de una subasta”
* “historial de una orden”

---

## 10. Reglas de instrumentación (sin hardcode)

### 10.1 Puntos únicos de instrumentación

La instrumentación debe vivir en:

* middleware (traceId)
* interceptores (request logs + audit)
* filtros globales (errores)

Los módulos funcionales no deben:

* “armar logs manuales” en cada acción
* duplicar campos
* imprimir información sensible

### 10.2 Contrato mínimo para servicios

Los servicios deben ser capaces de devolver:

* resultado
* o un error de negocio estructurado
  para que el filtro/interceptor lo registre con los campos estándar.

---

## 11. Ejemplos conceptuales (sin código)

### Ejemplo 1: Puja exitosa

* request log: `POST /auctions/{id}/bids`, duration, user_id, trace_id
* audit event: `BID_PLACED`, actor_user_id, auctionId, payload mínimo, SUCCESS
* response: `200` con `X-Trace-Id`

### Ejemplo 2: Puja rechazada por regla

* request log: `POST /...`, duration, trace_id
* error log: `BID_TOO_LOW`, http_status 409, user_id, auctionId
* audit event: opcional (solo si se decide registrar intentos fallidos como auditoría)

---