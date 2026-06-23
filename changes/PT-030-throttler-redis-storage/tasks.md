# PT-030 — Tasks
## ThrottlerModule: migrar de in-memory a Redis storage

**Branch**: `refactor/PT-030-throttler-redis-storage`

---

## PT-030.1 — Verificar compatibilidad de versiones

**Objetivo**: Confirmar versión compatible de `nestjs-throttler-storage-redis` con `@nestjs/throttler ^5` e `ioredis ^5`.
**Inputs**: `src/api/package.json` (throttler: ^5.1.1, ioredis: ^5.3.2)
**Outputs**: Versión exacta del paquete a instalar confirmada (e.g. `nestjs-throttler-storage-redis@0.4.x`)
**Validation**: `npm info nestjs-throttler-storage-redis peerDependencies` — verificar que los peers son compatibles

**Status**: PENDING

---

## PT-030.2 — Instalar nestjs-throttler-storage-redis

**Objetivo**: Agregar dependencia de producción.
**Inputs**: `src/api/package.json` (sin `nestjs-throttler-storage-redis`)
**Outputs**: `nestjs-throttler-storage-redis` en `dependencies` de `package.json` + `package-lock.json` actualizado
**Validation**: `npm install nestjs-throttler-storage-redis` (desde `src/api/`) → exit 0 sin conflictos de peer

**Status**: PENDING

---

## PT-030.3 — Actualizar ThrottlerModule en app.module.ts

**Objetivo**: Agregar Redis storage al ThrottlerModule.
**Inputs**: `src/api/src/app.module.ts` líneas 75-85
**Outputs**:
```typescript
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';

ThrottlerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [
      {
        ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
        limit: config.get<number>('RATE_LIMIT_MAX', 100),
      },
    ],
    storage: new ThrottlerStorageRedisService(
      new Redis({
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: config.get<number>('REDIS_PORT', 6379),
        password: config.get<string>('REDIS_PASSWORD') || undefined,
      }),
    ),
  }),
}),
```
**Validation**: `npm run typecheck` → 0 errores

**Status**: PENDING

---

## PT-030.4 — Ejecutar tests y verificar no regresiones

**Objetivo**: Confirmar que los tests existentes que mockean ThrottlerGuard siguen pasando.
**Inputs**: Suite de tests actual (`npm test`)
**Outputs**: Todos los tests pasan sin modificaciones adicionales a los mocks
**Validation**: `npm test` → exit 0, sin failures

**Status**: PENDING

---

## PT-030.5 — Verificación manual con Docker

**Objetivo**: Confirmar que el throttle funciona correctamente con Redis en ejecución.
**Inputs**: `docker-compose up -d db redis mailhog` + API en modo dev
**Outputs**: Llamadas al API respetan rate limit; Redis recibe keys de throttle (verificar con `redis-cli keys *throttle*`)
**Validation**: >100 req/min al API → 429 Too Many Requests; Redis keys creadas

**Status**: PENDING

---

## PT-030.6 — Commit atómico

**Objetivo**: Commit con todos los cambios.
**Inputs**: Cambios en package.json, package-lock.json, app.module.ts
**Outputs**: Commit: `refactor: PT-030 migrate ThrottlerModule to Redis storage for multi-instance rate limiting`
**Validation**: `git diff HEAD~1 --stat` → solo los 3 archivos esperados

**Status**: PENDING
