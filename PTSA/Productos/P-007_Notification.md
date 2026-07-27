---
producto_id: P-007
nombre: Notification — Notificación entregada
clase: primario
criticidad: MEDIA
estado: VALIDADO
dimension_primaria: D3
confidence: 100
audit_due: 2026-08-26
domain_validation:
  semantic_drift_detected: false
  rubric_compliance_score: 100
  cross_coherence_verified: true
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


---

## Auditoría F6 — DS-006 (2026-07-27)

**Transición**: `BORRADOR` → **`IDENTIFICADO`** · **Confidence**: 100 · **Evidencia**: [E-010]

4 notificaciones reales: destinatario existente, sin mensajes vacios, tipos del catalogo

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

**Evidencia de este producto**: N1 sobre 4 notificaciones reales; N3 con P-002 tras PT-117: el vendedor recibe AUCTION_SOLD

`[R39]` prohíbe llegar aquí por inferencia. Toda la evidencia es **observada en la fuente real** —
consultas contra `ironloot_db` con los productos que dejó una corrida completa de QA, incluidos dos
pagos por pasarelas de verdad y una subasta que el cron cerró solo.
