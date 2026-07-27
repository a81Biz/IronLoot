# PT-038 — Self-Review (STATE 5)

**Fecha**: 2026-07-23 · **Origen**: AUD-003

## Checklist FDGE

- [x] **Criterios de aceptación (`PLAN_ACTUAL.md §7`)?**
  1. Escritura autenticada llega al API con `Bearer` → proxy inyecta header (unit A1) + espeja BASE. *(e2e runtime pendiente de entorno.)*
  2. Las 8 plantillas: path relativo + método/ruta del API → **0 mismatches** (B1/B2).
  3. Lecturas server-side (`apiGet`) intactas → sin regresión.
  4. El token nunca se expone al JS (sigue en cookie HttpOnly; el proxy lo inyecta server-side).
  5. `tsc` + `nest build` verdes.
- [x] **Escenarios del Proposal Package?** A (unit) y B/C verdes; D (e2e) pendiente de entorno.
- [x] **Sin efectos colaterales?** Cambio contenido al portal CLIENT; API/dominio/BASE/ADMIN no tocados; lecturas intactas.
- [x] **Convenciones?** Función pura en `common/bff/` (patrón PT-036); proxy espeja BASE 1:1 (`pathRewrite`, `changeOrigin`, `on.proxyReq`).
- [x] **Commits atómicos, con convención, traceables?** Sí (test/fix: PT-038). Rutas correctas esta vez (aprendido de PT-037).
- [x] **Sin artefactos de depuración?** Sí. Script de consulta Graphify en scratchpad (fuera del repo).
- [x] **Documentación si cambió comportamiento?** docs-v2 (RF-UI-06, Registro AUD-003, UC-08/09/11/12/16, ADR-003) se actualiza en STATE 7.

## Notas de diseño
- CLIENT no necesita el `responseInterceptor` de BASE (que convierte tokens de login en cookies): el login ocurre en BASE. El proxy de CLIENT es solo de reenvío + inyección de `Bearer`.
- CLIENT ya tenía `http-proxy-middleware` y `csrf-csrf` como dependencias; solo se cableó el proxy. (CSRF sigue sin usarse — AUD-014, fuera de alcance.)

## Alcance respetado
Fuera de alcance (no tocado): AUD-002 (UI de puja), CSRF (AUD-014), ADMIN, suite de tests completa del frontend. Registrado en `out-of-scope.md`.

## Veredicto
Proxy BFF cableado y unit-testado; 8 escrituras corregidas y verificadas contra el catálogo de API; build/tsc verdes. Pendiente: validación humana (BUG) e idealmente el e2e con el stack levantado.
