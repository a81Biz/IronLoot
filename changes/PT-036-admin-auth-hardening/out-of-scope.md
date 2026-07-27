# PT-036 — Fuera de alcance (exclusiones explícitas)

Este PT corrige **solo** AUD-004 (creds admin default + login sin throttle). Quedan **fuera**:

1. **Reingeniería de la autenticación admin** (tabla de usuarios, bcrypt, múltiples admins, rotación). Es un cambio MAYOR con ADR nueva → candidato a PT propio. Relacionado con ADR-005 y el rol único admin.
2. **Throttle de `AdminController`** (~60 operaciones admin, `@SkipThrottle` a nivel de clase). Graphify: grado **80** (god-object). Throttlear esas operaciones es una decisión aparte con radio grande → backlog (anotado en `FDGE_HALLAZGOS_TRACKER.md`).
3. **Roles/permisos admin granulares** (finanzas vs moderación). Es AUD relacionado con el modelo de rol único; no aquí.
4. **CSP/CSRF del backoffice** (AUD-007) — PT independiente.
5. **`ADMIN_API_KEY=dev-admin-key`**: ya está gateado en producción (`main.ts:24-26`); no requiere cambio en este PT.
6. **`ADMIN_SESSION_SECRET`/`JWT_SECRET` débiles en el frontend admin** (AUD-026/010): otros PT.
7. **Cambios de UI** del login admin: no se tocan plantillas.

Cualquier hallazgo tocado tangencialmente se registra pero no se corrige aquí.
