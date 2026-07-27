# 07 — Database Architecture

**Source:** `src/api/prisma/schema.prisma` (all citations)

## 1. Database

- **Provider:** PostgreSQL 16 (alpine)
- **ORM:** Prisma 5.8
- **Schema file:** `src/api/prisma/schema.prisma`
- **Connection:** `DATABASE_URL` env var (prisma/schema.prisma:13)

## 2. Design Rules (derived from schema)

- **Primary keys:** UUID v4 (`@default(uuid()) @db.Uuid`) — all tables
- **Timestamps:** `Timestamptz` (timezone-aware) — all tables with `createdAt`/`updatedAt`
- **Financial amounts:** `Decimal(10,2)` for commerce, `Decimal(12,2)` for wallet (higher precision)
- **DB column names:** `snake_case` via `@map()` annotations; Prisma model fields use `camelCase`
- **Table names:** `snake_case` via `@@map()` annotations (e.g., model `User` → table `users`)
- **Soft deletes:** Not implemented — records are deleted or use status fields

## 3. Entity Relationship Overview

```
User (1) ──────── (1) Wallet
  │                    │
  │ (1:N) Sessions     │ (1:N) Ledger
  │ (1:1) Profile
  │ (1:N) Auctions (as seller)
  │ (1:N) Bids (as bidder)
  │ (1:N) Orders (as buyer)
  │ (1:N) Orders (as seller)
  │ (1:N) Watchlist
  │ (1:N) Rating (authored)
  │ (1:N) Rating (received)
  │ (1:N) Disputes (created)
  │ (1:N) Notifications

Auction (1) ─── (1:N) Bid
          (1) ─── (0:N) Watchlist
          (1) ─── (0:1) Order

Order (1) ──── (1:N) Payment
       (1) ──── (0:1) Shipment
       (1) ──── (0:N) Rating
       (1) ──── (0:1) Dispute
       (1) ──── (0:1) RefundRequest
```

## 4. Tables

### USER GROUP

#### `users`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `email` | VarChar(255) | UNIQUE, idx | |
| `username` | VarChar(50) | UNIQUE, idx | |
| `password_hash` | VarChar(255) | NOT NULL | bcrypt |
| `two_factor_secret` | VarChar(100) | nullable | TOTP secret |
| `is_two_factor_enabled` | Boolean | default false | |
| `display_name` | VarChar(100) | nullable | |
| `avatar_url` | Text | nullable | |
| `state` | UserState enum | default PENDING_VERIFICATION | idx |
| `suspended_reason` | Text | nullable | |
| `banned_reason` | Text | nullable | |
| `settings` | JsonB | default `{"language":"es",...}` | |
| `is_seller` | Boolean | default false | |
| `seller_enabled_at` | Timestamptz | nullable | |
| `email_verified_at` | Timestamptz | nullable | |
| `email_verification_token` | VarChar(255) | nullable | |
| `email_verification_expires_at` | Timestamptz | nullable | |
| `password_reset_token` | VarChar(255) | nullable | |
| `password_reset_expires_at` | Timestamptz | nullable | |

**Indexes:** email, username, state (schema:96-99)

**Enum `UserState`:** `PENDING_VERIFICATION`, `ACTIVE`, `SUSPENDED`, `BANNED` (schema:22-26)

#### `profiles`
| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID FK | ON DELETE CASCADE |
| `phone` | VarChar(20) | nullable |
| `legal_name` | VarChar(150) | nullable — for KYC/Deposit |
| `address` | Text | nullable |
| `city` | VarChar(100) | nullable |
| `country` | VarChar(100) | nullable |
| `postal_code` | VarChar(20) | nullable |
| `rfc` | VarChar(13) | nullable — Mexican tax ID |

#### `sessions`
| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID FK | ON DELETE CASCADE |
| `refresh_token` | VarChar(255) | UNIQUE, idx |
| `expires_at` | Timestamptz | idx |
| `ip_address` | VarChar(50) | nullable |
| `user_agent` | Text | nullable |
| `revoked_at` | Timestamptz | nullable |

### AUCTION GROUP

#### `auctions`
| Column | Type | Notes |
|---|---|---|
| `title` | VarChar(200) | |
| `description` | Text | |
| `slug` | VarChar(255) | UNIQUE |
| `images` | JsonB | default `[]` |
| `starting_price` | Decimal(10,2) | |
| `current_price` | Decimal(10,2) | |
| `starts_at` | Timestamptz | |
| `ends_at` | Timestamptz | idx |
| `status` | AuctionStatus enum | default DRAFT, idx |
| `is_blocked` | Boolean | default false — admin flag |
| `admin_notes` | Text | nullable |
| `seller_id` | UUID FK | idx |

