# RELACIONES — Índice cache hallazgos ↔ evidencias ↔ productos
**PTSA V3 | Cache: sobrescribir al reconstruir. Prevalecen archivos individuales.**
**Última reconstrucción:** 2026-06-23 (S-001 — auditoría completa F-1→F12)

## Hallazgos registrados (7 total)

| ID | Dim | Sev | Estado | Producto | Evidencias | Riesgo | Sesión |
|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| H-001 | D1 | ALTA | ABIERTA | P-001 Bid | E-001, E-002 | 9 | S-001 |
| H-002 | D2 | MEDIA | ABIERTA | P-003 RateLimitResponse | E-003 | 4 | S-001 |
| H-003 | D2 | BAJA | ABIERTA | P-004 PaymentWebhookResult | E-004 | 2 | S-001 |
| H-004 | D2 | MEDIA | ABIERTA | P-005 WalletTransaction | E-005 | 6 | S-001 |
| H-005 | D1 | ALTA | ABIERTA | P-009 CfdiRecord | E-007 | 6 | S-001 |
| H-006 | D2 | MEDIA | ABIERTA | P-010 PageRenderSSR | E-006 | 4 | S-001 |
| H-007 | D4 | BAJA | ABIERTA | P-005 WalletTransaction | E-008 | 1 | S-001 |

**Hallazgos activos:** 7  ·  **Corregidos/cerrados:** 0

---

## Evidencias registradas (8 total)

| ID | Tipo | Origen | Estado | Sesión |
|:--:|:--:|:--|:--:|:--:|
| E-001 | codigo | src/api/src/modules/bids/bids.service.ts:98-108 | VALID | S-001 |
| E-002 | codigo | src/api/src/modules/scheduler/auction-scheduler.service.ts:98-100 | VALID | S-001 |
| E-003 | codigo | src/api/src/app.module.ts:75-85 | VALID | S-001 |
| E-004 | codigo | src/api/src/modules/payments/payments.service.ts:1-12 | VALID | S-001 |
| E-005 | codigo | src/api/src/modules/wallet/wallet.controller.ts:43-55 | VALID | S-001 |
| E-006 | codigo | src/apps/client/src/app.controller.ts:5-6,39-52 | VALID | S-001 |
| E-007 | configuracion | HANDOFF.md + 02-PRD.md + inventory/services.md | VALID | S-001 |
| E-008 | documentacion | docs/enterprise-documentation/02-PRD.md:57-62 | VALID | S-001 |

---

## Productos identificados (12)

| ID | Nombre | Clase | Criticidad | Estado | Hallazgos |
|:--:|:--|:--:|:--:|:--:|:--:|
| P-001 | Bid (Puja) | primario | CRÍTICA | AUDITADO | H-001 |
| P-002 | AuctionResult (Cierre de Subasta) | primario | CRÍTICA | AUDITADO | — |
| P-003 | RateLimitResponse | primario | ALTA | AUDITADO | H-002 |
| P-004 | PaymentWebhookResult (Pago) | primario | CRÍTICA | AUDITADO | H-003 |
| P-005 | WalletTransaction (Transacción de Monedero) | primario | CRÍTICA | AUDITADO | H-004, H-007 |
| P-006 | Order (Pedido) | primario | ALTA | AUDITADO | — |
| P-007 | DisputeRecord (Disputa) | primario | MEDIA | AUDITADO | — |
| P-008 | AuthToken (JWT) | primario | CRÍTICA | AUDITADO | — |
| P-009 | CfdiRecord (Registro Fiscal) | secundario | ALTA | AUDITADO | H-005 |
| P-010 | PageRenderSSR (Página SSR) | secundario | ALTA | AUDITADO | H-006 |
| P-011 | NotificationRecord | primario | MEDIA | AUDITADO | — |
| P-012 | CmsContent | secundario | BAJA | AUDITADO | — |
