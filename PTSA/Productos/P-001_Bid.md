---
producto_id: P-001
nombre: Bid — Puja colocada
clase: primario
criticidad: CRITICA
estado: BORRADOR
dimension_primaria: D1
confidence: 0
audit_due: 2026-07-23
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: []
---

# P-001 — Bid (Puja colocada)

## Descripción
Una puja es el resultado de que un comprador coloca una oferta en una subasta activa. El producto incluye: validación de reglas de dominio (precio mínimo, propiedad), bloqueo de fondos en el monedero (`heldFunds += bid.amount`), liberación de fondos del pujador anterior si fue superado, actualización del precio actual de la subasta, broadcast WebSocket a todos los observadores, y persistencia en BD.

**Consumidor:** El comprador que pujó (confirmación de puja), otros usuarios (broadcast WebSocket de nuevo precio), y el sistema (para cierre de subasta).

## Fuente de generación
- **Endpoint:** `POST /api/v1/bids` (`src/api/src/modules/bids/bids.controller.ts`)
- **Servicio:** `BidsService.placeBid()` (`src/api/src/modules/bids/bids.service.ts`)
- **Tabla de salida:** `bids`, `wallets` (held_funds), `ledger`
- **Broadcast:** Socket.io gateway → evento de nuevo bid

## Cadena de trazabilidad
```
P-001 Bid
  ← BidsService.placeBid() [transformación]
  ← BidsModule.controller POST /bids [servicio]
  ← Reglas: CR-005 (no bid en propia subasta), CR-006 (bid > precio actual), CR-001/CR-002 (balance), CR-003 (ledger)
  ← Fuente: wallets WHERE userId=?, auctions WHERE id=?
  ← Acción usuario: Comprador envía POST /bids con { auctionId, amount }
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| CR-005: No bid en propia subasta → 400 BID_ON_OWN_AUCTION | ⏳ Pendiente F6 | — |
| CR-006: Bid > precio actual → 400 BID_TOO_LOW | ⏳ Pendiente F6 | — |
| CR-001: balance nunca negativo tras hold | ⏳ Pendiente F6 | — |
| CR-002: held_funds ≤ balance | ⏳ Pendiente F6 | — |
| CR-003: entrada de ledger tipo HOLD_BID creada | ⏳ Pendiente F6 | — |
| Liberación de fondos del pujador anterior (RELEASE_BID) | ⏳ Pendiente F6 | — |
| Broadcast WebSocket emitido tras puja exitosa | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6 (Domain Acid Test)

## Notas de coherencia inter-producto
- P-001 alimenta a P-002 (Auction Close): el ganador es el bid más alto al cierre
- P-001 depende de P-005 (Wallet Transaction): bloquea fondos antes de confirmar puja
- P-009 (Ledger Entry): debe generarse en la misma transacción que la puja
