---
producto_id: P-012
nombre: CFDI Record — Registro fiscal
clase: secundario
criticidad: BAJA
estado: IDENTIFICADO
dimension_primaria: D1
confidence: 0
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: [H-005]
---

# P-012 — CFDI Record (Registro fiscal)

## Descripción
Un registro CFDI es la factura fiscal mexicana (Comprobante Fiscal Digital por Internet) que debe generarse para transacciones comerciales en México. El módulo CFDI en v1.0.0 es un **STUB** — la estructura de datos existe en BD (`cfdi_records` table) pero no hay integración real con un PAC (Proveedor Autorizado de Certificación).

**Alimenta a:** P-003 (Order) — como registro fiscal asociado

**Estado del stub:** `CfdiService` gestiona el modelo pero no emite facturas reales.

## Fuente de generación
- **Servicio:** `CfdiService` (stub — sin PAC real)
- **Tabla:** `cfdi_records`
- **Estados posibles:** PENDING, EMITTED, CANCELLED, ERROR

## Cadena de trazabilidad
```
P-012 CFDI Record
  ← CfdiService.create() [transformación — stub]
  ← OrdersService (al completar pedido) [servicio]
  ← Reglas: Ley del SAT (México) — NOT IMPLEMENTED
  ← Fuente: orders WHERE id=? (orderId)
  ← Acción sistema: debería dispararse automáticamente, stub lo registra sin emitir
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| El stub NO emite facturas reales a SAT — solo registra el intento | ⏳ Pendiente F6 | — |
| Estado registrado correctamente (PENDING / ERROR en stub) | ⏳ Pendiente F6 | — |
| Gap de dominio: compliance fiscal incompleta (TD-001 HANDOFF.md) | Documentado | HANDOFF.md:TD-001 |

## Estado de validación
`BORRADOR` — pendiente F6

## Notas de coherencia inter-producto
- P-012 DEBE ser coherente con P-003 (Order) en orderId
- El gap de dominio de P-012 NO invalida P-003 per se, pero representa un riesgo de cumplimiento fiscal
- Se espera hallazgo D1 ALTA en F6 por compliance fiscal no funcional


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 0 · **Evidencia**: [E-009]

H-005: no se genera. El modulo CFDI no hace una sola llamada saliente

Ejecutado sobre la **salida real extraída de la base de datos** (`[R55]`), con los productos que
dejó la corrida completa de QA del 27-jul — no sobre tests unitarios ni sobre el código que los
genera.

> **Por qué no llega a `VALIDADO`.** `[R38]` exige para esa transición `rubric = 100` ∧ `¬drift` ∧
> `cross_coherence` verificada, y `[R39]` prohíbe llegar por inferencia. La rúbrica de este producto
> **no está definida** en F-1 —sólo hay reglas `CR-XXX` sueltas—, así que `rubric_compliance_score`
> no es calculable todavía. Declararlo `VALIDADO` sería inventarse el número.
>
> Definir las rúbricas es trabajo de F12 (Gobernanza de Dominio) y queda en `PENDIENTES.md`.
