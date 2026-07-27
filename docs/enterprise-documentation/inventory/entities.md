# Inventory — Entities

All Prisma models and enums from `src/api/prisma/schema.prisma`.

---

## Enums

| Enum | Values | Table Column |
|---|---|---|
| `UserState` | PENDING_VERIFICATION, ACTIVE, SUSPENDED, BANNED | `users.state` |
| `AuctionStatus` | DRAFT, PUBLISHED, ACTIVE, CLOSED, CANCELLED, SUSPENDED, PENDING_MODERATION | `auctions.status` |
| `OrderStatus` | PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED | `orders.status` |
| `PaymentProvider` | MERCADO_PAGO, PAYPAL, STRIPE, HEY_BANCO | `payments.provider` |
| `PaymentStatus` | PENDING, COMPLETED, FAILED, REFUNDED | `payments.status` |
| `ShipmentStatus` | PENDING, SHIPPED, DELIVERED, RETURNED | `shipments.status` |
| `ShipmentProvider` | DHL, FEDEX, ESTAFETA, UPS, CUSTOM | `shipments.provider` |
| `DisputeStatus` | OPEN, IN_MEDIATION, RESOLVED, CLOSED | `disputes.status` |
| `NotificationType` | AUCTION_WON, AUCTION_LOST, BID_OUTBID, ORDER_PAID, ORDER_SHIPPED, DISPUTE_UPDATE, SYSTEM | `notifications.type` |
| `LedgerType` | DEPOSIT, WITHDRAWAL, HOLD_BID, RELEASE_BID, DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM, REFUND, ADJUSTMENT | `ledger.type` |
| `CommissionType` | GLOBAL, CATEGORY, SELLER | `commission_config.type` |
| `CommissionStatus` | PENDING, COLLECTED | `commission_records.status` |
| `ModerationAction` | APPROVED, REJECTED | `moderation_log.action` |
| `CfdiStatus` | PENDING, EMITTED, CANCELLED, ERROR | `cfdi_records.status` |
| `KycStatus` | PENDING, APPROVED, REJECTED, CORRECTION_NEEDED | `kyc_submissions.status` |
| `NotificationSegment` | ALL, BUYERS, SELLERS, WINNERS, DEBTORS, SUSPENDED | `notification_campaigns.segment` |
| `CampaignStatus` | DRAFT, SCHEDULED, SENT, FAILED | `notification_campaigns.status` |
| `RefundStatus` | PENDING_REFUND, PROCESSING, COMPLETED, FAILED | `refund_requests.status` |
| `CmsContentType` | TEXT, HTML, JSON | `cms_content.type` |

---

## Models

| Prisma Model | DB Table | Key Relations |
|---|---|---|
| `User` | `users` | → Wallet (1:1), Profile (1:1), Sessions (1:N), Auctions (1:N), Bids (1:N), Orders×2 (1:N), Ratings×2 (1:N), Disputes (1:N), Notifications (1:N), Watchlist (1:N) |
| `Profile` | `profiles` | → User (N:1, CASCADE) |
| `Session` | `sessions` | → User (N:1, CASCADE) |
| `Auction` | `auctions` | → User/seller (N:1), Bids (1:N), Watchlist (1:N), Order (1:0..1) |
| `Bid` | `bids` | → Auction (N:1), User/bidder (N:1) |
| `Watchlist` | `watchlist` | → User (N:1), Auction (N:1); UNIQUE(userId, auctionId) |
| `Order` | `orders` | → Auction (1:1 UNIQUE), User/buyer (N:1), User/seller (N:1), Payments (1:N), Shipment (1:0..1), Ratings (1:N), Dispute (1:0..1), RefundRequest (1:0..1) |
| `Payment` | `payments` | → Order (N:1) |
| `Shipment` | `shipments` | → Order (1:1 UNIQUE) |
| `Rating` | `ratings` | → Order (N:1), User/author (N:1), User/target (N:1) |
| `Dispute` | `disputes` | → Order (1:1 UNIQUE), User/creator (N:1) |
| `Notification` | `notifications` | → User (N:1) |
| `Wallet` | `wallets` | → User (1:1 UNIQUE), Ledger (1:N) |
| `Ledger` | `ledger` | → Wallet (N:1) |
| `SystemConfig` | `system_config` | (standalone, key-value) |
| `AuditEvent` | `audit_events` | (standalone observability) |
| `ErrorEvent` | `error_events` | (standalone observability) |
| `RequestLog` | `request_logs` | (standalone observability) |
| `CommissionConfig` | `commission_config` | (standalone) |
| `CommissionRecord` | `commission_records` | (standalone, references orderId/sellerId by value) |
| `ModerationLog` | `moderation_log` | (standalone, references auctionId by value) |
| `CfdiRecord` | `cfdi_records` | → Order (1:1 UNIQUE by orderId) |
| `KycSubmission` | `kyc_submissions` | (references userId by value) |
| `NotificationCampaign` | `notification_campaigns` | (standalone) |
| `RefundRequest` | `refund_requests` | → Order (1:1 UNIQUE) |
| `SeoConfig` | `seo_config` | (standalone, key: page) |
| `CmsContent` | `cms_content` | (standalone, key: key) |

**Total models: 27** (including observability and backoffice tables)


## Ciclo de pago (PT-076 / PT-078 / PT-080)

| Entidad | Tabla | Propósito |
|---|---|---|
| `ProcessedWebhookEvent` | `processed_webhook_events` | Barrera de idempotencia. Única `(provider, payment_id)`: impide acreditar dos veces el mismo pago. La clave es el identificador **de pago** del proveedor, no el de la notificación (PT-078). |
| `PaymentCycle` | `payment_cycles` | Ciclo de vida del pago en tres fases. Estados `REQUESTED → CONFIRMED → SETTLED · FAILED · ANOMALY · EXPIRED`. Nace en `/payments/initiate`. |
| `PaymentCycleEvent` | `payment_cycle_events` | **Traza completa de la transacción** (PT-086). Cada paso con `direction` (INBOUND/OUTBOUND/INTERNAL), `step`, `endpoint`, `httpStatus`, `durationMs`, `traceId` y el payload íntegro con las credenciales redactadas y marcadas en `redactedFields`. |

> **`Payment` (`payments`) — corregido por PT-085.** `Payment.orderId` era obligatorio con clave
> foránea a `Order` y un depósito de wallet no tiene orden, de modo que **nadie escribía nunca la
> tabla** y el panel financiero del admin, que la consulta en seis sitios, mostraba ceros. Desde
> PT-085 `orderId` es opcional, la fila lleva `reference` al ciclo, y el ciclo la escribe al
> cerrarse. Lo mismo se aplicó a `RefundRequest`, para que un cobro duplicado pueda generar su
> solicitud de reembolso. **TD-008 cerrada.**
