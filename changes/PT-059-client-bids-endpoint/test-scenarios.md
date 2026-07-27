# PT-059 — Test scenarios
1. `mapBidsList([{amount:700, auction:{currentPrice:700,title:'X'}}])` → `{items:[{...,isWinning:true}]}`.
2. `mapBidsList([{amount:600, auction:{currentPrice:700}}])` → `isWinning:false`.
3. `mapBidsList(null)` → `{items:[]}`.
4. `MY_ACTIVE_BIDS_PATH==='/api/v1/bids/my-active'`, `MY_BIDS_HISTORY_PATH==='/api/v1/bids/my-history'`.
5. (E2E) `/my-bids` del comprador con 1 puja muestra la fila (título, monto).
