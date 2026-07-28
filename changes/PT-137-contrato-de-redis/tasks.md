# PT-137 — Tareas atómicas

**Prerequisito**: PT-136 cerrado (para que la guarda nueva se ejecute en CI).
Ninguna empieza antes del ACK del Proposal Gate.
**Regla**: `npm` no se ejecuta en el host (RULE-15).

---

## PT-137.1 — Medir la brecha real de variables

- **Objetivo**: saber cuántas y cuáles antes de escribir la guarda. El «49 vs 37» es un barrido crudo.
- **Entrada**: `src/api/src/**` (`process.env.X`, `config.get('X')`), `.env.example`.
- **Salida**: tabla `variable | leída en | declarada | ¿excepción justificada?`.
- **Validación**: cada variable no declarada tiene veredicto — se declara, o se documenta por qué es
  excepción. **Ninguna queda sin clasificar.**
- **Status**: PENDING

## PT-137.2 — RED: la guarda de variables declaradas

- **Objetivo**: una prueba que falle **hoy**.
- **Entrada**: PT-137.1; patrón de `coherencia-documentacion-codigo.spec.ts`.
- **Salida**: `src/api/test/unit/config/variables-de-entorno-declaradas.spec.ts`. Lista de excepciones
  **con motivo obligatorio**: una excepción sin motivo escrito hace fallar la prueba.
- **Validación**: falla, nombrando las variables no declaradas — entre ellas `REDIS_URL`.
- **Status**: PENDING

## PT-137.3 — RED: la prueba del arranque sin la variable

- **Objetivo**: demostrar que hoy **no** falla, que es el defecto.
- **Entrada**: el mecanismo `requiredEnv` de PT-126 (`JWT_SECRET`).
- **Salida**: prueba que exige que sin `REDIS_URL` el arranque aborte con un mensaje **que nombre la
  variable**.
- **Validación**: falla hoy — hoy arranca tan campante contra `localhost`.
- **Status**: PENDING

## PT-137.4 — GREEN: los dos clientes al contrato

- **Objetivo**: `app.module.ts` y `throttler-redis.module.ts` leen `REDIS_URL`.
- **Entrada**: D1 y D2 de `design.md`.
- **Salida**: los dos ficheros; `configuration.ts:33` acompaña. **Sin reserva a `localhost`.**
- **Validación**: PT-137.3 en verde. El API arranca con `REDIS_URL` y aborta sin ella.
- **Status**: PENDING

## PT-137.5 — El compose y el ejemplo, alineados

- **Objetivo**: que lo declarado y lo que funciona sean lo mismo.
- **Entrada**: `docker-compose.yml:43,90`, `.env.example:34,39`.
- **Salida**: `.env.example` con `REDIS_URL` activo y sin `REDIS_HOST`/`REDIS_PORT`; compose sin
  cambios (ya declara `REDIS_URL`). **`src/api/.env` deja de ser lo que sostiene el sistema.**
- **Validación**: PT-137.2 en verde. Levantar con el compose **sin** `src/api/.env` presente y ver el
  API `healthy`. Es la prueba de que ya no depende de un fichero fuera de git.
- **Status**: PENDING

## PT-137.6 — Casos de control de la guarda

- **Objetivo**: RULE-14, los dos sentidos.
- **Salida**: (a) variable leída y no declarada → **falla**; (b) leída y declarada → pasa;
  (c) excepción **con** motivo → pasa; (d) excepción **sin** motivo → **falla**.
- **Validación**: los cuatro.
- **Status**: PENDING

## PT-137.7 — ADMIN: revisar su reserva bajo D2

- **Objetivo**: `src/admin/src/main.ts:81` usa `REDIS_URL` con reserva `redis://redis:6379`.
- **Entrada**: la decisión D2. **Se mide antes de tocar**: ¿esa reserva ha salvado alguna vez algo, o
  es el mismo silencio de F-39 con otro valor?
- **Salida**: la reserva se retira o se justifica por escrito. Cualquiera de las dos, decidida con
  dato.
- **Validación**: ADMIN arranca y sus sesiones siguen en Redis, **no en memoria** — el defecto exacto
  de F-39, que ya se disfrazó una vez.
- **Status**: PENDING

## PT-137.8 — El 429 real

- **Objetivo**: demostrar que el rate limiting sigue vivo tras cambiarle el cliente.
- **Entrada**: entorno levantado.
- **Salida**: peticiones contra un endpoint de auth hasta **ver el 429**, capturado.
- **Validación**: el 429 aparece dentro del límite declarado (5–30 req/min). **Sin esto, el PT no está
  hecho aunque todo lo demás esté verde.**
- **Status**: PENDING

## PT-137.9 — Las colas, ejercidas

- **Objetivo**: Bull es el otro cliente tocado.
- **Salida**: encolar un trabajo real (una notificación) y verlo consumido; log del API sin
  `ECONNREFUSED`.
- **Validación**: el correo llega a Mailhog. La cola no es un detalle interno: es cómo salen los avisos.
- **Status**: PENDING

## PT-137.10 — Regresión, evidencia, registro

- **Salida**: 944 · 77 · 176 sin pérdidas · `docs/implementation/evidence/PT-137/` con el 429, el
  correo, y el arranque en los dos sentidos · `HISTORY.log` + `HANDOFF.md` · **F-135-A cerrado** en
  `PENDING_TASKS.md`.
- **Validación**: STATE 5 completo. Es un BUG: queda `VALIDATION_PENDING`.
- **Status**: PENDING
