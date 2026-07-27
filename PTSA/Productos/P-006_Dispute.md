---
producto_id: P-006
nombre: Dispute — Disputa gestionada
clase: primario
criticidad: ALTA
estado: IDENTIFICADO
dimension_primaria: D1
confidence: 85
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: [H-011]
---

# P-006 — Dispute (Disputa)

## Descripción
Una disputa es el mecanismo de resolución de conflictos post-entrega. Solo el comprador o admin puede abrirla dentro de los 14 días siguientes a la entrega del pedido. Estados: `OPEN → IN_MEDIATION → RESOLVED → CLOSED`. El resultado es una disputa válida registrada con su resolución.

**Consumidor:** Comprador (recurso de reclamación), Admin (gestión de mediación).

## Fuente de generación
- **Endpoint:** `POST /api/v1/disputes` (JWT comprador)
- **Servicio:** `DisputesService.create()`, `DisputesService.update()`
- **Tabla:** `disputes` (UNIQUE por orderId)

## Cadena de trazabilidad
```
P-006 Dispute
  ← DisputesService.create() [transformación]
  ← DisputesController POST /disputes [servicio]
  ← Reglas: CR-007 (ventana 14 días), relación 1:1 dispute↔order (UNIQUE)
  ← Fuente: orders WHERE id=? (para verificar deliveredAt y buyerId)
  ← Acción usuario: Comprador POST /disputes con { orderId, description }
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| CR-007: Disputa fuera de ventana 14 días → 400 DISPUTE_WINDOW_EXPIRED | ⏳ Pendiente F6 | — |
| Solo el comprador del pedido puede abrir la disputa | ⏳ Pendiente F6 | — |
| Relación 1:1 dispute↔order (UNIQUE constraint en DB) | ⏳ Pendiente F6 | — |
| Disputa en pedido ya resuelto → 409 | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6

## Notas de coherencia inter-producto
- P-006 depende de P-003 (Order): requiere orderId con pedido DELIVERED
- La disputa no bloquea fondos directamente pero puede derivar en P-005 (refund)


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 85 · **Evidencia**: [E-014]

Acid Test 7/7 sobre una disputa real; pero H-011: la ventana se mide desde updatedAt

Ejecutado sobre la **salida real extraída de la base de datos** (`[R55]`), con los productos que
dejó la corrida completa de QA del 27-jul — no sobre tests unitarios ni sobre el código que los
genera.

> **Por qué no llega a `VALIDADO`.** `[R38]` exige para esa transición `rubric = 100` ∧ `¬drift` ∧
> `cross_coherence` verificada, y `[R39]` prohíbe llegar por inferencia. La rúbrica de este producto
> **no está definida** en F-1 —sólo hay reglas `CR-XXX` sueltas—, así que `rubric_compliance_score`
> no es calculable todavía. Declararlo `VALIDADO` sería inventarse el número.
>
> Definir las rúbricas es trabajo de F12 (Gobernanza de Dominio) y queda en `PENDIENTES.md`.
