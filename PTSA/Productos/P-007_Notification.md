---
producto_id: P-007
nombre: Notification — Notificación entregada
clase: primario
criticidad: MEDIA
estado: BORRADOR
dimension_primaria: D3
confidence: 0
audit_due: 2026-09-21
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: null
  cross_coherence_verified: false
hallazgos_relacionados: []
---

# P-007 — Notification (Notificación)

## Descripción
Una notificación es el resultado de comunicar un evento de negocio al usuario afectado. Canales: in-app (DB-backed en tabla `notifications`) + email (vía Nodemailer). Tipos: AUCTION_WON, AUCTION_LOST, BID_OUTBID, ORDER_PAID, ORDER_SHIPPED, DISPUTE_UPDATE, SYSTEM.

**Consumidor:** Comprador/Vendedor (informado del evento).

## Fuente de generación
- **Servicio:** `NotificationsService.send()` / `NotificationsService.sendEmail()`
- **Tablas:** `notifications`
- **Email:** Nodemailer + Handlebars templates → Mailhog (dev) / SMTP (prod)

## Cadena de trazabilidad
```
P-007 Notification
  ← NotificationsService.send() [transformación]
  ← Llamado desde BidsService, AuctionSchedulerService, OrdersService, DisputesService [servicios]
  ← Reglas: tipo correcto para el evento, userId correcto, mensaje en español (MXN)
  ← Fuente: evento de dominio (AuctionClosedEvent, BidPlacedEvent, etc.)
  ← Acción sistema: evento de dominio emitido vía EventEmitter2
```

## Invariantes de dominio verificados en F6

| Regla | Estado | Evidencia |
|:---|:--:|:---|
| Tipo de notificación correcto para el evento | ⏳ Pendiente F6 | — |
| userId destinatario correcto (ganador, perdedores, ambas partes) | ⏳ Pendiente F6 | — |
| Notificación persistida en BD (no solo email) | ⏳ Pendiente F6 | — |
| Canal email funciona en desarrollo (Mailhog) | ⏳ Pendiente F8 | — |

## Estado de validación
`BORRADOR` — pendiente F6/F8

## Notas de coherencia inter-producto
- P-007 es generado por P-002 (Auction Close): AUCTION_WON + AUCTION_LOST
- P-007 es generado por P-001 (Bid): BID_OUTBID para pujador superado
- P-007 tiene dimensión primaria D3 porque su criticidad es de entrega/observabilidad más que de dominio
