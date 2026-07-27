# 04 — Application Flow

**Source:** `src/apps/base/src/app.controller.ts`, `src/apps/client/src/app.controller.ts`, `src/api/src/modules/*/`, `src/nginx/nginx.conf`

## 1. User Registration & Login (Buyer/Seller)

```
Browser → BASE (/auth/register)
  [1] GET /auth/register → BASE renders login.html
  [2] POST /api/v1/auth/register (via BFF proxy on BASE)
      ├─ RecaptchaGuard validates captcha
      ├─ AuthService.register() → creates User (PENDING_VERIFICATION)
      ├─ Sends verification email via Nodemailer
      └─ Returns { tokens, user }
  [3] BASE BFF proxy intercepts response → sets access_token + refresh_token as HttpOnly cookies
  [4] User must verify email via link → POST /api/v1/auth/verify-email
      └─ User state transitions: PENDING_VERIFICATION → ACTIVE
  [5] User redirected to CLIENT dashboard

Flow for Login:
  [1] GET /auth/login → BASE renders login.html
  [2] POST /api (via BFF proxy) → login → tokens set as cookies
  [3] Redirect to CLIENT /dashboard
```

Source: `src/apps/base/src/main.ts:88-118` (BFF proxy), `src/apps/base/src/app.controller.ts:64-96`

## 2. Cookie-Based SSO Between BASE and CLIENT

```
Cookie domain: COOKIE_DOMAIN env var (e.g., .ironloot.local for local dev)
  - access_token: HttpOnly, 7 days, sameSite: Lax
  - refresh_token: HttpOnly, 30 days, sameSite: Lax

BFF Pattern (BASE only):
  Browser → BASE /api/* (Express)
    BASE extracts access_token from cookie
    → proxies to API with: Authorization: Bearer <token>
    → returns response (strips token from payload if auth endpoint)

CLIENT pattern:
  Browser → CLIENT (NestJS controller)
    Controller reads access_token from req.cookies
    → fetches from API directly: fetch(API_URL + path, { Authorization: Bearer token })
    → renders template with data
```

Source: `src/apps/base/src/main.ts:21-28, 82-96`, `src/apps/client/src/app.controller.ts:9-19`

## 3. Auction Browse → Bid → Win Flow

```
[BROWSE — PUBLIC via BASE]
  GET /auctions → BASE controller → API GET /api/v1/auctions?status=ACTIVE
  GET /auctions/:id → BASE controller → API GET /api/v1/auctions/:id

[BID — PRIVATE via CLIENT, requires auth]
  POST /api/v1/bids (via socket.io or REST)
    BidsService:
      1. Validates auction is ACTIVE
      2. Validates bid > currentPrice
      3. Validates bidder ≠ seller
      4. Locks funds: wallet.heldFunds += bid.amount
      5. Releases previous bidder's held funds if outbid
      6. Updates auction.currentPrice
      7. Broadcasts via Socket.io: 'bid.new' event
      8. Emits BID_PLACED audit event
      9. If within soft-close window (120s): extends endsAt by 120s, emits AUCTION_EXTENDED

[AUCTION CLOSE — SYSTEM CRON]
  Every 60s: AuctionSchedulerService.handleCron()
    1. Acquires Redis lock: lock:auction-close (60s TTL)
    2. Queries auctions where status=ACTIVE AND endsAt <= now()
    3. For each auction:
       a. Finds highest bid (winner)
       b. Creates Order (PENDING_PAYMENT)
       c. Converts winner's held funds to order payment
       d. Releases all other bidders' held funds
       e. Sends AUCTION_WON notification to winner
       f. Sends AUCTION_LOST notifications to losers
       g. Emits AuctionClosedEvent (domain event)
    4. Releases Redis lock
```

Source: `src/api/src/modules/scheduler/auction-scheduler.service.ts`, `src/api/prisma/schema.prisma:159-218`

## 4. Payment Flow (Wallet Deposit)

```
[INITIATE]
  POST /api/v1/payments/initiate
    { amount, provider: 'MERCADO_PAGO' | 'PAYPAL' }
    → PaymentsService.initiatePayment() → creates redirect URL at provider
    → Returns { redirectUrl }

[USER PAY]
  User completes payment on Mercado Pago / PayPal

[WEBHOOK]
  POST /api/v1/payments/webhook/:provider
    → PaymentsService.handleWebhook()
    → Validates HMAC signature
    → Updates Payment record → status: COMPLETED
    → Emits PAYMENT_CONFIRMED audit event

[CONFIRM DEPOSIT]
  POST /api/v1/wallet/deposit
    { referenceId, amount }
    1. paymentsService.verifyPayment(referenceId) → must be COMPLETED
    2. payment.amount must === dto.amount (anti-fraud)
    3. walletService.deposit(userId, verifiedAmount, referenceId)
    4. Ledger entry: DEPOSIT
    5. wallet.isActive = true (if first deposit)
```

Source: `src/api/src/modules/wallet/wallet.controller.ts:83-111`, `src/api/src/modules/payments/payments.controller.ts`

## 5. Order → Shipment → Delivery → Rating Flow

```
Order created by scheduler on auction close (PENDING_PAYMENT)
  → Winner pays via /payments/checkout → status: PAID
  → Seller ships: POST /api/v1/shipments → status: SHIPPED
    { provider: DHL|FEDEX|ESTAFETA|UPS|CUSTOM, trackingNumber }
  → Delivery confirmed: PATCH /api/v1/shipments/:id → status: DELIVERED
    Sets deliveredAt timestamp
  → 14-day dispute window opens
  → Ratings available: POST /api/v1/ratings (buyer rates seller, seller rates buyer)
```

Source: `src/api/prisma/schema.prisma:237-246`, `src/api/prisma/schema.prisma:344-392`

## 6. Dispute Flow

```
POST /api/v1/disputes
  { orderId, reason, description }
  Validates: deliveredAt + DISPUTE_WINDOW_DAYS >= now()
  Creates Dispute (OPEN)

Admin mediates: PATCH /api/v1/disputes/:id → IN_MEDIATION
Admin resolves: PATCH /api/v1/disputes/:id → RESOLVED
  { resolution: "text" }

If refund warranted: admin creates RefundRequest
  → RefundRequest: PENDING_REFUND → PROCESSING → COMPLETED|FAILED
```

Source: `src/api/prisma/schema.prisma:394-421`, `src/api/src/common/observability/constants.ts:79-84`

## 7. Admin Moderation Flow

```
Seller submits auction (status → PENDING_MODERATION after publish)
Admin visits ADMIN panel → Moderation section
  PATCH /api/v1/admin/auctions/:id/approve → status: PUBLISHED (ready to go ACTIVE)
  PATCH /api/v1/admin/auctions/:id/reject  → status: CANCELLED + ModerationLog entry
  PATCH /api/v1/admin/auctions/:id/suspend → status: SUSPENDED
  PATCH /api/v1/admin/auctions/:id/force-close → status: CLOSED (emergency)
```

Source: `src/admin/src/app.service.ts:34-41`

## 8. KYC (Seller Verification)

```
Seller submits documents: POST /api/v1/kyc (docsJson payload)
  → KycSubmission record (PENDING)
Admin reviews: PATCH /api/v1/admin/kyc/:id
  → APPROVED: seller.isSeller = true, sellerEnabledAt = now()
  → REJECTED: status + reviewNotes
  → CORRECTION_NEEDED: seller notified to resubmit
```

Source: `src/api/prisma/schema.prisma:764-778`
