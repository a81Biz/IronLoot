# Matriz de Hallazgos QA Navegador → FDGE (2026-07-24, run2)

**Origen:** corrida QA visual por navegador desde cero (`qa-out/20260724-135340/HALLAZGOS.md`).
**Propósito:** no perder ningún hallazgo durante su paso por FDGE. Se procesa **un PT a la vez** (STATE 1→7).
Este archivo se actualiza (overwrite del STATE/Status) en cada transición. La traza detallada vive en
`DISCOVERY.md`, `PLAN_ACTUAL.md`, `changes/[PT]/`, `HISTORY.log`.

**Estados:** `PENDIENTE` · `STATE 1..7` · `VALIDATION_PENDING` · `CLOSED` · `DONE`.
**Regla vinculante:** los BUG **no se auto-cierran** — terminan en `VALIDATION_PENDING` (validación humana).

## Cola de procesamiento (en orden)

| # | Hallazgo | Sev | Tipo FDGE | Complejidad | PT | STATE 1 | STATE actual | Status | Destino |
|:--:|---|:--:|---|---|:--:|:--:|:--:|---|---|
| 1 | **BUG-QA-N01** — CLIENT llama `GET /api/v1/wallet` (404); saldo no se muestra | ALTA | BUG | STANDARD | **PT-058** | 1-B | **CLOSED** | **CLOSED** | ✅ fusionado a master (89ececb) |
| 2 | **BUG-QA-N02** — CLIENT llama `GET /api/v1/bids/my` (404); pujas no se listan | ALTA | BUG | STANDARD | **PT-059** | 1-B | **CLOSED** | **CLOSED** | ✅ fusionado a master (89ececb) |
| 3 | **OBS-02** — `console.error` por favicon 404 y 401 esperado en verify-email | BAJA | BUG | TRIVIAL | **PT-060** | 1-B express | **CLOSED** | **CLOSED** | ✅ fusionado a master (89ececb) |
| 4 | **OBS-01** — onboarding habilita vendedor sin submission KYC (gap diseño↔impl) | BAJA | INVESTIGATION | STANDARD | **PT-061** | 1-B invest | **STATE 6** | **CLOSED** | 📋 documentado; candidato FPGE |
| 5 | **PT-051** — Broadcast de notificaciones admin (re-verificación) | — | INVESTIGATION | TRIVIAL | **PT-062** | 1-B invest | **STATE 6** | **CLOSED** | ✅ validado (API+UI, SENT, 3 recip) |

## Fuera del pipeline de FDGE de código

| Hallazgo | Motivo | Tratamiento |
|---|---|---|
| **OBS-03** — API mantiene pool Prisma muerto tras `prisma migrate reset` | No es defecto de producto; afecta solo QA/CI desde cero | Nota de tooling (ya en `HALLAZGOS.md`); no genera PT de código |

## Detalle técnico por PT (referencia de arranque, no sustituye STATE 1)

### PT-058 — BUG-QA-N01 (wallet 404)
- **Ubicación:** `src/apps/client/src/app.controller.ts` líneas 35 (dashboard), 86 (`/wallet`), 206 (detalle subasta).
- **Causa:** llama `/api/v1/wallet` (inexistente). Ruta real: `/api/v1/wallet/balance` → `{available, held, currency, isActive}`.
- **Complejidad:** requiere **mapeo** — plantillas esperan `wallet.balance` / `wallet.held_funds` (no `available`/`held`).
- **Verificación:** `wallet/balance` 200 en API; dashboard/wallet/detalle muestran saldo real; test-first sobre el path/mapeo.

### PT-059 — BUG-QA-N02 (bids/my 404)
- **Ubicación:** `src/apps/client/src/app.controller.ts` líneas 36 (dashboard), 65 (`/my-bids`).
- **Causa:** llama `/api/v1/bids/my` (inexistente). Rutas reales: `/api/v1/bids/my-active` (dashboard) y `/api/v1/bids/my-history` (paginado).
- **Complejidad:** requiere mapeo — `bids/my.html` espera `bids.items[]` con `bid.auction.title`/`currentPrice`/`isWinning`.

### PT-060 — OBS-02 (console.error cosméticos)
- favicon 404 (añadir favicon/ruta) + manejar 401 esperado en `verify-email` sin log a consola.

### PT-061 — OBS-01 (onboarding sin KYC) — INVESTIGACIÓN
- Determinar diseño intencionado (¿KYC obligatorio antes de vender?). **No** se implementa gate especulativo
  (sería FEATURE MAJOR con decisión de producto). Se documenta hallazgo + recomendación → decisión humana.

### PT-062 — PT-051 broadcast — INVESTIGACIÓN
- Re-ejercitar broadcast de notificaciones admin end-to-end; si falla → reclasificar a BUG.

## Cierre de la matriz

**2026-07-24** — Matriz procesada 100%. PT-058/059/060 **fusionados a master** (merge `89ececb`, --no-ff) y CLOSED tras autorización humana. PT-061/062 CLOSED (investigación). Ramas `fix/PT-058→060` eliminadas. Master: tests CLIENT 10/10, build OK.
