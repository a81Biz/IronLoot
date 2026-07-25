# Modelo Maestro de Dominio — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción documental (fuente única de entidades) |
| **Fuente** | `audit/raw/C-database.md`, `F-core-tests.md`, `prisma/schema.prisma` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 07-Database-Architecture, inventory/entities |
| **Código usado** | `prisma/schema.prisma` (896 líneas), `prisma/migrations/*` (14), `packages/core/src/domain/*` |
| **Nivel de confianza** | Alto |

> **Fuente única de entidades.** 24 modelos Prisma · 18 enums. La columna *Migración* marca el drift (AUD-001): ✅ tiene migración, ✗ sólo `db push`.

## 1. Bounded contexts (agrupación por dominio)

| Contexto | Entidades | Máquina de estado (core) |
|---|---|---|
| **Identidad & Acceso** | User, Profile, Session, UserPaymentMethod | UserState (enum) |
| **Catálogo & Subastas** | Auction, Bid, Watchlist | AuctionStateMachine |
| **Monedero & Finanzas** | Wallet, Ledger | WalletCalculation (no FSM) |
| **Órdenes & Cumplimiento** | Order, Payment, Shipment, Rating | OrderStateMachine |
| **Conflictos** | Dispute, RefundRequest | DisputeStateMachine |
| **Backoffice & Fiscal** | CommissionConfig, CommissionRecord, ModerationLog, CfdiRecord, KycSubmission, NotificationCampaign, SeoConfig, CmsContent, SystemConfig | — |
| **Observabilidad** | AuditEvent, ErrorEvent, RequestLog | — |
| **Notificaciones** | Notification | — |

## 2. Catálogo de entidades

| Entidad | Tabla | Clave / Relaciones principales | Campos de dinero | Migración | Ref |
|---|---|---|---|---|---|
| **User** | `users` | PK uuid; 1:1 Profile/Wallet; 1:N Auction/Bid/Order/Notification/PaymentMethod | — | ✅ | `schema.prisma:40` |
| **Profile** | `profiles` | 1:1 User (Cascade) | — | ✅ | `:104` |
| **Session** | `sessions` | N:1 User (Cascade); refreshToken único | — | ✅ | `:131` |
| **UserPaymentMethod** | `user_payment_methods` | N:1 User (Cascade); unique(userId,referenceId) | — | ✅ (mig.14) | `:885` **AUD-019** (no documentado antes) |
| **Auction** | `auctions` | N:1 seller; 1:N Bid; 1:1 Order | `startingPrice`,`currentPrice` Decimal(10,2) | ✅ | `:160` |
| **Bid** | `bids` | N:1 Auction/User; idx (auctionId,amount DESC) | `amount` Decimal(10,2) | ✅ | `:199` |
| **Watchlist** | `watchlist` | N:1 User/Auction; unique(userId,auctionId) | — | ✗ | `:222` **AUD-001** |
| **Order** | `orders` | 1:1 Auction; N:1 buyer/seller; 1:1 Shipment/Dispute/Refund | `totalAmount` Decimal(10,2) | ✅ | `:249` |
| **Payment** | `payments` | N:1 Order | `amount` Decimal(10,2); `currency` (default DB `USD`) | ✅ | `:297` **AUD-008** |
| **Shipment** | `shipments` | 1:1 Order | — | ✅ | `:345` |
| **Rating** | `ratings` | N:1 Order/author/target | `score` SmallInt (1-5, no forzado en BD) | ✅ | `:370` |
| **Dispute** | `disputes` | 1:1 Order; N:1 creator | — | ✅ | `:404` |
| **Notification** | `notifications` | N:1 User | — | ✅ | `:436` |
| **Wallet** | `wallets` | 1:1 User; 1:N Ledger | `balance`,`heldFunds`,**`pendingBalance`** Decimal(12,2); `currency` MXN | ✅ | `:618` |
| **Ledger** | `ledger` | N:1 Wallet (Restrict) | `amount`,`balanceBefore`,`balanceAfter` Decimal(12,2) | ✅ | `:642` |
| **WithdrawalRequest** | `withdrawal_requests` | N:1 User; ref `paymentMethodId` | `amount`; `status` WithdrawalStatus; FSM REQUESTED→APPROVED→PAID/REJECTED (PT-072) | ✅ | retiro real |
| **UserPaymentMethod** | `user_payment_methods` | N:1 User | `clabe`(18, verificador RN-63),`holderName`,`bankName`,`isVerified` | ✅ | PT-070 |
| **CommissionConfig** | `commission_config` | referenceId libre | `ratePercent` Decimal(5,2) | ✗ | `:684` **AUD-001** |
| **CommissionRecord** | `commission_records` | orderId único (ref libre, sin FK) | `amount` Decimal(10,2) sin currency | ✗ | `:698` **AUD-001** |
| **ModerationLog** | `moderation_log` | auctionId (ref libre) | — | ✗ | `:719` |
| **CfdiRecord** | `cfdi_records` | orderId único (ref libre) | — | ✗ | `:741` |
| **KycSubmission** | `kyc_submissions` | userId (ref libre) | — | ✗ | `:766` |
| **NotificationCampaign** | `notification_campaigns` | — | — | ✗ | `:800` |
| **RefundRequest** | `refund_requests` | 1:1 Order (única con relación real) | `amount` Decimal(10,2); `currency` MXN | ✗ | `:828` |
| **SeoConfig** | `seo_config` | page único | — | ✗ | `:849` |
| **CmsContent** | `cms_content` | key único | — | ✗ | `:873` |
| **SystemConfig** | `system_config` | PK key | — | ✗ | `:586` |
| **AuditEvent** | `audit_events` | refs libres (log inmutable) | — | ✅ | `:460` |
| **ErrorEvent** | `error_events` | refs libres | — | ✅ | `:498` |
| **RequestLog** | `request_logs` | refs libres | — | ✅ | `:543` |

