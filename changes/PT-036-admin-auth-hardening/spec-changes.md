# PT-036 — Cambios de especificación

## Reglas de negocio afectadas (docs-v2)

| Regla | Antes (estado real) | Después (PT-036) |
|---|---|---|
| **RN-53** (puerta de secretos en prod) | Parcial: gatea `ADMIN_API_KEY`, `JWT_SECRET`, `SESSION_SECRET`, `ALLOWED_ORIGINS`; **omite** `ADMIN_USERNAME`/`ADMIN_PASSWORD`. | Completa para admin: también gatea `ADMIN_USERNAME`/`ADMIN_PASSWORD` (no vacío, no default `admin`, no placeholder) en producción. |
| **RN-52** (rate limiting) | Login admin `@SkipThrottle()` → sin límite. | Login admin limitado a **10/min** (`@Throttle` en `login()`). Global 100/min y estrictos de auth de usuario sin cambios. |
| **ADR-005** (auth admin sesión) | Credenciales estáticas por env con defaults usables. | Igual mecanismo, pero defaults **inutilizables en producción** por el gate. Reingeniería (bcrypt/tabla) queda como deuda/PT futuro. |

## Configuración / entorno

- `.env.example` (raíz y `src/api`): documentar que en **producción** `ADMIN_USERNAME` y `ADMIN_PASSWORD` son **obligatorios** y no pueden ser `admin`/placeholder (si no, el arranque falla). En desarrollo siguen con default.

## Contrato de API

- `POST /api/v1/admin/auth/login`: nuevo comportamiento **429 Too Many Requests** al superar 10 intentos/min. Respuestas 200/401 sin cambios. TOTP sin cambios.

## Documentación a actualizar en STATE 7

- `docs-v2/transversal/Catalogo-Maestro-de-Reglas.md` (RN-52/RN-53 → estado corregido para admin).
- `docs-v2/6-devops/CI-CD-Observabilidad-y-Operacion.md` (checklist: credenciales admin obligatorias).
- `docs-v2/transversal/Registro-de-Hallazgos.md` (AUD-004 → VALIDATION_PENDING/CLOSED según validación).
