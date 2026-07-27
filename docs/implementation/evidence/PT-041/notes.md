# PT-041 — Evidencia (AUD-009, AUD-011)

- **bids unit**: 5/5 (incluye el nuevo "reject a bid below currentPrice + minimum increment").
- **Regresión API unit**: 29 suites / 154 tests, todo verde.
- **tsc --noEmit** (API): exit 0.
- AUD-009: incremento configurable ahora efectivo (antes solo `> currentPrice`).
- AUD-011: `assertAuctionModifiable` en approve/reject/suspend/force-close → 400 si la subasta está CLOSED/CANCELLED. Decisión documentada: los overrides admin (p. ej. reject→DRAFT, force-close desde PUBLISHED) son intencionales y quedan fuera de la FSM buyer/seller; el guard sólo evita re-moderar subastas ya finalizadas.
