---
producto_id: P-006
nombre: Dispute — Disputa gestionada
clase: primario
criticidad: ALTA
estado: BORRADOR
dimension_primaria: D1
confidence: 0
audit_due: 2026-08-22
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: []
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
