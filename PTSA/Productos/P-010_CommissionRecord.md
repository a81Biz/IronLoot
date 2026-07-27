---
producto_id: P-010
nombre: Commission Record — Registro de comisión
clase: secundario
criticidad: MEDIA
estado: REQUIERE_REVISION
dimension_primaria: D1
confidence: 0
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: [H-010]
---

# P-010 — Commission Record (Registro de comisión)

## Descripción
Un registro de comisión documenta la comisión de plataforma aplicada a cada pedido completado. La tasa puede ser global, por categoría o por vendedor. Estado: PENDING → COLLECTED.

**Alimenta a:** P-003 (Order)

## Fuente de generación
- **Servicio:** `CommissionsService.record()`
- **Tablas:** `commission_records`, `commission_config`

## Cadena de trazabilidad
```
P-010 Commission Record
  ← CommissionsService.record() [transformación]
  ← OrdersService (tras crear pedido) [servicio]
  ← Reglas: tasa aplicable según CommissionConfig (GLOBAL/CATEGORY/SELLER)
  ← Fuente: commission_config WHERE type=?, orders.totalAmount
  ← Acción sistema: automático al crear pedido
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| Comisión calculada sobre el importe correcto del pedido | ⏳ Pendiente F6 | — |
| Tasa aplica correctamente (global > categoría > vendedor en cascada) | ⏳ Pendiente F6 | — |
| Estado inicial = PENDING | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`REQUIERE_REVISION`** · **Confidence**: 0 · **Evidencia**: [E-013]

H-010: el producto NO SE GENERA. 0 registros frente a 95.00 MXN cobrados

Ejecutado sobre la **salida real extraída de la base de datos** (`[R55]`), con los productos que
dejó la corrida completa de QA del 27-jul — no sobre tests unitarios ni sobre el código que los
genera.

> **Por qué no llega a `VALIDADO`.** `[R38]` exige para esa transición `rubric = 100` ∧ `¬drift` ∧
> `cross_coherence` verificada, y `[R39]` prohíbe llegar por inferencia. La rúbrica de este producto
> **no está definida** en F-1 —sólo hay reglas `CR-XXX` sueltas—, así que `rubric_compliance_score`
> no es calculable todavía. Declararlo `VALIDADO` sería inventarse el número.
>
> Definir las rúbricas es trabajo de F12 (Gobernanza de Dominio) y queda en `PENDIENTES.md`.
