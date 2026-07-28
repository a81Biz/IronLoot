# PT-137 — Design: un solo contrato para Redis

**Tipo**: BUG · **Complejidad**: STANDARD · **Origen**: F-135-A (`DISCOVERY.md` § Revisión U-002)
**Depende de**: PT-136 (para que su guarda se ejecute en CI)

## El defecto

De los cuatro clientes de Redis del sistema, **dos leen variables que `docker-compose.yml` no
declara**, y caen a `localhost` en silencio.

| Cliente | Qué lee | Reserva |
|---|---|---|
| `src/api/src/app.module.ts:61-62` — colas Bull | `REDIS_HOST` / `REDIS_PORT` | **`localhost`** |
| `src/api/src/common/redis/throttler-redis.module.ts:31-32` | `REDIS_HOST` / `REDIS_PORT` | **`localhost`** |
| `src/api/src/common/redis/distributed-lock.service.ts:12` | `REDIS_URL` | — |
| `src/admin/src/main.ts:81` — sesiones | `REDIS_URL` | `redis://redis:6379` |

`docker-compose.yml:43` y `:90` declaran **sólo `REDIS_URL`**. Lo que hace funcionar el contenedor de
desarrollo es `REDIS_HOST=redis` dentro de **`src/api/.env`, un fichero que no está en git**.

`.env.example:34` trae `REDIS_HOST=redis` y `:39` deja `REDIS_URL` comentado — el ejemplo y el compose
declaran contratos distintos.

## El síntoma engaña, y ése es el daño real

Al arrancar la imagen de producción con lo que sugieren el compose y el `CLAUDE.md`:

```
Nest application successfully started          <- la aplicacion arranca bien
[ioredis] Unhandled error event: AggregateError [ECONNREFUSED]
GET /api/v1/health -> 500  «Reached the max retries per request limit (which is 20)»
```

**El mensaje no menciona Redis ni configuración.** Dice `maxRetriesPerRequest`, que manda a mirar
reintentos. Es la familia de PT-111/F-39 —ADMIN apuntando a `localhost:6379` sin que nadie lo
notara— y la de H-016: *lo que hace funcionar el sistema no es lo que está declarado*.

## Decisiones de arquitectura

### D1 — El contrato es `REDIS_URL`

**Dos de los cuatro clientes ya lo usan**, incluido ADMIN. Unificar alinea dos, no cuatro.

Y una URL lleva lo que host+puerto no pueden llevar: credenciales, base, y `rediss://` para TLS. El
día que Redis deje de estar en la misma red de Docker, host+puerto no alcanzan. Es la misma lógica
de PT-088 con las URLs públicas: **una sola fuente**.

Alternativa rechazada: declarar `REDIS_HOST`/`REDIS_PORT` como contrato y llevarlos al compose. Sería
adaptar dos clientes correctos a la convención de los dos que fallan.

### D2 — Sin reserva silenciosa

La causa de que esto haya vivido tanto no es la variable equivocada: es **`, 'localhost'`**. Un valor
por defecto convierte «mal configurado» en «configurado hacia ninguna parte», y el sistema arranca.

```
config.get<string>('REDIS_HOST', 'localhost')     ->  arranca roto, en silencio
requiredEnv('REDIS_URL')                          ->  no arranca, y dice por que
```

Es exactamente la disciplina que PT-126 aplicó a `JWT_SECRET` cuando los tipos de `@nestjs/jwt` 11 lo
señalaron: **una función que lanza**, no un `!` ni un valor por defecto. Se reutiliza ese mecanismo,
no se inventa otro.

**Matiz que importa**: el mensaje de error debe **nombrar la variable**. El fallo actual es malo
sobre todo porque no dice qué falta.

### D3 — La guarda ataca la clase entera

`variables-de-entorno-declaradas.spec.ts`: **toda variable de entorno leída por el API existe en
`.env.example`.**

Medición preliminar (barrido crudo, a afinar al implementar): **49 leídas, 37 declaradas**. La brecha
es real aunque el número exacto cambie. Esta guarda no arregla sólo Redis: cierra la clase de defecto
donde *lo que hace funcionar el sistema vive en un fichero que no está en git*.

**Cómo evita ser insufrible**: lee `process.env.X` y `config.get('X')` por análisis estático; admite
una lista de excepciones **declaradas con motivo** en el propio spec (las que inyecta la plataforma,
como `NODE_ENV` o `CI`). Una excepción sin motivo escrito hace fallar la prueba.

### D4 — El rate limiting se verifica con un 429 real

`throttler-redis.module.ts` es uno de los dos clientes rotos. El throttler defiende los endpoints de
autenticación (5–30 req/min). Si tras el cambio apuntara mal, **la protección desaparecería sin que
nada lo dijera** — la forma exacta de F-34.

Por eso el criterio no es «la suite pasa»: es **ver un 429 real** contra un endpoint de auth.

## Alcance de servicios

- **API**: los dos clientes que fallan.
- **ADMIN**: ya usa `REDIS_URL`. Se revisa que su reserva `redis://redis:6379` siga teniendo sentido
  bajo D2 — probablemente también deba dejar de tenerla, pero eso se decide midiendo, no asumiendo.
- **BASE y CLIENT**: no usan Redis. Verificado.

## Lo que este PT NO decide

- **No toca la topología de Redis** ni introduce Sentinel, cluster o TLS. Sólo el contrato de
  configuración.
- **No revisa los 49 vs 37** más allá de dejar la guarda y cerrar la brecha que destape. Si aparece
  una variable no declarada que revele otro defecto, se abre PT.
