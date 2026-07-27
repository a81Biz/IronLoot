# PT-058 — Test scenarios
1. `mapWalletBalance({available:5000,held:700,currency:'MXN',isActive:true})` → `{balance:5000,held_funds:700,currency:'MXN',isActive:true}`.
2. `mapWalletBalance(null)` → `null`.
3. `mapWalletBalance(undefined)` → `null`.
4. `WALLET_BALANCE_PATH === '/api/v1/wallet/balance'`.
5. (E2E navegador) `/wallet` y `/dashboard` con saldo 5000 muestran `MXN 5000` (no `0.00`); detalle de subasta muestra saldo real.