> **Nota de integridad:** los modelos de backoffice usan *referencias libres* (`orderId`/`userId`/`auctionId` sin `@relation` Prisma ni FK en BD), no relaciones reforzadas — excepto `RefundRequest` que sí declara relación a `Order`. Combinado con AUD-001, su integridad referencial no está garantizada a nivel BD.

## 3. Enums (18)

| Enum | Valores | Nota |
|---|---|---|
| UserState | PENDING_VERIFICATION, ACTIVE, SUSPENDED, BANNED | `schema.prisma:21` |
| AuctionStatus | DRAFT, PUBLISHED, ACTIVE, CLOSED, CANCELLED, **SUSPENDED**, **PENDING_MODERATION** | últimos 2 sin migración (AUD-001) |
| OrderStatus | PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED | — |
| PaymentProvider | MERCADO_PAGO, PAYPAL, STRIPE, **HEY_BANCO** | HEY_BANCO sin migración (AUD-023) |
| PaymentStatus | PENDING, COMPLETED, FAILED, REFUNDED | — |
| ShipmentStatus | PENDING, SHIPPED, DELIVERED, RETURNED | — |
| ShipmentProvider | DHL, FEDEX, ESTAFETA, UPS, CUSTOM | manual (AUD-024) |
| DisputeStatus | OPEN, IN_MEDIATION, RESOLVED, CLOSED | — |
| NotificationType | AUCTION_WON, AUCTION_LOST, BID_OUTBID, ORDER_PAID, ORDER_SHIPPED, DISPUTE_UPDATE, SYSTEM | — |
| LedgerType | DEPOSIT, WITHDRAWAL, HOLD_BID, RELEASE_BID, DEBIT_ORDER, CREDIT_SALE, FEE_PLATFORM, REFUND, ADJUSTMENT, **SETTLEMENT_RELEASE** | evolución limpia (mig. 9→11→13→liberación PT-071) |
| WithdrawalStatus | REQUESTED, APPROVED, PAID, REJECTED, FAILED | retiro real PT-072 |
| CommissionType / CommissionStatus | GLOBAL,CATEGORY,SELLER / PENDING,COLLECTED | sin migración |
| ModerationAction | APPROVED, REJECTED | sin migración |
| CfdiStatus | PENDING, EMITTED, CANCELLED, ERROR | sin migración |
| KycStatus | PENDING, APPROVED, REJECTED, CORRECTION_NEEDED | sin migración |
| NotificationSegment / CampaignStatus | ALL,BUYERS,SELLERS,WINNERS,DEBTORS,SUSPENDED / DRAFT,SCHEDULED,SENT,FAILED | sin migración |
| RefundStatus | PENDING_REFUND, PROCESSING, COMPLETED, FAILED | sin migración |
| CmsContentType | TEXT, HTML, JSON | sin migración |

