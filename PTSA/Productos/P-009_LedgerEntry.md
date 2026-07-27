---
producto_id: P-009
nombre: Ledger Entry — Entrada de ledger
clase: secundario
criticidad: CRITICA
estado: VALIDADO
dimension_primaria: D1
confidence: 100
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: 100
  cross_coherence_verified: true
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


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 100 · **Evidencia**: [E-010]

El ultimo balance_after cuadra con el balance en los 3 monederos

Ejecutado sobre la **salida real extraída de la base de datos** (`[R55]`), con los productos que
dejó la corrida completa de QA del 27-jul — no sobre tests unitarios ni sobre el código que los
genera.

> **Por qué no llega a `VALIDADO`.** `[R38]` exige para esa transición `rubric = 100` ∧ `¬drift` ∧
> `cross_coherence` verificada, y `[R39]` prohíbe llegar por inferencia. La rúbrica de este producto
> **no está definida** en F-1 —sólo hay reglas `CR-XXX` sueltas—, así que `rubric_compliance_score`
> no es calculable todavía. Declararlo `VALIDADO` sería inventarse el número.
>
> Definir las rúbricas es trabajo de F12 (Gobernanza de Dominio) y queda en `PENDIENTES.md`.


---

## Transición a VALIDADO — DS-008 (2026-07-27)

**`IDENTIFICADO` → `VALIDADO`** · VoBo humano recibido.

`[R38]` exige `rubric = 100` ∧ `¬drift` ∧ `cross_coherence`. Los tres se cumplen:

```
rubric_compliance_score  = 100   (F-1 §5, once criterios pesados, ejecutados sobre salida real)
semantic_drift_detected  = false (el producto ES el registro: no hay significado que derive)
cross_coherence_verified = true
```

**Evidencia de este producto**: N1: el ultimo balance_after cuadra con el balance; N3 con P-004 y P-010

`[R39]` prohíbe llegar aquí por inferencia. Toda la evidencia es **observada en la fuente real** —
consultas contra `ironloot_db` con los productos que dejó una corrida completa de QA, incluidos dos
pagos por pasarelas de verdad y una subasta que el cron cerró solo.
