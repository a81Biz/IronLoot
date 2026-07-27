# PT-059 — Tasks
- **PT-059.1** Test (RED): `bids-view.spec.ts` — `mapBidsList` envuelve en `{items}`, deriva `isWinning`, `null`→`{items:[]}`; paths correctos.
- **PT-059.2** Impl (GREEN): `src/apps/client/src/common/bff/bids-view.ts`.
- **PT-059.3** Integrar en `app.controller.ts` (dashboard→my-active, /my-bids→my-history).
- **PT-059.4** Doc: corregir `08-API-Catalog.md` + `inventory/endpoints.md` (`/bids/my` → `my-active`+`my-history`).
- **PT-059.5** Evidencia: `/my-bids` lista pujas; 0 `Cannot GET /api/v1/bids/my`.
Estado final: PT-059.1..5 DONE (test 4/4, build OK, 2 call sites, docs corregidas, /my-bids lista la puja).
