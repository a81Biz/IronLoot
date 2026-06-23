# PT-030 — Specification Changes

---

## Cambios en dependencias

### package.json (src/api/)
Nueva dependencia de producción: `nestjs-throttler-storage-redis` (versión a confirmar en PT-030.1).

---

## Cambios en requisitos de infraestructura

### Redis ahora es requerido para throttle (no solo para BullMQ/locks)

**Comportamiento anterior**: Redis requerido solo para BullMQ y DistributedLockService.

**Comportamiento nuevo**: Redis también requerido para ThrottlerModule. Si Redis no está disponible, el throttle puede fallar.

Esto no es un cambio práctico — Redis ya era dependencia crítica del sistema. Solo se documenta para claridad operacional.

---

## Cambios en documentación de arquitectura

### 03-TRD.md (docs/enterprise-documentation/ — disco local)
En sección de Rate Limiting, actualizar: "ThrottlerModule usa Redis storage vía `nestjs-throttler-storage-redis` para compartir contadores entre instancias."

### 09-Security-Architecture.md (docs/enterprise-documentation/ — disco local)
En sección de Rate Limiting, agregar: "Redis storage activo desde PT-030 — rate limits son efectivos en deployments multi-instancia."

### HISTORY.log
Entrada PT-030 al completar STATE 7.

---

## Sin cambios en

- Límites de throttle (TTL, limits — los valores no cambian)
- Endpoints con `@Throttle` individual (comportamiento idéntico, solo storage cambia)
- Variables de entorno `.env.example` (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD ya documentadas)
- API pública (nenhún endpoint modificado)
- Tests unitarios existentes (mocks de ThrottlerGuard no dependen del storage)
