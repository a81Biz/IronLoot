---
producto_id: P-003
nombre: Order — Pedido creado
clase: primario
criticidad: ALTA
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

# P-003 — Order (Pedido)

## Descripción
Un pedido es el registro de transacción comercial creado automáticamente al cierre de una subasta con ganador. Contiene comprador, vendedor, subasta, importe, estado (PENDING_PAYMENT → PAID → SHIPPED → DELIVERED → CANCELLED/REFUNDED) y es el ancla de envíos, disputas, calificaciones y registros CFDI.

**Consumidor:** Comprador (seguimiento de pedido), Vendedor (lista de envíos pendientes), Admin (gestión de pedidos).

## Fuente de generación
- **Servicio:** `OrdersService.create()` llamado desde `AuctionSchedulerService` al cierre
- **Tabla de salida:** `orders`
- **Tablas relacionadas:** `shipments`, `disputes`, `ratings`, `refund_requests`, `cfdi_records`, `commission_records`

## Cadena de trazabilidad
```
P-003 Order
  ← OrdersService.create() [transformación]
  ← AuctionSchedulerService (tras cerrar P-002) [servicio]
  ← Reglas: relación 1:1 order↔auction (UNIQUE), buyerId=bid.userId, sellerId=auction.userId
  ← Fuente: auctions.winnerId, bids.amount (precio final), auctions.sellerId
  ← Acción sistema: automático en cierre de subasta
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| Relación 1:1 con auction (UNIQUE constraint) | ⏳ Pendiente F6 | — |
| Estado inicial = PENDING_PAYMENT | ⏳ Pendiente F6 | — |
| buyerId y sellerId correctos | ⏳ Pendiente F6 | — |
| Precio = bid.amount del ganador | ⏳ Pendiente F6 | — |
| Solo una orden por subasta | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6

## Notas de coherencia inter-producto
- P-003 es creado por P-002 (Auction Close)
- P-010 (Commission Record) debe crearse ligado a P-003
- P-012 (CFDI Record) debería crearse ligado a P-003 (stub)


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 100 · **Evidencia**: [E-010]

1:1 con la subasta, importe == precio final, comprador == mejor postor

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

**Evidencia de este producto**: N1: 1:1 con la subasta, importe == precio final, comprador == mejor postor; N3 con P-002, P-010 y P-006

`[R39]` prohíbe llegar aquí por inferencia. Toda la evidencia es **observada en la fuente real** —
consultas contra `ironloot_db` con los productos que dejó una corrida completa de QA, incluidos dos
pagos por pasarelas de verdad y una subasta que el cron cerró solo.
