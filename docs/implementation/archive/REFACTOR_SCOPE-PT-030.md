# REFACTOR_SCOPE.md — PT-030 ThrottlerModule → Redis Storage

**PT-030** | **Fecha**: 2026-06-23 | **Origen FPGE**: R-005 ← H-002 | **Complejidad**: STANDARD | **Tipo**: REFACTOR

---

## 1. Qué cambia

| Elemento | Antes | Después |
|---|---|---|
| Storage del ThrottlerModule | In-memory (por proceso) | Redis (compartido entre instancias) |
| Dependencia npm | Solo `@nestjs/throttler` | + `@nestjs-throttler-storage-redis` (o equivalente) |
| `app.module.ts` ThrottlerModule config | `useFactory` sin `storage` | `useFactory` con `storage: new ThrottlerStorageRedisService(...)` |

---

## 2. Qué NO cambia (límite explícito)

- ❌ Los decoradores `@Throttle()` en ningún controller
- ❌ Los límites configurados (100 req/min global, 5-30 req/min en auth)
- ❌ La respuesta HTTP al cliente (429 con headers de retry-after — idéntica)
- ❌ La configuración de Redis (usar la misma instancia ya configurada en el stack)
- ❌ Ningún otro módulo ni servicio

---

## 3. Barra de calidad (threshold que prueba que el refactor está completo)

1. Tests E2E de rate limiting pasan sin modificación (comportamiento 429 preservado)
2. `app.module.ts` no contiene referencia a storage in-memory de throttler
3. La configuración Redis del ThrottlerModule usa la misma URL que el resto del sistema (`REDIS_URL` o equivalente)

---

## 4. Riesgo de regresión

**BAJO** en entorno de una instancia (comportamiento observable idéntico).

**Riesgo en tests**: Si los tests E2E lanzan en paralelo, un Redis compartido puede contaminar contadores entre suites. Mitigación: flush del namespace de throttler en `beforeEach`/`afterEach` de tests E2E.

**Rollback**: Si el Redis no está disponible en algún ambiente, el módulo no iniciará. Considerar `ThrottlerStorageRedis` con fallback o hacer el Redis obligatorio en config validation.

---

## 5. Dependencias

- `@nestjs-throttler-storage-redis` — verificar versión compatible con `@nestjs/throttler` instalado (ver `package.json`)
- Redis disponible en `REDIS_URL` — ya configurado en el stack
