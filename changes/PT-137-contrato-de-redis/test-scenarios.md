# PT-137 — Escenarios de prueba

## Arranque: los dos sentidos

| # | Escenario | Esperado |
|---|---|---|
| ARR-01 | API con `REDIS_URL=redis://redis:6379` | Arranca, `healthy` |
| ARR-02 | API **sin** `REDIS_URL` | **Aborta**, con mensaje que **nombra la variable**. Hoy arranca contra `localhost`: éste es el RED |
| ARR-03 | API con `REDIS_URL` apuntando a un host muerto | Falla al arrancar o el healthcheck lo marca — pero el mensaje **menciona Redis**, no `maxRetriesPerRequest` |
| ARR-04 | Levantar el compose **sin** `src/api/.env` | Los ocho contenedores `healthy`. **La prueba de que el sistema ya no depende de un fichero fuera de git** |

## Rate limiting — el que no puede fallar en silencio

| # | Escenario | Esperado |
|---|---|---|
| RL-01 | Ráfaga contra un endpoint de auth | **429 real**, dentro del límite declarado (5–30 req/min) |
| RL-02 | El contador se comparte entre instancias | Está en Redis, no en memoria. Se comprueba que la clave existe en Redis tras la ráfaga |
| RL-03 | Endpoint global (100 req/min) | Sigue limitando |

> RL-01 es **criterio de aceptación duro**. El throttler defiende los endpoints de autenticación; si
> apuntara mal tras el cambio, la protección desaparecería sin que nada lo dijera — la forma exacta de
> F-34.

## Colas Bull — el otro cliente tocado

| # | Escenario | Esperado |
|---|---|---|
| Q-01 | Encolar una notificación real | Se consume; **el correo llega a Mailhog** |
| Q-02 | Log del API durante la operación | Sin `ECONNREFUSED`, sin `[ioredis] Unhandled error event` |

## Cerrojo distribuido — no se toca, pero se comprueba

| # | Escenario | Esperado |
|---|---|---|
| LOCK-01 | `distributed-lock.service.ts` sigue operando | Ya usaba `REDIS_URL`; el riesgo es la validación nueva de arranque |

## ADMIN — sesiones en Redis, no en memoria

| # | Escenario | Esperado |
|---|---|---|
| ADM-01 | ADMIN arranca | `healthy` |
| ADM-02 | La sesión sobrevive a un reinicio del proceso de ADMIN | **Está en Redis.** Es el defecto exacto de F-39, que ya se disfrazó una vez con un `catch` que decía «Redis unavailable» con Redis levantado |

## La guarda: `variables-de-entorno-declaradas.spec.ts`

| # | Escenario | Esperado |
|---|---|---|
| AC-01 | **RED inicial** | Falla, nombrando las variables leídas y no declaradas |
| AC-02 | **GREEN** tras alinear `.env.example` | Pasa |
| AC-03 | **Control** — variable leída y no declarada | **Falla** |
| AC-04 | **Control** — variable declarada y leída | Pasa |
| AC-05 | **Control** — excepción **con** motivo escrito (`NODE_ENV`) | Pasa |
| AC-06 | **Control** — excepción **sin** motivo | **Falla.** Una lista de excepciones sin razones se convierte en un cajón |

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **944** |
| REG-02 | e2e | **77** |
| REG-03 | Navegador | **176** — incluye el ciclo de pago real, que atraviesa colas y cerrojo |
| REG-04 | `lint` | 0 errores |

## Lo que NO se prueba aquí

- Comportamiento bajo fallo de Redis en caliente (reconexión, degradación). Es otro PT si se quiere.
- TLS (`rediss://`). D1 lo habilita como posibilidad; este PT no lo configura.
