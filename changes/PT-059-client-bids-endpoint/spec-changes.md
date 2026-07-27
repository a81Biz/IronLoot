# PT-059 — Spec changes
- CLIENT usa `GET /bids/my-active` (dashboard) y `GET /bids/my-history` (/my-bids) en vez de `/bids/my`.
- Modelo de vista bids: `{ items: BidView[] }`, `BidView = Bid & { isWinning: boolean }`.
- Documentación API: se elimina `GET /bids/my`; quedan `my-active` y `my-history`.
