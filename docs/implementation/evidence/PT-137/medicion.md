# PT-137 — Evidencia

> En `.md` por **F-136-A**.

## 1. La brecha, medida

```
variables que el API lee:            64
declaradas en .env.example (raiz):   40 (contando comentadas)
declaradas en src/api/.env.example:  52 (contando comentadas)
SIN DECLARAR EN NINGUNO:             25
```

Mayor que la estimación del paquete de propuesta («49 frente a 37», que contaba un solo fichero).
Hay **tres** `.env.example` —raíz, `src/api` y `src/admin`—.

Las 25: mail (5), HeyBanco (4), CFDI (3), reCAPTCHA (2), Stripe, caducidades de JWT (3), Mercado Pago
(2), y `APP_NAME`, `LOG_RETENTION_DAYS`, `REQUIRE_AUCTION_MODERATION`, `SLOW_REQUEST_THRESHOLD_MS`,
`WITHDRAWAL_DAILY_LIMIT`.

## 2. Los cuatro clientes, y sus tres formas de configurarse

| Cliente | Leía | Reserva |
|---|---|---|
| colas Bull (`app.module`) | `REDIS_HOST`/`REDIS_PORT` | `localhost` |
| throttler | `REDIS_HOST`/`REDIS_PORT` | `localhost` |
| cerrojo distribuido | `REDIS_URL` | — |
| sesiones de ADMIN | `REDIS_URL` | `redis://redis:6379` |

Y `docker-compose.yml` declaraba **sólo `REDIS_URL`**.

## 3. Las dos verificaciones que importan

### Sin `REDIS_HOST` en el `.env` que no está en git

Se retiró `REDIS_HOST`/`REDIS_PORT` de `src/api/.env` y se reinició:

```
ironloot-api   Up 25 seconds (healthy)
Nest application successfully started
```

Sin un solo `ECONNREFUSED` ni `maxRetriesPerRequest`.

**Y los dos clientes que se cambiaron dejan huella en Redis:**

```
bull:notification-jobs:meta                        <- las colas conectan
bull:webhook-retry:meta
{ffda2c...:default}:hits                           <- el throttler cuenta
```

### El 429 real

El límite de `login` en desarrollo es 60/min. Ráfaga de 70:

```
401: 48    429: 22
```

**El rate limiting sigue vivo y contando en Redis.** Sin esta comprobación, apuntar mal habría dejado
la defensa de los endpoints de autenticación desaparecida sin que nada lo dijera — la forma de F-34.

### El otro sentido: falla nombrando la variable

```
LANZA, y dice:
  REDIS_URL no esta definida. Es el unico contrato de configuracion de Redis (PT-137):
  las colas, el rate limiting, el cerrojo distribuido y las sesiones de ADMIN la usan.
  Sin ella el proceso NO arranca...
```

Es la forma que PT-126 fijó para `JWT_SECRET`: **una función que lanza nombrando la variable**, no un
valor por defecto que engaña.

## 4. Octava vez que una guarda caza al agente

`redis-url.ts` explica el defecto citando `config.get('REDIS_HOST', 'localhost')` —para contar que ésa
era la forma equivocada— y la guarda lo leyó como una lectura viva.

La lección es la de siempre, y ya van tres guardas con ella: **si documentar por qué algo se retiró
hace fallar la guarda, la forma de tenerla en verde es no explicar nada.** Fijado como control C5b.

## 5. Regresión

```
Unitarias: 748 / 748  en 98 suites
```
