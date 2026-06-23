# PT-030 — Test Scenarios

---

## TS-030-01: AppModule compila con ThrottlerStorageRedisService (typecheck)

**Acción**: `npm run typecheck` desde `src/api/`

**Resultado esperado**: 0 errores. Los tipos de `nestjs-throttler-storage-redis` son reconocidos correctamente por TypeScript.

---

## TS-030-02: Tests unitarios existentes no regresionan

**Contexto**: Los tests existentes que mockean `ThrottlerGuard` no dependen del storage backend.

**Acción**: `npm test` desde `src/api/`

**Resultado esperado**: Exit 0, sin failures. Los mocks de `ThrottlerGuard` funcionan independientemente del storage.

---

## TS-030-03: Verificación manual — throttle funcional con Redis activo

**Precondición**: `docker-compose up -d db redis` — Redis corriendo en localhost:6379

**Acción**: Iniciar API (`npm run start:dev`), enviar >100 requests al mismo endpoint en 60 segundos.

**Resultado esperado**: A partir de la request 101 → `429 Too Many Requests { message: 'ThrottlerException: Too Many Requests' }`

---

## TS-030-04: Verificación manual — keys de throttle en Redis

**Precondición**: Redis corriendo, API iniciada con la nueva config.

**Acción**: Hacer una request al API, luego ejecutar `redis-cli keys "*throttle*"` o `redis-cli keys "*"`.

**Resultado esperado**: Keys de throttle visibles en Redis (demostración de que el storage se está usando).

---

## TS-030-05: Verificación — config variables respetadas

**Precondición**: `.env` con `RATE_LIMIT_TTL=60` y `RATE_LIMIT_MAX=100`.

**Acción**: Verificar que `ThrottlerModule.useFactory` lee correctamente ambas variables.

**Resultado esperado**: `config.get<number>('RATE_LIMIT_TTL', 60)` y `config.get<number>('RATE_LIMIT_MAX', 100)` retornan los valores del .env.

---

## TS-030-06: Endpoints con @Throttle individual funcionan con Redis storage

**Contexto**: `wallet.controller.ts` tiene `@Throttle({ default: { limit: 5, ttl: 60000 } })` en deposit y withdraw.

**Acción**: Enviar >5 requests al endpoint de deposit en 60 segundos.

**Resultado esperado**: A partir de la request 6 → `429 Too Many Requests`.
