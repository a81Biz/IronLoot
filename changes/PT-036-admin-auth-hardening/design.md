# PT-036 — Design: Endurecer autenticación admin

**Tipo**: BUG (seguridad) · **Complejidad**: STANDARD · **Origen**: AUD-004
**Fuentes**: `DISCOVERY.md`/`CONTEXT_ANALYSIS.md` (PT-036), `PLAN_ACTUAL.md`, docs-v2 `RN-52`/`RN-53`/`ADR-005`/`ADR-017`, Graphify.

## Decisiones de arquitectura

### D1 — Extraer `validateStartupConfig` a una función pura testeable
Hoy vive inline en `src/api/src/main.ts` (grado Graphify 2) y llama a `process.exit(1)` internamente → no unit-testable.
**Decisión:** mover la lógica a `src/api/src/common/config/validate-startup-config.ts` como función **pura** `validateStartupConfig(config, env): string[]` que **devuelve** la lista de errores (sin salir). `main.ts` la invoca y, si hay errores, imprime y hace `process.exit(1)`.
**Rationale:** permite tests-first sobre las reglas de validación sin arrancar Nest ni matar el proceso. Radio mínimo (solo `bootstrap` la usa).

### D2 — Gate de credenciales admin (Gap A)
En la función pura, cuando `env==='production'`, añadir:
- `ADMIN_USERNAME`: no vacío y ≠ `'admin'`.
- `ADMIN_PASSWORD`: no vacío, ∉ `PLACEHOLDER_SECRETS`, y ≠ `'admin'`.
Errores accionables (mensajes propios). `PLACEHOLDER_SECRETS` se mueve junto a la función (o se exporta) para reutilizarse.

### D3 — Throttle en login admin (Gap B)
Quitar `@SkipThrottle()` de la clase `AdminAuthController` (`admin-auth.controller.ts:15`) y aplicar `@Throttle({ default: { limit: 10, ttl: 60000 } })` al método `login()`.
**Rationale:** el controlador solo tiene `login()`; alinear con `RN-52` (5–30/min en endpoints sensibles). `AdminController` (god-object, grado 80) **no se toca**.

### D4 — Comparación timing-safe (Gap C, endurecimiento)
Sustituir `body.username !== expectedUser || body.password !== expectedPass` por comparación con `crypto.timingSafeEqual` normalizando longitudes (hash intermedio o padding), preservando la semántica actual (usuario **y** contraseña deben coincidir; TOTP se mantiene igual).

## Componentes tocados
- `src/api/src/common/config/validate-startup-config.ts` — **nuevo** (función pura + PLACEHOLDER_SECRETS).
- `src/api/src/main.ts` — usar la función extraída.
- `src/api/src/modules/admin/admin-auth.controller.ts` — throttle + comparación timing-safe.
- `.env.example` (raíz + `src/api`) — documentar que en prod `ADMIN_USERNAME`/`ADMIN_PASSWORD` son obligatorios y no pueden ser default.
- Tests: `src/api/test/unit/config/validate-startup-config.spec.ts` (nuevo), e2e admin-auth throttle.

## No se toca (Graphify-informado)
`AdminController` (grado 80) y su `@SkipThrottle`; los guards admin (validan post-login); BD/esquema; `@ironloot/core`; auth de usuario.
