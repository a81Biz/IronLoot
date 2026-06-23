---
producto_id: P-003
nombre: Order — Pedido creado
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