## 4. Máquinas de estado (core)

**Auction:** `DRAFT→{PUBLISHED,CANCELLED}` · `PUBLISHED→{ACTIVE,CANCELLED}` · `ACTIVE→{CLOSED,CANCELLED,SUSPENDED}` · `PENDING_MODERATION→{PUBLISHED,CANCELLED}` · `SUSPENDED→{PUBLISHED}` · CLOSED/CANCELLED terminales. Scheduler bloqueado en PENDING_MODERATION/SUSPENDED. (`auction-state-machine.ts:10-45`)

**Order:** `PENDING_PAYMENT→{PAID,CANCELLED}` · `PAID→{SHIPPED,REFUNDED}` · `SHIPPED→{DELIVERED}` · `DELIVERED→{REFUNDED}` · CANCELLED/REFUNDED terminales. (`order-state-machine.ts:5-11`)

**Dispute:** `OPEN→{IN_MEDIATION,CLOSED}` · `IN_MEDIATION→{RESOLVED,CLOSED}` · `RESOLVED→{CLOSED}` · CLOSED terminal; ventana 14 días. (`dispute-state-machine.ts:5-37`)

**Withdrawal (PT-072):** `REQUESTED→{APPROVED,REJECTED}` · `APPROVED→{PAID,REJECTED}` · `REJECTED`/`PAID`/`FAILED` terminales. Aprobación **manual admin**; solicitar reserva fondos, rechazar los reintegra. (`withdrawals.service.ts`)

> **Estado real:** las operaciones admin escriben estado con `prisma.update` crudo, **sin** invocar estas FSM (AUD-011). La FSM de retiro sí se aplica en servicio (guardas por estado en approve/reject/markPaid).

## 5. Modelo de dinero

- Precisión: Wallet/Ledger `Decimal(12,2)`; Payment/Order/Refund/Commission `Decimal(10,2)`. Sin columna currency en Auction/Order/Ledger/Bid/CommissionRecord (moneda implícita MXN).
- Value object `Money` (centavos enteros, currency-safe) existe en core con 30 tests pero **el API no lo usa** (usa `Decimal`) — AUD-012.
- Ledger es el registro inmutable de todo movimiento; tipos: HOLD_BID/RELEASE_BID (pujas), DEBIT_ORDER/CREDIT_SALE/FEE_PLATFORM (cierre), DEPOSIT/WITHDRAWAL, REFUND, ADJUSTMENT, **SETTLEMENT_RELEASE** (liberación de holdback pending→disponible).
- **Tres saldos (PT-071):** `balance` (disponible/retirable), `heldFunds` (bloqueado por pujas activas), `pendingBalance` (liquidación de ventas **retenida** hasta entrega o vencimiento de disputa). El neto de una venta entra a `pendingBalance` y sólo pasa a `balance` vía `SETTLEMENT_RELEASE`. Sólo `balance` es retirable.
