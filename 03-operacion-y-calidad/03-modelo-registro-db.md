## 1. Propósito

Este documento define el **modelo de persistencia en base de datos** para:

* **eventos de negocio (auditoría)**,
* **errores capturados** (negocio + excepciones),
* **logs técnicos de request/operación** (según ambiente),

con el objetivo de que:

* nada crítico quede en hardcode,
* todo sea trazable por `trace_id` y por entidad (`auction_id`, `order_id`, etc.),
* y podamos consultar historial por usuario, subasta o transacción.

Este modelo es el soporte técnico de:

* `01-observabilidad-y-entornos.md`
* `02-logging-y-trazabilidad.md`

---

## 2. Principios del modelo

### P1. Separación por tipo de registro

Se separan tablas por finalidad:

* auditoría (eventos),
* errores,
* requests/logs técnicos.

### P2. Correlación obligatoria

Todas las tablas deben soportar:

* `trace_id` (request-level)
* entidad objetivo (`entity_type`, `entity_id`)
* actor (`actor_user_id` o system)

### P3. Payload controlado

Todo “payload” se almacena como JSON con:

* whitelisting,
* tamaño controlado,
* sin PII sensible.

### P4. Consultabilidad primero

El schema se diseña para responder rápido preguntas como:

* “¿Qué pasó con esta subasta?”
* “¿Por qué falló el pago?”
* “¿Cuándo se abrió la disputa y cómo evolucionó?”
* “¿Qué hizo este usuario?”

---

## 3. Tablas mínimas

### 3.1 `audit_events` (obligatoria)

Registra **eventos de negocio** (auditoría).

#### Campos

* `id` (UUID, PK)
* `event_type` (VARCHAR, NOT NULL)
* `timestamp` (TIMESTAMPTZ, NOT NULL, default now)
* `trace_id` (VARCHAR, NOT NULL)
* `env` (VARCHAR, NOT NULL)  *(local/qa/prod)*
* `service` (VARCHAR, NOT NULL) *(ej. Iron Loot-api)*

**Actor**

* `actor_type` (VARCHAR, NOT NULL) *(user/system)*
* `actor_user_id` (UUID, NULL)

**Entidad objetivo**

* `entity_type` (VARCHAR, NOT NULL) *(Auction/Order/Dispute/User/etc.)*
* `entity_id` (UUID, NOT NULL)

**Resultado**

* `result` (VARCHAR, NOT NULL) *(SUCCESS/FAIL)*
* `reason_code` (VARCHAR, NULL) *(si FAIL: código de negocio)*

**Payload**

* `payload` (JSONB, NOT NULL, default '{}') *(whitelisted)*
* `payload_version` (INT, NOT NULL, default 1)

**Auditoría**

* `created_at` (TIMESTAMPTZ, NOT NULL, default now)

#### Índices recomendados

* `idx_audit_events_entity` (`entity_type`, `entity_id`, `timestamp DESC`)
* `idx_audit_events_actor` (`actor_user_id`, `timestamp DESC`)
* `idx_audit_events_trace` (`trace_id`)
* `idx_audit_events_type_time` (`event_type`, `timestamp DESC`)

#### Retención

* En `prod`: retención larga (definir NFR; sugerido 12–24 meses mínimo).
* En `local/qa`: retención corta (30–90 días) con limpieza automática.

---

### 3.2 `error_events` (obligatoria)

Registra **errores de negocio** y **excepciones no controladas**.

#### Campos

* `id` (UUID, PK)
* `timestamp` (TIMESTAMPTZ, NOT NULL, default now)
* `trace_id` (VARCHAR, NOT NULL)
* `env` (VARCHAR, NOT NULL)
* `service` (VARCHAR, NOT NULL)

**Error**

* `error_code` (VARCHAR, NOT NULL) *(ej. BID_TOO_LOW / UNHANDLED_EXCEPTION)*
* `message` (TEXT, NOT NULL) *(sanitizado)*
* `severity` (VARCHAR, NOT NULL) *(WARN/ERROR)*
* `http_status` (INT, NULL)
* `is_business_error` (BOOLEAN, NOT NULL, default false)

**Contexto request**

* `http_method` (VARCHAR, NULL)
* `http_path` (TEXT, NULL)
* `http_query` (TEXT, NULL) *(opcional; no registrar si contiene PII)*
* `client_ip` (VARCHAR, NULL) *(opcional, controlado)*
* `user_agent` (TEXT, NULL) *(opcional)*

**Actor**

* `actor_user_id` (UUID, NULL)

**Entidad objetivo**

* `entity_type` (VARCHAR, NULL)
* `entity_id` (UUID, NULL)

**Detalles**

* `details` (JSONB, NOT NULL, default '{}') *(schema controlado)*
* `stack` (TEXT, NULL) *(solo local/qa o recortado en prod)*

**Auditoría**

* `created_at` (TIMESTAMPTZ, NOT NULL, default now)

#### Índices recomendados

