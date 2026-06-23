# PT-030 — Out of Scope

---

Los siguientes elementos quedan **explícitamente excluidos** de este PT:

1. **Cambios en límites de throttle**: Los valores `RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`, y los `@Throttle` individuales en endpoints no cambian. Solo el storage backend cambia.

2. **Throttle para apps SSR (base/client)**: El refactor aplica únicamente a la API (`src/api/`). Las apps base y client tienen su propio throttle o ninguno.

3. **Circuit breaker para Redis down**: Si Redis falla, el throttle falla. Para producción robusta se necesitaría un fallback a in-memory o una estrategia de degradación. **Fuera de alcance** — Redis ya es crítico para BullMQ.

4. **Redis Cluster / Sentinel support**: Solo se soporta Redis standalone (el mismo modo que BullMQ y DistributedLockService).

5. **Monitoreo de Redis throttle keys**: No se agrega Prometheus metric ni dashboard para keys de throttle en Redis.

6. **Throttle por IP vs por usuario**: El comportamiento actual (throttle por usuario autenticado o por IP para rutas públicas) no cambia.

7. **Tests E2E de throttle multi-instancia**: La verificación de que dos instancias comparten el contador no forma parte de la suite automatizada de este PT.
