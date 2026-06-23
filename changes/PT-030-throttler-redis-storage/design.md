# PT-030 — Design Document
## ThrottlerModule: migrar de in-memory a Redis storage

**Fecha**: 2026-06-23 | **Tipo**: REFACTOR STANDARD | **Complexity**: STANDARD

---

## Decisión arquitectónica

**Usar `nestjs-throttler-storage-redis` como storage backend de `ThrottlerModule`.**

El estado actual (`ThrottlerModule.forRootAsync` sin `storage`) usa in-memory storage. Con múltiples instancias API, cada instancia tiene su propio contador — un usuario puede superar el límite multiplicando el número de instancias.

---

## Package seleccionado: `nestjs-throttler-storage-redis`

| Criterio | Evaluación |
|---|---|
| Compatibilidad `@nestjs/throttler ^5` | ✅ Versión 0.4.x+ compatible |
| Compatibilidad `ioredis ^5` | ✅ Acepta instancia ioredis |
| Mantenimiento | ✅ Activo, comunidad NestJS |
| Bundle size | Mínimo — no agrega DB drivers |

**Alternativa rechazada**: Implementación propia con `ioredis` directamente — sobre-ingeniería sin beneficio.

---

## Cambio en `app.module.ts`

```typescript
// Agregar imports:
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';

// Cambiar ThrottlerModule.forRootAsync:
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

---

## Archivos afectados

| Archivo | Cambio | Tipo |
|---|---|---|
| `src/api/package.json` | Agregar `nestjs-throttler-storage-redis` a dependencies | Config |
| `src/api/src/app.module.ts` | `ThrottlerModule` con Redis storage | Implementation |

No hay cambios en: controllers, guards, tests (los mocks existentes de `ThrottlerGuard` no dependen del storage).

---

## Comportamiento en Redis down

`nestjs-throttler-storage-redis` lanza excepción si Redis no responde. Esto implica que si Redis cae, el throttle podría bloquear requests. Comportamiento aceptable para MVP (Redis ya es dependencia crítica de BullMQ y DistributedLockService — si Redis cae, el sistema ya tiene problemas mayores).

Para producción futura: considerar circuit breaker o fallback a in-memory. **Out-of-scope para este PT.**

---

## Coherencia con config existente de Redis

El proyecto ya tiene 2 conexiones Redis:
1. **BullMQ** — `BullModule.forRootAsync` con `{ host, port, password }` de env vars
2. **DistributedLockService** — `ioredis` con mismas env vars

La nueva conexión Throttler sigue el mismo patrón — no hay nueva variable de entorno ni cambio de `.env.example`.

---

## Invariantes de comportamiento preservados

- TTL y limit globales: idénticos (`RATE_LIMIT_TTL`, `RATE_LIMIT_MAX`)
- `@Throttle({ default: { limit: 5, ttl: 60000 } })` en `withdraw` y `deposit`: funcionan automáticamente con el nuevo storage sin cambios
- `ThrottlerGuard` como `APP_GUARD`: no cambia
- Tests existentes que mockean `ThrottlerGuard`: siguen funcionando (el storage es transparente para los mocks)
