# PT-036 — Evidencia de pruebas

**Fecha**: 2026-07-23 · **Rama**: `fix/PT-036-admin-auth-hardening` · **Tipo**: BUG (seguridad)

## 1. Tests-first — RED (antes de implementar)

`npx jest --testPathPattern="validate-startup-config"` con el módulo aún inexistente:

```
Test Suites: 1 failed, 1 total
Tests:       0 total
```
Causa: `Cannot find module '../../../src/common/config/validate-startup-config'` → compilación falla (RED esperado).

## 2. GREEN — tras implementación

`npx jest --testPathPattern="unit/(config|admin)" --no-coverage`:

```
PASS test/unit/config/validate-startup-config.spec.ts
PASS test/unit/admin/admin-auth.controller.spec.ts
Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
```

Cobertura de escenarios (ver `changes/PT-036-admin-auth-hardening/test-scenarios.md`):
- **A1–A7b** (gate de arranque): 8/8 ✓ — rechaza `admin`/vacío/placeholder en prod (user y pass), acepta válidas, no aplica en dev, conserva checks existentes (JWT/SESSION/ALLOWED_ORIGINS).
- **C1–C2 + variantes** (login timing-safe): 5/5 ✓ — creds correctas OK, password/usuario incorrectos → 401, defaults dev siguen autenticando, TOTP exigido si secret set.

## 3. Regresión — suite unit completa

`npx jest --no-coverage`:

```
Test Suites: 31 passed, 31 total
Tests:       166 passed, 166 total
```
Cero regresiones tras modificar `main.ts` y `admin-auth.controller.ts`.

## 4. Typecheck y Lint

- `npx tsc --noEmit` → **exit 0**.
- `npx eslint --fix` sobre los 6 archivos tocados → **exit 0** (formateo aplicado por prettier).
- Husky pre-commit (lint-staged + typecheck) ejecutado en cada commit → OK.

## 5. Gap B (throttle) — verificación e2e

Test `test/e2e/admin-auth.e2e-spec.ts` (B1: 429 tras 10/min) **escrito**. Requiere el harness e2e (Postgres + Redis) que corre en CI (job `test-integration`); **no ejecutado en esta sesión** por no disponer de infraestructura levantada. Verificación estática complementaria: `@Throttle({default:{limit:10,ttl:60000}})` aplicado a `login()` y `@SkipThrottle` de clase eliminado (typecheck OK).

## 6. Commits

```
930fded docs: PT-036 document required admin credentials in .env.example
37607e6 fix: PT-036 gate admin credentials at startup and throttle admin login
075ad7f test: PT-036 add admin startup-gate and login-throttle tests
```
Atómicos, convención `test/fix/docs: PT-036`, trazables a AUD-004.
