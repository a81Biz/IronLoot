---
producto_id: P-002
nombre: Auction Close — Cierre de subasta
clase: primario
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

# P-002 — Auction Close (Cierre de subasta)

## Descripción
El cierre de subasta es el producto más crítico del dominio. Cuando una subasta alcanza su `endTime` (y pasa la ventana de soft-close), el scheduler la cierra automáticamente. El resultado incluye: identificación del ganador (bid más alto), conversión de fondos retenidos del ganador a pago pendiente, liberación de fondos de todos los demás pujadores, creación automática del pedido (P-003), envío de notificaciones (P-007: AUCTION_WON, AUCTION_LOST), y actualización de estado de la subasta a `CLOSED`.

**Consumidor:** Sistema (orden de trabajo), Comprador ganador (notificación + pedido creado), Vendedor (pedido para enviar), Compradores perdedores (fondos liberados + notificación).

## Fuente de generación
- **Trigger:** `AuctionSchedulerService` cron `@Cron(CronExpression.EVERY_MINUTE)` protegido por `lock:auction-close` (Redis)
- **Servicio:** `AuctionSchedulerService.closeExpiredAuctions()` → `CloseAuctionUseCase` (core)
- **Tablas modificadas:** `auctions` (status → CLOSED), `orders` (create), `wallets` (held_funds → 0 para todos), `ledger` (DEBIT_ORDER ganador, RELEASE_BID perdedores), `notifications` (create)

## Cadena de trazabilidad
```
P-002 Auction Close
  ← AuctionSchedulerService.closeExpiredAuctions() [transformación]
  ← SchedulerModule cron EVERY_MINUTE [servicio]
  ← DistributedLockService (Redis lock:auction-close) [control de concurrencia]
  ← CloseAuctionUseCase (@ironloot/core) [reglas de dominio]
  ← Reglas: auction.endTime < now, soft-close 120s (CR-009), redistribución fondos (CR-001/CR-002/CR-003)
  ← Fuente: auctions WHERE status=ACTIVE AND endTime < now, bids WHERE auctionId=? ORDER BY amount DESC
  ← Acción sistema: cron automático
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| Soft-close: bid en últimos 120s extiende subasta por 120s (CR-009) | ⏳ Pendiente F6 | — |
| Ganador = bid de mayor importe activo | ⏳ Pendiente F6 | — |
| Fondos del ganador: heldFunds → 0, DEBIT_ORDER en ledger | ⏳ Pendiente F6 | — |
| Fondos de perdedores: heldFunds → 0, balance restaurado, RELEASE_BID en ledger | ⏳ Pendiente F6 | — |
| Pedido creado automáticamente (P-003) con buyerId, sellerId, auctionId | ⏳ Pendiente F6 | — |
| Notificaciones enviadas: AUCTION_WON (ganador), AUCTION_LOST (perdedores) | ⏳ Pendiente F6 | — |
| Lock Redis previene cierre doble en entornos multi-instancia | ⏳ Pendiente F6 | — |
| Subasta sin pujas cierra correctamente (sin pedido creado) | ⏳ Pendiente F6 | — |

## Estado de validación
`BORRADOR` — pendiente F6 (Domain Acid Test)

## Notas de coherencia inter-producto
- P-002 crea P-003 (Order): coherencia obligatoria
- P-002 genera múltiples P-009 (Ledger Entries) — una por cada pujador
- P-002 genera múltiples P-007 (Notifications)
- P-002 depende de P-001 (Bids): sin pujas, no hay ganador
