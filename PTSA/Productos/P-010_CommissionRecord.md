---
producto_id: P-010
nombre: Commission Record — Registro de comisión
clase: secundario
criticidad: MEDIA
estado: VALIDADO
dimension_primaria: D1
confidence: 100
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: 100
  cross_coherence_verified: true
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


---

## Auditoría F6 — DS-007 (2026-07-27)

**Transición**: `REQUIERE_REVISION` → **`IDENTIFICADO`** · **Confidence**: 100

`[R39]` exige evidencia post-corrección **observada en la fuente real**, no inferida de haber
editado el código. Se obtuvo así: se venció una subasta `ACTIVE` con 3 pujas y se dejó que el cron
la cerrara solo.

```
subasta            CLOSED
pedidos            1
commission_records 1
registro: 95.00 MXN al 10.00%   ==   asiento: 95.00 MXN
```

**El producto se genera.** Y su importe coincide al céntimo con el asiento del ledger, que era el
riesgo real: dos cifras distintas de la misma comisión habrían sido peor que ninguna.

Sigue sin llegar a `VALIDADO` por el mismo motivo que los demás: la rúbrica no está definida en F-1.


---

## Transición a VALIDADO — DS-008 (2026-07-27)

**`IDENTIFICADO` → `VALIDADO`** · VoBo humano recibido.

`[R38]` exige `rubric = 100` ∧ `¬drift` ∧ `cross_coherence`. Los tres se cumplen:

```
rubric_compliance_score  = 100   (F-1 §5, once criterios pesados, ejecutados sobre salida real)
semantic_drift_detected  = false (el producto ES el registro: no hay significado que derive)
cross_coherence_verified = true
```

**Evidencia de este producto**: N1 post-fix observado en BD (PT-114); N3 con P-003 y P-009: 95.00 == 95.00

`[R39]` prohíbe llegar aquí por inferencia. Toda la evidencia es **observada en la fuente real** —
consultas contra `ironloot_db` con los productos que dejó una corrida completa de QA, incluidos dos
pagos por pasarelas de verdad y una subasta que el cron cerró solo.
