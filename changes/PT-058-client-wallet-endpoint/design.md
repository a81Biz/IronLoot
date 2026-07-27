# PT-058 — Design

## Decisión
Centralizar la lectura del saldo en un helper puro `mapWalletBalance` y llamar al endpoint real
`GET /api/v1/wallet/balance`. El controlador CLIENT mapea la respuesta al modelo que esperan las plantillas.

## Contrato
- API real: `GET /api/v1/wallet/balance` → `{ available:number, held:number, currency:string, isActive:boolean }`
  (`src/api/src/modules/wallet/wallet.controller.ts:46`).
- Plantillas esperan: `wallet.balance`, `wallet.held_funds` (dashboard.html:7/11, wallet.html:7/11, auction/detail.html:17).
- Mapeo: `balance ← available`, `held_funds ← held`, `currency`, `isActive`. Si `raw` es falsy → `null`
  (las plantillas ya manejan `null` con `default('0.00')`).

## Racional
Endpoint correcto ya existe; añadir alias en API sería redundante. Mapear en 3 plantillas dispersaría lógica.
Un helper puro es testeable directamente (patrón `inject-auth-header`), cumple RULE-06 y Pattern 3 (Conventions).
