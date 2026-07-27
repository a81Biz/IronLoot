# PT-039 — Evidencia (AUD-006)

- **tsc --noEmit** (API) → exit 0.
- Cambios: `auctions.gateway.ts` + `events.gateway.ts` validan `auctionId` con regex UUID antes de `client.join`; devuelven `{event:'error'}` si es inválido. Guard comentado retirado; comentario de diseño añadido.
- `bids.service.ts`: el payload `bid:new` ya **no** incluye `bidderName: userId` (se eliminó la fuga del UUID interno en el canal público).
- **Decisión de diseño (documentada):** no se exige JWT en el WS porque el feed es público (bids públicos por REST) y romperia la vista en vivo de invitados; el hardening es validación de entrada + no-PII. El humano puede endurecer a JWT-requerido si lo prefiere.
- Validación runtime (conexión WS real) opcional; no había stack levantado.
