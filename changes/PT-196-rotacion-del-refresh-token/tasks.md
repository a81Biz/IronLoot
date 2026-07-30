# PT-196 — tasks.md

**Tests-first.** Cada tarea que toca comportamiento escribe su prueba en RED antes que el código.
Estado inicial de todas: `PENDING`. **Las doce cerradas el 2026-07-30.**

> **El orden no es negociable.** Las tareas del CLIENT van **antes** que la rotación. Si el API rotara
> primero, cada usuario perdería la sesión en su segundo refresco (D-6). El paso del CLIENT es inocuo
> por sí solo —escribir una cookie con el mismo valor que ya tenía—, y por eso se puede desplegar
> separado.

---

## Bloque 1 — El CLIENT persiste el token nuevo (se despliega primero)

### PT-196.1 — Helper de cookies de sesión
**Objetivo**: `common/auth/escribir-cookies-de-sesion.ts` — escribe `access_token` y `refresh_token`
con sus vidas respectivas y **las mismas opciones que BASE**.
**Validación**: prueba de que las dos cookies se escriben con `httpOnly`, el `sameSite` y el `domain`
esperados, y con `VIDA_ACCESO_MS` / `VIDA_REFRESCO_MS`. Un `domain` distinto crearía una **segunda**
cookie en vez de sustituir la primera — el fallo que se ve como «a veces funciona».
**Estado**: DONE

### PT-196.2 — El guard lo usa
**Objetivo**: `ClientAuthGuard` escribe **las dos** cookies tras refrescar.
**Validación**: token expirado + refresco que devuelve un `refreshToken` **distinto** → la cookie
`refresh_token` lleva el nuevo. **Hoy este caso falla**, y es el que impide que PT-196 eche a todos.
**Estado**: DONE

### PT-196.3 — El interceptor del proxy lo usa
**Objetivo**: lo mismo en `reintentar-tras-refresco.ts`.
**Validación**: 401 + refresco con token distinto → las dos cookies escritas.
**Estado**: DONE

---

## Bloque 2 — El esquema

### PT-196.4 — Migración aditiva
**Objetivo**: `previous_refresh_token` (anulable, `@unique`) y `rotated_at` (anulable) en `sessions`.
**Validación**: `npm run db:migrate` aplica; `npm run audit:schema` sin deriva. **Migración, nunca
`db push`** (RULE-10 / H-014).
**Estado**: DONE

### PT-196.5 — Las sesiones existentes sobreviven
**Objetivo**: comprobar `CA-8` contra la base real.
**Validación**: una sesión creada **antes** de la migración refresca sin error y queda con
`previousRefreshToken` poblado. Es la prueba de que la migración no echa a nadie.
**Estado**: DONE

---

## Bloque 3 — La rotación (lo último que se activa)

### PT-196.6 — Los cuatro casos
**Objetivo**: reescribir `refreshToken()` según D-2, con `FOR UPDATE` sobre la fila (D-3).
**Validación**, cuatro casos y su orden:
- token vigente → rota; el anterior queda guardado;
- anterior **dentro** de la gracia → devuelve los vigentes, **sin** rotar;
- anterior **fuera** de la gracia → revoca y lanza;
- desconocido → `TokenInvalidException`, como hoy;
- y que **revocada/expirada se comprueban antes** que el reuso, o el registro se llena de ruido.
**Estado**: DONE

### PT-196.7 — Rotar y entregar, una transacción
**Objetivo**: D-3.
**Validación**: con la escritura fallando, **no** se entrega token nuevo y el anterior sigue valiendo.
**Estado**: DONE

### PT-196.8 — El reuso es un evento de seguridad
**Objetivo**: D-4 — registrar con las **dos** IP y los **dos** `userAgent`.
**Validación**: al detectar reuso queda un registro distinguible de un 401, con las dos puntas. Sin
esto se paga el coste de rotar sin obtener el beneficio.
**Estado**: DONE

### PT-196.9 — `ROTATION_GRACE_SEC`, sin reserva
**Objetivo**: variable obligatoria (RULE-17), 30 s en `.env.example` y `docker-compose`.
**Validación**: sin ella, el API **aborta nombrándola**. Un valor silencioso aquí sería o expulsar por
carreras (0) o una ventana que nadie decidió.
**Estado**: DONE

### PT-196.10 — El logout revoca los dos tokens
**Objetivo**: comprobar que `revokedAt` en la fila cubre vigente y anterior.
**Validación**: tras el logout, **ninguno** de los dos revive la sesión (`CA-6`).
**Estado**: DONE

---

## Bloque 4 — Cierre

### PT-196.11 — Guarda
**Objetivo**: `refresco-rota-y-detecta-reuso.spec.ts` — que la comprobación de revocación preceda a la
de reuso, que la rotación vaya bajo transacción con bloqueo, y que la gracia no tenga reserva.
**Validación**: casos de control en los dos sentidos y **vista fallar** con sabotaje dirigido, con el
script **afirmando que el sabotaje se aplicó** (lección de PT-194).
**Estado**: DONE

### PT-196.12 — Evidencia y registros
**Objetivo**: la carpeta de evidencia de este PT con la ejecución real —un reuso detectado contra la
base, no supuesto—, `self-review.md`, `HISTORY.log` (`VALIDATION_PENDING`), ADR de la rotación,
`PENDING_TASKS` y `HANDOFF`.
**Estado**: DONE

---

## Orden

**1 → 2 → 3** · **4 → 5** · **6 → 7 → 8 → 9 → 10** · **11 → 12**

Los bloques 1 y 2 son **inocuos por separado**: el CLIENT escribe una cookie con el mismo valor que ya
tenía, y las columnas nuevas están vacías. El bloque 3 es el que cambia el comportamiento, y va
**después** de que los otros dos estén verificados.
