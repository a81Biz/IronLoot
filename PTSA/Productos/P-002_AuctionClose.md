---
producto_id: P-002
nombre: Auction Close — Cierre de subasta
clase: primario
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


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 100 · **Evidencia**: [E-010]

Toda subasta cerrada con pujas genero pedido; 0 fondos retenidos huerfanos

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

**Evidencia de este producto**: N1 sobre subastas cerradas reales; N3 con P-001 y P-003

`[R39]` prohíbe llegar aquí por inferencia. Toda la evidencia es **observada en la fuente real** —
consultas contra `ironloot_db` con los productos que dejó una corrida completa de QA, incluidos dos
pagos por pasarelas de verdad y una subasta que el cron cerró solo.
