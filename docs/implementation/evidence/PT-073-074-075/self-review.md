# Self-Review — PT-073 / PT-074 / PT-075 (fiabilidad del harness QA)

**Tipo**: 3 BUGS de harness (TRIVIAL, sólo `tests/qa-browser-suite/`). Ningún código de producto modificado.

## Root cause (evidencia, no opinión)
- **PT-073**: `curl POST /payments/initiate` → `{"redirectUrl":"https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=..."}` (201).
  El producto es correcto; el test leía el body por evento de respuesta compitiendo con `window.location→abort`.
- **PT-074**: `31-outbid.cjs` re-ejecuta E2E-6 sobre estado ya en 700 (líder=comprador2) → 400 esperado. Outbid ya cubierto por E2E-6 de 30-e2e.
- **PT-075**: E2E-3 aseveraba ACTIVE antes de activar una subasta aún PUBLISHED (precondición temporal válida).

## Fixes
- PT-073: `10-bootstrap.cjs` — verificación determinista con `page.evaluate(fetch(...))` (sin submit/navegación).
- PT-074: `run-all.sh` — quitar `31-outbid.cjs` de la secuencia (se conserva standalone).
- PT-075: `30-e2e.cjs` — activar PUBLISHED→ACTIVE antes de aseverar E2E-3. También `run-all.sh`: normalizar OUT a forward-slashes.

## Evidencia por ejecución (run 20260724-232401, tras reset de BD)
smoke 57/57 · **bootstrap 13/13** (QA-BOOT-10b PASS, redirectUrl=true) · authed 41/41 · **e2e 5/5** (E2E-3 ACTIVE, E2E-6 outbid OK) ·
extras 16/16 · admin-writes 4/4 · withdrawal 12/12. **Suite 100% verde.**

## Checklist
- [x] Root cause con evidencia directa (curl / análisis de orquestación)
- [x] Sólo harness QA; producto intacto (verificado)
- [x] Suite verde tras reset (ejecución = evidencia)
- [x] Sin artefactos de depuración; commits atómicos por PT
- [x] Documentado en DISCOVERY.md; sin regresión (cobertura outbid preservada)
