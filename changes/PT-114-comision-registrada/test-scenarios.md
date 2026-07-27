# PT-114 — test-scenarios.md

| ID | Escenario | Esperado |
|---|---|---|
| CM-01 | Cerrar una subasta con ganador | Existe **un** `CommissionRecord` para ese pedido |
| CM-02 | El importe del registro frente al asiento `FEE_PLATFORM` | **Coinciden al céntimo** |
| CM-03 | Cerrar dos veces el mismo pedido | **Un solo** registro (idempotente) |
| CM-04 | El registro falla dentro de la transacción | **Ningún** asiento queda: se deshace todo |
| CM-05 | `ratePercent` del registro | El mismo `feePercent` que se usó para asentar |
| CM-06 | `calculateForOrder()` sigue funcionando para reconstruir | Crea el registro si no existe |

## Regresión

| ID | Escenario | Esperado |
|---|---|---|
| R-01 | Fase `e2e` de la suite (puja → cierre → liquidación) | 5/5 |
| R-02 | Suite completa | Sin fases nuevas en rojo |
| R-03 | `npm test` | Verde |
