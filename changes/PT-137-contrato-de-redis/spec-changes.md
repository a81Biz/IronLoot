# PT-137 — Cambios de especificación

## Contrato de configuración de Redis

**`REDIS_URL` es la única variable.** `REDIS_HOST` y `REDIS_PORT` dejan de existir.

| Fichero | Antes | Después |
|---|---|---|
| `src/api/src/app.module.ts:61-62` | `REDIS_HOST` / `REDIS_PORT`, reserva `localhost` | `REDIS_URL`, **sin reserva** |
| `src/api/src/common/redis/throttler-redis.module.ts:31-32` | ídem | ídem |
| `src/api/src/common/config/configuration.ts:33` | `process.env.REDIS_HOST \|\| 'localhost'` | derivado de `REDIS_URL` |
| `.env.example:34` | `REDIS_HOST=redis` | *(retirado)* |
| `.env.example:39` | `# REDIS_URL=redis://${REDIS_HOST}:${REDIS_PORT}` | `REDIS_URL=redis://redis:6379` **activo** |
| `docker-compose.yml:43,90` | `REDIS_URL=redis://redis:6379` | **sin cambios** — ya era correcto |

`src/admin/src/main.ts:81` se revisa bajo D2 (retirar o justificar su reserva), no se rediseña.

## `CLAUDE.md` — § Environment Variables

Hoy no menciona ninguna de las tres variables de Redis. Se añade:

```
REDIS_URL             # Única fuente para Redis. Sin ella el API no arranca — a propósito
```

Y una nota en § Key Technical Decisions:

> **Redis se configura por `REDIS_URL` y por nada más.** Hubo un tiempo en que dos de los cuatro
> clientes leían `REDIS_HOST`/`REDIS_PORT` con reserva `localhost` mientras el compose declaraba
> `REDIS_URL`: el sistema funcionaba **por un `src/api/.env` que no está en git**, y en un despliegue
> real las colas y el rate limiting caían con un mensaje sobre `maxRetriesPerRequest` que no menciona
> Redis (PT-137, F-135-A). Ninguna variable de conexión lleva valor por defecto: **arrancar mal
> configurado en silencio es peor que no arrancar.**

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-17**:

> **Ninguna variable de entorno de conexión lleva valor por defecto, y toda variable que el código lee
> está declarada en `.env.example`.**
> Un `config.get('X', 'localhost')` convierte «mal configurado» en «configurado hacia ninguna parte»,
> y el proceso arranca. Así vivió el contrato de Redis (PT-137) y así arrancó ADMIN con sesiones en
> memoria diciendo «Redis unavailable» con Redis levantado (F-39). El patrón correcto es el de
> `JWT_SECRET` desde PT-126: **una función que lanza, nombrando la variable**.
> Lo vigila `variables-de-entorno-declaradas.spec.ts`.

## Registros

- `PENDING_TASKS.md` — **F-135-A** deja de figurar «sin PT asignado».
- `HANDOFF.md` — § *Dos hallazgos nuevos*: F-135-A pasa a resuelto.
- `10-Technical-Debt.md` — si el barrido de PT-137.1 destapa variables no declaradas que revelen otro
  defecto, se registran como TD con su cita.

## Lo que este PT NO especifica

- Topología de Redis (Sentinel, cluster, réplicas).
- TLS. `REDIS_URL` lo habilita (`rediss://`); configurarlo es otra decisión.
- Comportamiento ante caída de Redis en caliente.
