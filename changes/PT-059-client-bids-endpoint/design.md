# PT-059 — Design
## Decisión
Helper puro `mapBidsList` + rutas reales `my-active` (dashboard) y `my-history` (/my-bids). El controlador
CLIENT mapea `Bid[]` → `{items: BidView[]}` y deriva `isWinning`.
## Contrato
- API: `GET /bids/my-active` y `GET /bids/my-history` → `Bid[]` con `auction {id,title,slug,currentPrice,endsAt,images,status}` (`bids.controller.ts:54,65`).
- Plantilla `bids/my.html`: `bids.items[]`, `bid.amount`, `bid.auction.title`, `bid.auction.currentPrice`, `bid.isWinning`.
- Mapeo: `{items: raw ?? []}`; `isWinning = Number(bid.amount) === Number(bid.auction?.currentPrice)`.
## Racional
Endpoints correctos ya existen. `isWinning` no lo da la API; se deriva barato en el mapper. Helper puro testeable (RULE-06), Pattern 3.
