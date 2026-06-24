# PT-033 — Design: Auth Email Links

**PT**: PT-033  
**Fecha**: 2026-06-23  
**Tipo**: BUG STANDARD  
**Branch**: `fix/PT-033-auth-email-links`

---

## Decisión central: usar `BASE_URL` en EmailService

### Contexto

`EmailService` construye las URLs que se incluyen en los emails transaccionales de auth:
- `${frontendUrl}/auth/verify-email?token=<token>`
- `${frontendUrl}/auth/reset-password?token=<token>`

Estas rutas **solo existen en BASE** (`src/apps/base/src/app.controller.ts:81,87`).
CLIENT no las tiene. El layout de CLIENT (`layouts/client.html`) incluye la barra lateral de forma
incondicional — cualquier 404 en CLIENT se muestra con sidebar.

### Por qué `BASE_URL` y no otra opción

| Opción | Razón del rechazo |
|---|---|
| `CLIENT_URL` (estado actual) | Apunta al portal privado (:5175) donde las rutas no existen |
| `APP_URL` (nueva var genérica) | `BASE_URL` ya está en uso y su semántica es exacta. Crear `APP_URL` introduce ambigüedad entre `BASE_URL`, `CLIENT_URL` y `APP_URL`. |
| Corregir solo docker-compose poniendo `CLIENT_URL=http://base.localhost` para el servicio api | El código queería `CLIENT_URL` y devolvería una URL de BASE — contradición semántica que confunde a futuros lectores y a herramientas de búsqueda. |
| Agregar redirects en CLIENT | CLIENT no debe conocer rutas de auth públicas. Viola separación de responsabilidades. |

**Decisión:** Cambiar `CLIENT_URL` → `BASE_URL` en `email.service.ts:17` y corregir el default de `5173` → `5174`.

---

## Decisión secundaria: registrar `NotFoundExceptionFilter` en BASE

### Contexto

`src/apps/base/src/common/filters/not-found.filter.ts` existe y es idéntico al de CLIENT.
`src/apps/client/src/main.ts:20` lo registra con `app.useGlobalFilters(new NotFoundExceptionFilter())`.
`src/apps/base/src/main.ts` no lo registra — fue un error de omisión durante el setup inicial de BASE.

### Por qué registrarlo ahora

- Las 404 en BASE actualmente devuelven un JSON de error de NestJS en lugar de una página HTML.
- BASE es el sitio público — los usuarios llegan a él directamente. Una respuesta JSON en lugar de una página HTML es experiencia de usuario incorrecta.
- El filtro ya existe y está testeado implícitamente (mismo código que CLIENT).
- Es un cambio de una línea con riesgo cero.

---

## Estrategia de commits atómicos

```
Commit 1: test: PT-033 email.service.spec.ts — RED tests para URL construction
Commit 2: fix: PT-033 EmailService usa BASE_URL para links de auth en emails
Commit 3: fix: PT-033 registrar NotFoundExceptionFilter en BASE
Commit 4: fix: PT-033 agregar BASE_URL al servicio api en docker-compose
Commit 5: docs: PT-033 documentar BASE_URL en .env.example
```

Commits 2, 3, 4 y 5 son lógicamente independientes. Se separan para mantener la trazabilidad
por tipo de cambio (código API, código BASE, infraestructura Docker, documentación).

---

## Consideración de datos (no-código)

Los usuarios que se registraron mientras el bug estaba activo permanecen en estado
`PENDING_VERIFICATION`. Esta corrección de código no los desbloquea retroactivamente.
Requieren una acción admin separada (re-envío de email de verificación).
**No está en scope de este PT** — se registra en `out-of-scope.md` y en `10-Technical-Debt.md`.

---

## Archivos modificados

| Archivo | Tipo de cambio | Risk |
|---|---|---|
| `src/api/src/modules/notifications/email.service.ts` | Fix 1 línea | BAJO |
| `src/api/test/unit/notifications/email.service.spec.ts` | Nuevo archivo | BAJO |
| `src/apps/base/src/main.ts` | Agregar 2 líneas (import + globalFilters) | BAJO |
| `docker-compose.yml` | Agregar 1 línea en bloque `api.environment` | BAJO |
| `.env.example` | Agregar 2 líneas (comentario + var) | BAJO |