**Enum `AuctionStatus`:** `DRAFT`, `PUBLISHED`, `ACTIVE`, `CLOSED`, `CANCELLED`, `SUSPENDED`, `PENDING_MODERATION` (schema:30-37)

**Note:** `SOFT_CLOSE` is NOT a DB status — it is a scheduler logic state (auctions in the soft-close window remain `ACTIVE`).

#### `bids`
| Column | Type | Notes |
|---|---|---|
| `amount` | Decimal(10,2) | |
| `auction_id` | UUID FK | idx |
| `bidder_id` | UUID FK | idx |

**Composite index:** `(auction_id, amount DESC)` — for finding highest bid efficiently (schema:216)

#### `watchlist`
| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID FK | idx |
| `auction_id` | UUID FK | |
| `(user_id, auction_id)` | | UNIQUE constraint |

### COMMERCE GROUP

#### `orders`
| Column | Type | Notes |
|---|---|---|
| `total_amount` | Decimal(10,2) | |
| `status` | OrderStatus enum | default PENDING_PAYMENT |
| `auction_id` | UUID FK | UNIQUE (1 order per auction) |
| `buyer_id` | UUID FK | idx |
| `seller_id` | UUID FK | idx |

**Enum `OrderStatus`:** `PENDING_PAYMENT`, `PAID`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REFUNDED` (schema:238-245)

#### `payments`
| Column | Type | Notes |
|---|---|---|
| `amount` | Decimal(10,2) | |
| `currency` | VarChar(3) | default `MXN` |
| `provider` | PaymentProvider enum | |
| `status` | PaymentStatus enum | default PENDING |
| `external_id` | VarChar(255) | nullable, idx |
| `metadata` | JsonB | default `{}` |
| `order_id` | UUID FK | idx |

**Enum `PaymentProvider`:** `MERCADO_PAGO`, `PAYPAL`, `STRIPE`, `HEY_BANCO` (schema:280-285)
**Enum `PaymentStatus`:** `PENDING`, `COMPLETED`, `FAILED`, `REFUNDED` (schema:289-293)

#### `shipments`
| Column | Type | Notes |
|---|---|---|
| `provider` | ShipmentProvider enum | |
| `tracking_number` | VarChar(100) | nullable |
| `status` | ShipmentStatus enum | default PENDING |
| `estimated_delivery` | Timestamptz | nullable |
| `shipped_at` | Timestamptz | nullable |
| `delivered_at` | Timestamptz | nullable |
| `order_id` | UUID FK | UNIQUE |

**Enum `ShipmentProvider`:** `DHL`, `FEDEX`, `ESTAFETA`, `UPS`, `CUSTOM` (schema:337-342)

#### `ratings`
| Column | Type | Notes |
|---|---|---|
| `score` | SmallInt | 1-5 |
| `comment` | Text | nullable |
| `order_id` | UUID FK | idx |
| `author_id` | UUID FK | idx |
| `target_id` | UUID FK | idx |

#### `disputes`
| Column | Type | Notes |
|---|---|---|
| `order_id` | UUID FK | UNIQUE |
| `creator_id` | UUID FK | idx |
| `reason` | VarChar(100) | |
| `description` | Text | |
| `status` | DisputeStatus enum | default OPEN |
| `resolution` | Text | nullable |

**Enum `DisputeStatus`:** `OPEN`, `IN_MEDIATION`, `RESOLVED`, `CLOSED` (schema:395-399)

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID FK | idx |
| `type` | NotificationType enum | |
| `title` | VarChar(200) | |
| `message` | Text | |
| `data` | JsonB | default `{}` |
| `is_read` | Boolean | default false, idx |

**Enum `NotificationType`:** `AUCTION_WON`, `AUCTION_LOST`, `BID_OUTBID`, `ORDER_PAID`, `ORDER_SHIPPED`, `DISPUTE_UPDATE`, `SYSTEM` (schema:423-431)

### WALLET GROUP

#### `wallets`
| Column | Type | Notes |
|---|---|---|
| `user_id` | UUID FK | UNIQUE |
| `balance` | Decimal(12,2) | Available funds |
| `held_funds` | Decimal(12,2) | Locked in active bids |
| `currency` | VarChar(3) | default `MXN` |
| `is_active` | Boolean | default false — requires initial deposit |

**Invariant:** `balance >= 0` always; `held_funds >= 0` always; total user funds = `balance + held_funds`

#### `ledger`
| Column | Type | Notes |
|---|---|---|
| `wallet_id` | UUID FK | idx |
| `type` | LedgerType enum | |
| `amount` | Decimal(12,2) | |
| `balance_before` | Decimal(12,2) | |
| `balance_after` | Decimal(12,2) | |
| `reference_id` | VarChar(100) | nullable — AuctionId / PaymentId |
| `reference_type` | VarChar(50) | nullable — "AUCTION" / "PAYMENT" |
| `description` | Text | |

**Enum `LedgerType`:** `DEPOSIT`, `WITHDRAWAL`, `HOLD_BID`, `RELEASE_BID`, `DEBIT_ORDER`, `CREDIT_SALE`, `FEE_PLATFORM`, `REFUND`, `ADJUSTMENT` (schema:604-614)

**Immutability rule:** Ledger entries are NEVER updated or deleted. Insert-only.

### OBSERVABILITY GROUP

#### `audit_events`
Stores all significant business actions with: traceId, actorType, actorUserId, entityType, entityId, result (SUCCESS/FAIL), payload (whitelisted fields only).

#### `error_events`
Stores all captured errors with: errorCode, message, severity (WARN/ERROR), httpStatus, isBusinessError, stack, request context.

#### `request_logs`
Stores HTTP request/response metadata: method, path, status, durationMs, request/response sizes, actor, clientIp, userAgent.

### SYSTEM GROUP

#### `system_config`
Key-value store for runtime configuration. Supports `isSecret`, `category`, `description`, `updatedBy`.

### BACKOFFICE GROUP

#### `commission_config`
Commission rate configuration by type (GLOBAL, CATEGORY, SELLER).

#### `commission_records`
Per-order commission ledger: orderId (UNIQUE), sellerId, amount, ratePercent, status (PENDING/COLLECTED).

#### `moderation_log`
Admin content moderation history: auctionId, action (APPROVED/REJECTED), reasonCode, notes, reviewedBy.

#### `cfdi_records`
Mexico tax invoice records: orderId (UNIQUE), uuidSat, xmlPath, pdfPath, status (PENDING/EMITTED/CANCELLED/ERROR).

#### `kyc_submissions`
Seller KYC: userId, status (PENDING/APPROVED/REJECTED/CORRECTION_NEEDED), docsJson, reviewedBy.

#### `notification_campaigns`
Bulk notification campaigns: segment (ALL/BUYERS/SELLERS/WINNERS/DEBTORS/SUSPENDED), channelsJson, scheduledAt, status (DRAFT/SCHEDULED/SENT/FAILED).

#### `refund_requests`
orderId (UNIQUE), amount, currency, reason, status (PENDING_REFUND/PROCESSING/COMPLETED/FAILED), initiatedBy.

#### `seo_config`
page (UNIQUE), title, description, og:title, og:description, og:image, updatedBy.

#### `cms_content`
key (UNIQUE), value, type (TEXT/HTML/JSON), updatedBy.

## 5. Index Summary

Critical performance indexes:
- `users`: email, username, state
- `auctions`: seller_id, status, ends_at
- `bids`: auction_id, bidder_id, amount; composite (auction_id, amount DESC)
- `orders`: buyer_id, seller_id, status
- `payments`: order_id, external_id, status
- `ledger`: (wallet_id, created_at DESC)
- `audit_events`: (entity_type, entity_id, timestamp DESC); (actor_user_id, timestamp DESC); trace_id
- `error_events`: trace_id; (error_code, timestamp DESC)
- `request_logs`: trace_id; (http_path, timestamp DESC)


## Tablas del ciclo de pago (PT-076 / PT-078 / PT-080)

```
processed_webhook_events   UNIQUE (provider, payment_id)   -- barrera de idempotencia
payment_cycles             UNIQUE (reference)              -- ciclo en 3 fases
  INDEX (status, next_check_at)                            -- vía garantizada
  INDEX (canonical_payment_id)
payment_cycle_events       INDEX (cycle_id), (external_id)  -- TRAZA COMPLETA (PT-086)
  INDEX (reference, received_at)                             -- recorrido de una transacción
  INDEX (trace_id)                                           -- cruce con request_logs
```

`PaymentCycleStatus`: `REQUESTED · CONFIRMED · SETTLED · FAILED · ANOMALY · EXPIRED`.

**`payments` ya se escribe** (PT-085): `Payment.orderId` pasó a opcional, porque los depósitos de
wallet no tienen orden. Mientras fue obligatorio nadie podía escribir la tabla y el panel
financiero del admin mostraba ceros. **TD-008 cerrada.**

> **Nota de entorno**: la base de datos de desarrollo **no tiene `_prisma_migrations`**. El
> entrypoint del contenedor ejecuta `prisma db push --accept-data-loss` en cada arranque, de modo
> que el esquema se sincroniza desde `schema.prisma` en lugar de aplicar migraciones
> (violación de ADR-006, registrada como AUD-001). Las migraciones sí se versionan en el repo.
