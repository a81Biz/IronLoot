# PT-036 — Tareas atómicas

Orden **tests-first** (RED antes de implementación). Cada tarea es un commit atómico traceable a PT-036.

| ID | Objetivo | Inputs | Outputs | Validación | Status |
|---|---|---|---|---|---|
| **PT-036.1** | Test RED: `validateStartupConfig` (función pura) rechaza creds admin default/vacío/placeholder en prod; las acepta si son válidas; no aplica en dev. | Reglas D2, API de la función pura D1 | `test/unit/config/validate-startup-config.spec.ts` | `npm test` → los nuevos tests **fallan** (RED) porque la función aún no existe/valida | DONE |
| **PT-036.2** | Test RED: e2e admin login → 429 tras superar 10/min; login válido OK; TOTP requerido si secret set. | D3, config throttler | `test/e2e/admin-auth.e2e-spec.ts` (o ampliación) | `npm run test:e2e` → **falla** (RED) | DONE |
| **PT-036.3** | Extraer `validateStartupConfig` a función pura testeable + mover `PLACEHOLDER_SECRETS`. | D1 | `common/config/validate-startup-config.ts`, `main.ts` actualizado | PT-036.1 tests de "acepta válidas" y "dev no aplica" pasan; build OK | DONE |
| **PT-036.4** | Implementar gate de credenciales admin (Gap A) en la función pura. | D2 | Reglas de user/pass en la función | PT-036.1 completo en **GREEN** | DONE |
| **PT-036.5** | Throttle en login admin (Gap B): quitar `@SkipThrottle` de la clase, `@Throttle` 10/60s en `login()`. | D3 | `admin-auth.controller.ts` | PT-036.2 en **GREEN**; ops de `AdminController` siguen sin throttle | DONE |
| **PT-036.6** | Comparación timing-safe de credenciales (Gap C). | D4 | `admin-auth.controller.ts` | Login válido/ inválido se comporta igual; test de credenciales OK | DONE |
| **PT-036.7** | Docs: `.env.example` (prod requiere ADMIN_USERNAME/PASSWORD no-default) + nota en checklist de despliegue. | D2 | `.env.example` (×2), referencia a `docs-v2/6-devops` | Revisión; sin código | DONE |

**Regla:** ninguna línea de código de producción antes del ACK del PROPOSAL GATE. Tests (PT-036.1/.2) se escriben primero y deben quedar en RED antes de PT-036.3+.
