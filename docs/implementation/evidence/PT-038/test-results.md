# PT-038 — Evidencia de pruebas

**Fecha**: 2026-07-23 · **Rama**: `fix/PT-038-client-bff-writes` · **Tipo**: BUG (MAJOR)

## 1. Tests-first — RED
`npx jest` en CLIENT con la función inexistente → `Cannot find module '../src/common/bff/inject-auth-header'`:
```
Test Suites: 1 failed, 1 total
Tests:       0 total
```
(Confirma también que la config jest mínima de CLIENT — antes sin tests — funciona.)

## 2. GREEN — `injectAuthHeader`
```
PASS test/inject-auth-header.spec.ts
  √ A1: inyecta Authorization: Bearer desde la cookie access_token
  √ A2: no inyecta header si no hay cookie access_token
  √ A3: no lanza si cookies es undefined
Tests: 3 passed, 3 total
```

## 3. Paridad de rutas (B1/B2) — verificación estática
- `grep "fetch(API +" src/apps/client/views/pages` → **0** (ninguna escritura cross-origin restante).
- Las 8 escrituras usan path **relativo** y método/ruta que **existen en el API** (`Catalogo-de-API`):

| Plantilla | Método/ruta |
|---|---|
| wallet/deposit | `POST /api/v1/wallet/deposit` |
| wallet/withdraw | `POST /api/v1/wallet/withdraw` |
| auction/create | `POST /api/v1/auctions` |
| auction/edit | `PATCH /api/v1/auctions/:id` |
| disputes/create | `POST /api/v1/disputes` |
| profile | `PATCH /api/v1/users/me` |
| settings | `PATCH /api/v1/users/me/settings` |
| seller/onboarding | `POST /api/v1/users/me/enable-seller` |

## 4. Build / typecheck (C1/C2)
- `tsc --noEmit` (CLIENT) → **exit 0** (el proxy y el helper compilan).
- `npm run build` (`nest build`) → **exit 0**.

## 5. E2E (D1) — pendiente de entorno
El smoke e2e (escritura autenticada → 2xx con `Bearer`) requiere CLIENT+API+DB levantados; **no ejecutado** en esta sesión (no había stack IronLoot arriba). Verificación estructural: el proxy espeja BASE (probado en producción) y la inyección de header está unit-testada.

## 6. Commits
```
6ade6b4 fix: PT-038 add BFF proxy to CLIENT and fix portal write actions
492aa79 test: PT-038 add jest config and injectAuthHeader unit test for CLIENT
```
Atómicos (`test:` / `fix:`), traceables a AUD-003.
