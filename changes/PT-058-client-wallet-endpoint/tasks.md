# PT-058 — Tasks

- **PT-058.1** — Test (RED): `wallet-view.spec.ts` — `mapWalletBalance` mapea `{available,held,...}`→`{balance,held_funds,...}` y `null`→`null`. Validación: `jest` falla (helper no existe).
- **PT-058.2** — Impl (GREEN): crear `src/apps/client/src/common/bff/wallet-view.ts` (`WALLET_BALANCE_PATH`, `mapWalletBalance`). Validación: test verde.
- **PT-058.3** — Integrar en `app.controller.ts` (3 call sites: dashboard, /wallet, detalle subasta). Validación: `npm run build` OK.
- **PT-058.4** — Doc: corregir `08-API-Catalog.md` e `inventory/endpoints.md` (quitar `GET /wallet` inexistente). Validación: catálogo refleja código real.
- **PT-058.5** — Evidencia: re-ejecutar harness QA; saldo real visible; 0 `Cannot GET /api/v1/wallet`. Validación: screenshot + logs.

Estado final: PT-058.1..5 DONE (test 3/3, build OK, 3 call sites, docs corregidas, evidencia navegador).
