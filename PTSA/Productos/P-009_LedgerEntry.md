---
producto_id: P-009
nombre: Ledger Entry — Entrada de ledger
clase: secundario
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

# P-009 — Ledger Entry (Entrada de ledger)

## Descripción
Una entrada de ledger es el registro inmutable de cada cambio de balance en un monedero. Es el producto secundario más crítico: sin él, la trazabilidad financiera es imposible. El ledger es solo-append (nunca se actualiza ni elimina). Los tipos son: DEPOSIT, WITHDRAWAL, HOLD_BID, RELEASE_BID, DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM, REFUND, ADJUSTMENT.

**Alimenta a:** P-005 (Wallet Transaction)

## Fuente de generación
- **Servicio:** `WalletService` → `prisma.ledger.create()`
- **Tabla:** `ledger`

## Cadena de trazabilidad
```
P-009 Ledger Entry
  ← prisma.ledger.create() [transformación]
  ← WalletService.[deposit|withdraw|holdFunds|etc]() [servicio]
  ← Reglas: CR-003 (toda operación genera entry), tipo correcto para cada operación, importes en MXN Decimal(10,2)
  ← Fuente: wallets WHERE id=? (walletId obligatorio)
  ← Acción sistema: disparada por toda operación de wallet
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| CR-003: toda operación de wallet crea entry (nunca omitida) | ⏳ Pendiente F6 | — |
| Tipo de ledger correcto por operación (HOLD_BID para bids, DEPOSIT para depósitos, etc.) | ⏳ Pendiente F6 | — |
| Importe en Decimal(10,2), nunca Float | ⏳ Pendiente F5/F6 | — |
| walletId presente (no null) en toda entry | ⏳ Pendiente F6 | — |
| Ledger solo-append: sin UPDATE ni DELETE sobre `ledger` table | ⏳ Pendiente F5 | — |

## Estado de validación
`BORRADOR` — pendiente F5/F6