* `idx_error_events_trace` (`trace_id`)
* `idx_error_events_code_time` (`error_code`, `timestamp DESC`)
* `idx_error_events_actor` (`actor_user_id`, `timestamp DESC`)
* `idx_error_events_entity` (`entity_type`, `entity_id`, `timestamp DESC`)
* `idx_error_events_http` (`http_status`, `timestamp DESC`)

#### Retención

* `prod`: sugerido 6–12 meses (según volumen).
* `local/qa`: 30–90 días.

---

### 3.3 `request_logs` (recomendado; obligatorio en qa, opcional en prod)

Registra **requests/responses** como log técnico.

> En producción puede aplicarse muestreo o guardarse solo para endpoints críticos.

#### Campos

* `id` (UUID, PK)
* `timestamp` (TIMESTAMPTZ, NOT NULL, default now)
* `trace_id` (VARCHAR, NOT NULL)
* `env` (VARCHAR, NOT NULL)
* `service` (VARCHAR, NOT NULL)

**Request**

* `http_method` (VARCHAR, NOT NULL)
* `http_path` (TEXT, NOT NULL)
* `http_status` (INT, NOT NULL)
* `duration_ms` (INT, NOT NULL)
* `request_size_bytes` (INT, NULL)
* `response_size_bytes` (INT, NULL)

**Actor**

* `actor_user_id` (UUID, NULL)
* `actor_state` (VARCHAR, NULL) *(VERIFIED, SELLER_ENABLED, etc.)*

**Cliente**

* `client_ip` (VARCHAR, NULL) *(opcional, controlado)*
* `user_agent` (TEXT, NULL) *(opcional)*
* `client_app` (VARCHAR, NULL) *(web/mobile)*

**Target opcional**

* `entity_type` (VARCHAR, NULL)
* `entity_id` (UUID, NULL)

**Auditoría**

* `created_at` (TIMESTAMPTZ, NOT NULL, default now)

#### Índices recomendados

* `idx_request_logs_trace` (`trace_id`)
* `idx_request_logs_path_time` (`http_path`, `timestamp DESC`)
* `idx_request_logs_status_time` (`http_status`, `timestamp DESC`)
* `idx_request_logs_actor_time` (`actor_user_id`, `timestamp DESC`)

#### Retención

* `qa`: 30–90 días.
* `prod`: 7–30 días o muestreo (según NFRs y costos).

---

## 4. Relación con entidades del dominio

Este modelo es transversal. No se pone FK directa a `auctions/orders` para evitar:

* acoplamiento fuerte,
* bloqueos por integridad en limpieza,
* dependencia circular.

Se usa correlación lógica:

* `entity_type` + `entity_id`

**Pero** si el equipo lo considera útil, puede añadirse FK opcional por tabla de dominio (no recomendado al inicio).

---

## 5. Esquema de tamaños y límites

### 5.1 Tamaño máximo sugerido

* `payload` (audit_events): 4–16 KB por registro (whitelisted)
* `details` (error_events): 4–16 KB
* `stack`: puede crecer; recortar en prod

### 5.2 Estrategia de recorte (prod)

* stacktraces: guardar solo encabezado + top frames
* user agent: opcional y truncado
* http_query: evitar si incluye datos sensibles

---

## 6. Limpieza y retención (job de housekeeping)

### 6.1 Estrategia

Crear un proceso automático (job) que:

* elimine registros fuera de la ventana de retención,
* haga limpieza por `env`,
* permita configuración por variable de entorno.

### 6.2 Tablas candidatas

* `request_logs` primero (alto volumen)
* `error_events` después
* `audit_events` con retención más larga

---

## 7. Consultas típicas que este modelo debe soportar

### 7.1 Historial de una subasta

* `audit_events` por `entity_type='Auction'` y `entity_id={auctionId}` ordenado por tiempo.

### 7.2 Errores por traceId

* `error_events` por `trace_id={traceId}`.

### 7.3 Actividad de un usuario

* `audit_events` por `actor_user_id={userId}`.
* `error_events` por `actor_user_id={userId}`.

### 7.4 Diagnóstico por endpoint

* `request_logs` por `http_path` y rango de fechas.

---

## 8. Decisión: qué se guarda por ambiente (resumen)

| Tabla        |         local |                        qa |                         prod |
| ------------ | ------------: | ------------------------: | ---------------------------: |
| audit_events | ✅ obligatorio |             ✅ obligatorio |                ✅ obligatorio |
| error_events | ✅ recomendado |             ✅ obligatorio |                ✅ obligatorio |
| request_logs |      opcional | ✅ recomendado/obligatorio | opcional (muestreo/criticos) |

---

## 9. Dependencias con documento técnico

En el Documento Técnico (NestJS) se implementarán:

* middleware `traceId`,
* interceptor de request logs → `request_logs`,
* filtro global de errores → `error_events`,
* interceptor/auditoría por casos de uso → `audit_events`.

El dominio solo expone:

* contextos y metadatos para permitir el registro,
  sin “hardcode” ni duplicación de estructura.

---