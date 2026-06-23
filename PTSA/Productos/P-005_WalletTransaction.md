---
producto_id: P-005
nombre: Wallet Transaction — Transacción de monedero
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

# P-005 — Wallet Transaction (Transacción de monedero)

## Descripción
Una transacción de monedero es cualquier operación que modifica el balance o los fondos retenidos de un usuario: depósito, retiro, bloqueo de puja, liberación de puja, débito por pedido, crédito por venta. Cada operación DEBE generar una entrada inmutable en el ledger (P-009).

**Consumidor:** Comprador/Vendedor (balance actualizado), Sistema (disponibilidad de fondos para pujas).

## Fuente de generación
- **Servicios:** `WalletService.deposit()`, `WalletService.withdraw()`, `WalletService.holdFunds()`, `WalletService.releaseFunds()`, `WalletService.debitForOrder()`, `WalletService.creditForSale()`
- **Tablas:** `wallets` (balance, held_funds), `ledger`
- **Límites:** Depósito 10 req/min, Retiro 5 req/min; límite diario de retiro 5.000 MXN

## Cadena de trazabilidad
```
P-005 Wallet Transaction
  ← WalletService.[deposit|withdraw|holdFunds|releaseFunds|debitForOrder|creditForSale]() [transformación]
  ← WalletModule controller o llamado interno desde BidsService/PaymentsService [servicio]
  ← Reglas: CR-001 (balance ≥ 0), CR-002 (held_funds ≤ balance), CR-003 (ledger entry), CR-014 (retiro ≤ 5000 MXN/día), CR-010 (MXN)
  ← Fuente: wallets WHERE userId=?, payments para depósitos
  ← Acción usuario: depósito/retiro manual; o acción sistema: bid/order/payment events
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| CR-001: balance NUNCA negativo (ninguna operación debe dejarlo en < 0) | ⏳ Pendiente F6 | — |
| CR-002: held_funds ≤ balance en todo momento | ⏳ Pendiente F6 | — |
| CR-003: toda operación genera exactamente una entrada de ledger | ⏳ Pendiente F6 | — |
| CR-010: moneda = MXN; columnas usan Decimal(10,2) o Decimal(12,2) | ⏳ Pendiente F6 | — |
| CR-014: retiro diario ≤ 5.000 MXN | ⏳ Pendiente F6 | — |
| TD-003: mock de verificación de método de pago en retiro | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6

## Notas de coherencia inter-producto
- P-005 genera P-009 (Ledger Entry) obligatoriamente (CR-003)
- P-004 (Payment) crea P-005 (depósito)
- P-001 (Bid) crea P-005 (hold de fondos)
- P-002 (Auction Close) crea múltiples P-005 (release perdedores + debit ganador)
