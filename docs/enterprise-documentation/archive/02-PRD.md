# 02 — Product Requirements Document (PRD)

**Source:** Derived from code, routes, Prisma schema, and observable business logic.  
**Currency:** MXN (all monetary values)

## 1. Core Product Areas

### 1.1 User Registration & Authentication

**Requirements:**
- Users register with email + username + password (`src/api/src/modules/auth/auth.controller.ts:49`)
- Email verification required to activate account (state: `PENDING_VERIFICATION → ACTIVE`)
- Recaptcha guard on registration in production (`src/api/src/modules/auth/auth.controller.ts:51`)
- Login returns JWT access + refresh tokens
- 2FA (TOTP) opt-in: generate QR → scan → enable (`auth.controller.ts:261-301`)
- Password reset via email token (forgot-password → reset-password flow)
- Session management: refresh token stored in DB (`sessions` table); logout revokes one or all sessions

**Acceptance Criteria:**
- AC-1.1: Duplicate email/username returns 409
- AC-1.2: Login with unverified email returns 403 with `USER_NOT_VERIFIED`
- AC-1.3: Login with suspended/banned account returns 403
- AC-1.4: Access token expires in `JWT_ACCESS_EXPIRY` (default: 15m)
- AC-1.5: Refresh token expires in `JWT_REFRESH_EXPIRY` (default: 7d)
- AC-1.6: Password reset invalidates all sessions

### 1.2 Auction Lifecycle

**Requirements:**
- Sellers create auctions in DRAFT state
- Auctions progress: `DRAFT → PUBLISHED → ACTIVE → Soft-Close → CLOSED`
- Soft-close: any bid in the final 120s extends the auction by 120s
- Scheduler runs every minute (`@Cron(CronExpression.EVERY_MINUTE)`) to advance states
- Admin can: approve/reject (PENDING_MODERATION), suspend, force-close, cancel, reopen
- Auction has `isBlocked` flag (admin override) and `adminNotes`

**Acceptance Criteria:**
- AC-2.1: Bid on own auction returns 400 with `BID_ON_OWN_AUCTION`
- AC-2.2: Bid lower than current price returns 400 with `BID_TOO_LOW`
- AC-2.3: Bid on closed/cancelled/suspended auction returns 400 with `AUCTION_NOT_ACTIVE`
- AC-2.4: Soft-close extension fires WebSocket broadcast

Source: `src/api/src/modules/scheduler/auction-scheduler.service.ts`, `src/api/src/common/observability/constants.ts:60-66`

### 1.3 Wallet & Bid Fund Locking

**Requirements:**
- Each user has one wallet (`wallets` table, 1:1)
- Wallet becomes active only after first deposit (`isActive = false` by default)
- Bidding locks funds: `wallet.heldFunds += bid.amount`
- Being outbid releases held funds: `wallet.heldFunds -= previous_bid; wallet.balance += previous_bid`
- On auction close: winner's held funds → payment; others released
- Ledger records every balance change immutably (`LedgerType` enum covers 9 movement types)
- Withdrawal daily limit: 5,000 MXN (`src/api/src/modules/wallet/wallet.controller.ts:132`)
- Deposit requires verified payment reference (anti-fraud: amount comes from payment, not user input)

**Acceptance Criteria:**
- AC-3.1: Balance cannot go negative
- AC-3.2: Held funds cannot exceed available balance at the time of locking (i.e. `balance − amount_to_lock ≥ 0`). After locking, `held_funds` may exceed remaining `balance` — this is the expected state for active bidders.
- AC-3.3: Every balance change produces a Ledger entry
- AC-3.4: Deposit amount mismatch (user input vs payment) throws `PaymentMismatchException`

Source: `src/api/src/modules/wallet/wallet.controller.ts:94-111`, `src/api/prisma/schema.prisma:617-663`

### 1.4 Payment Processing

**Requirements:**
- Supported providers: Mercado Pago (primary), PayPal, Stripe, Hey Banco (schema enum)
- Webhook endpoints at `POST /payments/webhook/:provider`
- Webhook HMAC signature validation (never trust unvalidated payloads)
- Deposit flow: user pays → webhook → wallet deposit confirmation
- Checkout flow for order payment: `POST /payments/checkout` (creates payment session)
- `GET /payments/providers` returns only configured + active providers

**Acceptance Criteria:**
- AC-4.1: Unvalidated webhook payload is rejected
- AC-4.2: Wallet deposit requires `payment.status === 'COMPLETED'`
- AC-4.3: Payment amount mismatch between user claim and verified payment is rejected

Source: `src/api/src/modules/payments/payments.controller.ts`, `CLAUDE.md:182`

### 1.5 Order Management

**Order states:** `PENDING_PAYMENT → PAID → SHIPPED → DELIVERED → CANCELLED / REFUNDED`

**Requirements:**
- Order created automatically when auction closes with a winner
- One order per auction (1:1 relation in schema)
- Buyer and seller roles tracked on order
- Refund requests create `RefundRequest` records (separate from order status)

Source: `src/api/prisma/schema.prisma:248-277`, `src/packages/core/src/domain/order/order-state-machine.ts`

### 1.6 Dispute Resolution

**Requirements:**
- Disputes can be opened within `DISPUTE_WINDOW_DAYS` (14 days) after delivery
- States: `OPEN → IN_MEDIATION → RESOLVED → CLOSED`
- Only the buyer or admin can open a dispute
- Resolution string stored on dispute record

**Acceptance Criteria:**
- AC-6.1: Opening a dispute after the 14-day window returns 400 with `DISPUTE_WINDOW_EXPIRED`
- AC-6.2: Dispute on already-resolved order returns 409

Source: `src/api/prisma/schema.prisma:394-421`, `src/api/src/common/observability/constants.ts:79-81`

### 1.7 Notifications

**Types:** `AUCTION_WON`, `AUCTION_LOST`, `BID_OUTBID`, `ORDER_PAID`, `ORDER_SHIPPED`, `DISPUTE_UPDATE`, `SYSTEM`

**Channels:** In-app (DB-backed `notifications` table) + email (via Nodemailer/Mailhog)

Source: `src/api/prisma/schema.prisma:423-450`

### 1.8 Admin Backoffice

**Modules:** Users, Auctions (Lots), Orders, Payments, Reconciliation, KYC, Moderation, CFDI, Reports, Notifications, Audit, SEO, CMS, Refunds, Disputes, Commissions, Configuration

**Auth:** Session-based (express-session) with optional TOTP. Admin authenticates via `/api/v1/admin/auth/login` on the API.

Source: `src/admin/src/app.module.ts`, `src/admin/src/app.controller.ts`

### 1.9 Ratings & Reputation

**Requirements:**
- Both buyer and seller can rate each other after order completion
- Score: 1–5 (SmallInt), optional text comment
- Ratings linked to specific orders (orderId)

Source: `src/api/prisma/schema.prisma:369-392`

### 1.10 SEO & CMS

**SEO:** Per-page metadata (title, description, og:*) stored in `seo_config` table, managed via admin.  
**CMS:** Key-value content store (`cms_content` table) supporting TEXT, HTML, JSON content types.

Source: `src/api/prisma/schema.prisma:848-881`

## 2. Out-of-Scope (Not in v1.0.0)

- CFDI/PAC integration is a **stub** (schema exists, service is not implemented with a real PAC)
- Stripe and Hey Banco are in the `PaymentProvider` enum but are not configured integrations
- Mobile app
- Seller subscription tiers
- Bulk import of auction items
