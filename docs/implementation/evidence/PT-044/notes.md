# PT-044 — Evidencia (AUD-002)

- **client tsc --noEmit**: exit 0. **nest build**: exit 0 (`dist/main.js`).
- **client jest**: 3/3 (injectAuthHeader).
- Ruta `GET /auctions/:id` añadida **después** de las rutas `/auctions/*` específicas (won-auctions/watchlist/create/:id/edit) para no ensombrecerlas.
- Página: detalle server-rendered (apiGet) + formulario de puja que hace `POST /api/v1/auctions/:id/bids` **relativo** → pasa por el proxy BFF (PT-038, fusionado) que inyecta el Bearer.
- Feed en vivo: `io(API + '/auctions')` → `joinAuction` + listeners `bid:new`/`auction:extended`/`auction:ended`.
- CSP de CLIENT: `scriptSrc` permite `https://cdn.socket.io`; `connectSrc` permite el origen del API y su equivalente `ws`.
- **Pendiente de entorno**: prueba end-to-end de pujar en vivo requiere CLIENT+API+DB+Redis levantados (no había stack).
- Nota: el hardening de WS (PT-039, rama aparte) es compatible; el `joinAuction` con auctionId real pasa la validación UUID.
