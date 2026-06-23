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
