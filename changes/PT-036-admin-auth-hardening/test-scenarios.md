# PT-036 — Escenarios de prueba

Verifican los criterios de aceptación de `PLAN_ACTUAL.md §8`. Tests-first: se escriben en RED (PT-036.1/.2) antes de implementar.

## A — `validateStartupConfig` (unit, función pura)

| # | Given | When | Then |
|---|---|---|---|
| A1 | `env='production'`, `ADMIN_PASSWORD='admin'` | valida | error contiene "ADMIN_PASSWORD" (default no permitido) |
| A2 | `env='production'`, `ADMIN_PASSWORD=''` | valida | error (vacío) |
| A3 | `env='production'`, `ADMIN_PASSWORD='change-me'` (placeholder) | valida | error (placeholder) |
| A4 | `env='production'`, `ADMIN_USERNAME='admin'` | valida | error (username default) |
| A5 | `env='production'`, creds válidas + resto de secretos válidos | valida | **sin errores** |
| A6 | `env='development'`, creds default | valida | **sin errores** (gate no aplica) |
| A7 | Regresión: `ADMIN_API_KEY`/`JWT_SECRET`/`SESSION_SECRET`/`ALLOWED_ORIGINS` inválidos | valida | siguen produciendo sus errores existentes |

## B — Throttle login admin (e2e)

| # | Given | When | Then |
|---|---|---|---|
| B1 | App levantada, creds válidas | 11 POST `/api/v1/admin/auth/login` en <60s | el nº 11 responde **429** |
| B2 | creds válidas (+ TOTP si aplica) dentro del límite | POST login | **200** con `access_token` |
| B3 | creds inválidas | POST login | **401** (y throttle cuenta el intento) |
| B4 | `ADMIN_TOTP_SECRET` set, sin `totp` | POST login | **401** "TOTP code required" (sin cambios) |

## C — Comparación timing-safe (unit)

| # | Given | When | Then |
|---|---|---|---|
| C1 | password correcta | login | 200 (comportamiento preservado) |
| C2 | password incorrecta de distinta longitud | login | 401 sin excepción por longitud |

## D — Regresión (Graphify-informada)

| # | Given | When | Then |
|---|---|---|---|
| D1 | JWT admin válido | GET operación de `AdminController` en ráfaga | **no** hay 429 (sigue `@SkipThrottle`, fuera de alcance) |
| D2 | Guards admin (dual/jwt/apikey) | validar token post-login | comportamiento sin cambios |
