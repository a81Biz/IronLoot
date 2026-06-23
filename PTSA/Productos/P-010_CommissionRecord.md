---
producto_id: P-010
nombre: Commission Record — Registro de comisión
clase: secundario
criticidad: MEDIA
estado: BORRADOR
dimension_primaria: D1
confidence: 0
audit_due: 2026-09-21
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: []
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
