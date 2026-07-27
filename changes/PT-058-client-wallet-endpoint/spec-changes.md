# PT-058 — Spec changes
- CLIENT deja de depender de `GET /api/v1/wallet` (inexistente) y usa `GET /api/v1/wallet/balance`.
- Modelo de vista `wallet` en CLIENT: `{ balance, held_funds, currency, isActive }` (derivado de `WalletBalanceDto`).
- Documentación de API: `08-API-Catalog.md` deja de listar `GET /wallet`; queda `GET /wallet/balance` como fuente del saldo.
