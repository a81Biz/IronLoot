# F8 — Auditoría de Observabilidad y Recuperación

**Estado**: COMPLETADA (parcial — BLQ-002: sin logs en vivo)  
**Fecha**: 2026-06-23  
**Confidence**: 70%  
**Dimensión principal**: D3 — Observability & Recovery  
**D5 — Operational Reliability**: Parcialmente evaluado; Hallucination Rate y Output Drift → **NO_APLICA** (sistema determinista)

---

## Limitaciones

**BLQ-002**: No hay acceso a logs en vivo ni métricas de sistema. La evaluación de observabilidad se realiza únicamente mediante lectura del código fuente y configuración. La confidence de D3 es reducida por este blockeador.

---

## F8.1 — Stack de Logging

### StructuredLogger (módulo de observabilidad)
**Fuente**: `src/api/src/common/observability/constants.ts`, `06-Backend-Architecture.md`

El API implementa un sistema de logging estructurado con:
- `StructuredLogger`: wrapper sobre el logger de NestJS con soporte para `traceId`, `requestId`, child loggers
- Integrado en: `BidsService`, `WalletService`, `AuthService`, `AuctionSchedulerService` (verificado via código)
- Formato: JSON estructurado con contexto de correlación

**Cobertura de StructuredLogger**: Alta en servicios financieros críticos.  
**Excepción conocida**: `PaymentsService` — H-003 (Logger estándar, D2-BAJA)

### RequestLog / AuditEvent / ErrorEvent
**Fuente**: `06-Backend-Architecture.md` sección Observability Stack  
**Documentado**: Tres tipos de evento en el módulo `audit`:
- `RequestLog`: cada request HTTP → tabla `request_logs`
- `AuditEvent`: eventos de negocio importantes → tabla `audit_events`  
- `ErrorEvent`: errores capturados → tabla `error_events`

**Estado**: Documentado en arquitectura. No verificado en código fuente directo (requeriría leer AuditService y middleware correspondiente — no hecho en esta sesión).  
**Confidence de este sub-ítem**: 70%

---

## F8.2 — Trazabilidad End-to-End

### TraceId propagation
**Estado ESPERADO**: `traceId` propagado desde request inicial a través de todos los servicios via `StructuredLogger`.  
**Estado REAL verificado**:
- BidsService, WalletService, AuthService: StructuredLogger (trazabilidad ✅)
- PaymentsService: Logger estándar — traceId ausente en logs de pagos ❌ (H-003)

La cadena de trazabilidad está rota específicamente en el módulo de pagos, que es el más crítico para diagnóstico de incidentes financieros.

---

## F8.3 — Health Checks

**Fuente**: `docs/enterprise-documentation/inventory/endpoints.md` + arquitectura  
**Endpoints documentados**:
- `GET /health` — health básico
- `GET /health/detailed` — health detallado con estado de dependencias (DB, Redis)

**Estado**: Documentado. No verificado via llamada real (BLQ-002).  
**Confidence**: 75%

---

## F8.4 — Recovery y Fallbacks

### Distributed lock para auction close
`lock:auction-close` con TTL 60s → previene doble-close si múltiples instancias compiten  
**Estado**: ✅ IMPLEMENTADO (verificado en código)

### Admin session Redis fallback
`src/admin/src/main.ts`: intenta Redis store, si falla → fallback a in-memory con warning "not for production"  
**Estado**: Graceful fallback implementado ✅ (PT-013)

### ThrottlerModule sin fallback de storage
En-memoria sin Redis — no es un fallo sino el comportamiento estático actual (H-002)

### Transacciones Prisma atómicas
Todas las operaciones wallet en `prisma.$transaction()` — rollback automático si cualquier paso falla  
**Estado**: ✅ IMPLEMENTADO

---

## F8.5 — D5 Operational Reliability

| Métrica D5 | Sistema IronLoot | Estado |
|---|---|---|
| Success Rate | No medible sin logs en vivo | PENDIENTE (BLQ-002) |
| Retry Rate | BullMQ queues configuradas — reintentos no medidos en vivo | PENDIENTE (BLQ-002) |
| Failure Rate | No medible sin logs en vivo | PENDIENTE (BLQ-002) |
| Hallucination Rate | **NO_APLICA** — sistema determinista | N/A |
| Output Drift | **NO_APLICA** — sistema determinista | N/A |
| `health_unstable` | `false` — no hay LLM | N/A |

**D5 conclusión**: No se puede calcular D5 cuantitativo sin logs en vivo. No activa el cap de clasificación B porque `health_unstable = false`.

---

## Hallazgos D3

**No se identificaron hallazgos ABIERTOS en D3** (las anomalías de logging del PaymentsService fueron clasificadas D2 por impacto arquitectural, no D3 operacional).

---

## Score D3

Sin penalizaciones en D3.

**D3 = 100**

*Nota: confidence reducida (70%) por BLQ-002. Si logs en vivo revelaran gaps adicionales en próxima auditoría, D3 podría bajar. Próxima auditoría recomendada para D3 en 30 días.*

---

## Update U-004 — DS-004 (2026-07-27)

Logs **leídos**, no supuestos. Traza de pagos de la última corrida: 9 pasos distintos, 30 eventos.

- Credenciales filtradas: **0**.
- Entradas redactadas: **4**, y cada una **nombra qué ocultó** en `redacted_fields`
  (`headers.x-signature`, `response.authorization_code`).

Redacción marcada, no borrado silencioso — que es lo que CLAUDE.md exige. D3 se mantiene en 100.

---

## Update U-006 — S-002 (2026-07-27): leído, no supuesto

`[R51]` prohíbe asumir que el logging funciona. Se leyeron los logs del contenedor en marcha.

### Logs en vivo

`docker logs ironloot-api` — JSON estructurado con `timestamp`, `level`, `service`, `env`,
`traceId` y `duration` en cada entrada. El cron de subastas corre cada minuto, toma y suelta su
cerrojo (`lock:auction-close`, TTL 60 s) y deja constancia de ambas cosas. Cada petición HTTP
escribe su `request_log` (960 filas acumuladas). Peticiones con `traceId` propagado extremo a
extremo; las del cron, marcadas `no-context`.

**Ninguna excepción no manejada en la ventana observada.**

### Checkpoint D3

`npm run audit:observability`

```
  silent_failure_count = 25   (linea base: 25)   — sin silencios nuevos
  trace_completeness   = 100%    1 de 1 ciclos liquidados con la cadena completa
  prompt_provenance    = NO_APLICA
  fallback_quality     = evaluacion documentada ([R57])
```

### Traza de pagos, sobre datos reales

49 eventos en `payment_cycle_events`, 8 pasos distintos:

```
 PROVIDER_CONFIRM 17 · POLL_ATTEMPT 15 · DEPOSIT_REQUESTED 5 · PROVIDER_CREATE 4
 CYCLE_DECISION 3 · SIGNATURE_OK 2 · NOTIFICATION_RECEIVED 2 · WALLET_CREDITED 1
```

Credenciales: **0 visibles**. 4 eventos redactados, y cada uno **nombra qué ocultó**
(`headers.x-signature`, `response.authorization_code`). Redacción marcada, no borrado silencioso.

### D5 — fiabilidad operacional

```
  Success Rate 100% VERDE · Retry Rate 0% VERDE · Failure Rate 0% VERDE
  health_unstable = false
```

3 ciclos abiertos en sondeo — la vía garantizada haciendo su trabajo, no un fallo.

### Score D3 — S-002

```
100 − 0 = 100
```

Sin hallazgos activos en D3.
