# PT-058 — Evidencia y Self-Review

## Evidencia técnica
- **Test unitario** `wallet-view.spec.ts`: 3/3 PASS (mapeo `available→balance`, `held→held_funds`; `null`→`null`; path correcto). Suite CLIENT completa 6/6 PASS.
- **Build**: `npm run build` (nest build) sin errores.
- **Compilación en contenedor**: `dist/common/bff/wallet-view.js` presente tras rebuild.

## Evidencia funcional (navegador, comprador con balance=5000, held=0)
- `/wallet`: muestra **MXN 5000** (antes `MXN 0.00`). Screenshot `wallet_page.png`.
- `/auctions/:id`: **"saldo disponible: $5000 MXN"** (antes `$0`). Screenshot `auction_detail.png`.
- `/dashboard`: renderiza con saldo real. Screenshot `dashboard.png`.
- **error_events `/api/v1/wallet`**: delta = 0 durante la prueba (ya no hay 404; ahora usa `/wallet/balance`).

## Self-Review checklist
- [x] Criterio de aceptación (saldo real visible) verificado en 3 vistas.
- [x] Test scenarios del Proposal Package pasando.
- [x] Sin efectos colaterales (solo cambia origen del dato wallet; API/BD intactas).
- [x] Convenciones respetadas (Pattern 3 BFF; helper puro testeable; RULE-06 tests-first).
- [x] Commits atómicos trazables a PT-058.
- [x] Sin console.log/artefactos de depuración.
- [x] Documentación actualizada (API Catalog + endpoints).

## Estado: VALIDATION_PENDING (bug — cierre requiere validación humana)
