# B — API Backend: Implemented Behavior (Phase 3)

**Scope:** `src/api/src/` (27 feature modules + `common/`). Evidence cited as `file:line`.
**Global routing:** `main.ts:95` `setGlobalPrefix('api')` + `main.ts:89-91` URI versioning `defaultVersion:'1'`.
→ **All paths below are prefixed `/api/v1`** (webhooks/admin/health included). Paths in the table are shown *without* the prefix.

Business rules are largely delegated to the shared `@ironloot/core` library (`src/packages/core/`); the exact
thresholds live there and are cited where load-bearing.

---

## 1. ENDPOINT CATALOG

Guards column: `JWT`=JwtAuthGuard, `OptJWT`=OptionalJwtAuthGuard, `Public`=@Public() (bypasses global JWT), `AdminDual`=AdminDualAuthGuard (admin JWT **or** x-admin-key), `DevOnly`=DevelopmentOnlyGuard, `Recaptcha`=RecaptchaGuard. Global default throttle is 100 req/min (see CLAUDE.md); only explicit `@Throttle`/`@SkipThrottle` noted.

| Method | Path | Module | Guards | Throttle | Purpose | file:line |
|---|---|---|---|---|---|---|
| POST | /auth/register | auth | Public+Recaptcha | 5 prod / 60 dev per 60s | Register user, sends verify email | auth.controller.ts:49-69 |
| POST | /auth/login | auth | Public | 5 prod / 60 dev per 60s | Login, returns JWT + refresh | auth.controller.ts:75-97 |
| POST | /auth/refresh | auth | Public | default | New access token from refresh token | auth.controller.ts:103-120 |
| POST | /auth/logout | auth | JWT | default | Revoke one or all sessions | auth.controller.ts:126-155 |
| POST | /auth/verify-email | auth | Public | default | Verify email via token | auth.controller.ts:161-177 |
| POST | /auth/forgot-password | auth | Public | default | Send reset email (always 200) | auth.controller.ts:183-200 |
| POST | /auth/reset-password | auth | Public | default | Reset password, revoke all sessions | auth.controller.ts:206-223 |
| POST | /auth/change-password | auth | JWT | default | Change password (verifies current) | auth.controller.ts:229-251 |
| POST | /auth/2fa/generate | auth | JWT | default | Generate TOTP secret + QR | auth.controller.ts:261-269 |
| POST | /auth/2fa/enable | auth | JWT | default | Verify token, enable 2FA | auth.controller.ts:271-285 |
| POST | /auth/2fa/disable | auth | JWT | default | Verify token, disable 2FA | auth.controller.ts:287-301 |
| GET | /auth/me | auth | JWT | default | Current user profile | auth.controller.ts:307-322 |
| POST | /auctions | auctions | JWT | default | Create auction (DRAFT); seller only | auctions.controller.ts:39-59 |
| GET | /auctions | auctions | Public+OptJWT | default | List (public ACTIVE/PUBLISHED, or mine=true) | auctions.controller.ts:64-128 |
| GET | /auctions/:id | auctions | Public | default | Auction detail (id or slug) | auctions.controller.ts:133-142 |
| PATCH | /auctions/:id | auctions | JWT | default | Update (DRAFT only, owner) | auctions.controller.ts:147-167 |
| POST | /auctions/:id/publish | auctions | JWT | default | DRAFT→PUBLISHED (owner) | auctions.controller.ts:172-190 |
| POST | /auctions/:auctionId/bids | bids | JWT (class) | default | Place bid | bids.controller.ts:18-34 |
| GET | /auctions/:auctionId/bids | bids | Public | default | Bid history for auction | bids.controller.ts:36-44 |
| GET | /bids/my-active | bids | JWT (class) | default | My active bids | bids.controller.ts:54-63 |
| GET | /bids/my-history | bids | JWT (class) | default | My full bid history | bids.controller.ts:65-74 |
| GET | /wallet/balance | wallet | JWT (class) | default | Available + held balance | wallet.controller.ts:46-58 |
| GET | /wallet/history | wallet | JWT (class) | default | Ledger history | wallet.controller.ts:60-81 |
| POST | /wallet/deposit | wallet | JWT (class) | **10/60s** | Credit wallet after verified payment | wallet.controller.ts:83-111 |
| POST | /wallet/withdraw | wallet | JWT (class) | **5/60s** | Withdraw (daily limit 5000 MXN) | wallet.controller.ts:113-137 |
| POST | /payments/checkout | payments | JWT | default | Create Stripe checkout session | payments.controller.ts:29-43 |
| POST | /payments/webhook/:provider | payments | **none (public)** | **20/60s** | Provider webhook (HMAC/IPN validated inside) | payments.controller.ts:45-56 |
| POST | /payments/initiate | payments | JWT | default | Initiate deposit (MP/PayPal/...) | payments.controller.ts:57-64 |
| GET | /payments/providers | payments | none | default | List enabled providers | payments.controller.ts:66-74 |
| GET | /payments/methods | payments | none | default | MercadoPago methods | payments.controller.ts:76-84 |
| POST | /payments/process | payments | JWT | default | Direct MP payment | payments.controller.ts:86-99 |
| GET | /orders | orders | JWT (class) | default | List orders by role buyer/seller | orders.controller.ts:28-40 |
| GET | /orders/:id | orders | JWT (class) | default | Order detail (buyer or seller) | orders.controller.ts:42-51 |
| POST | /disputes | disputes | JWT | default | Open dispute (14-day window) | disputes.controller.ts:16-26 |
| GET | /disputes | disputes | JWT | default | My disputes | disputes.controller.ts:28-36 |
| GET | /disputes/:id | disputes | JWT | default | Dispute detail (participant) | disputes.controller.ts:38-49 |
| POST | /shipments | shipments | JWT (class) | default | Create shipment (seller, order PAID) | shipments.controller.ts:27-44 |
| GET | /shipments/:id | shipments | JWT (class) | default | Shipment detail (participant) | shipments.controller.ts:46-57 |
| PATCH | /shipments/:id/status | shipments | JWT (class) | default | Update status (seller); cascades to order | shipments.controller.ts:59-72 |
| POST | /ratings | ratings | JWT | default | Rate transaction (order DELIVERED) | ratings.controller.ts:16-26 |
| GET | /users/:userId/ratings | ratings | none | default | Ratings for a user | ratings.controller.ts:28-34 |
| GET | /users/me | users | JWT | default | Own full profile | users.controller.ts:39-78 |
| PATCH | /users/me | users | JWT | default | Update profile (ACTIVE only) | users.controller.ts:83-127 |
| GET | /users/me/stats | users | JWT | default | Activity stats | users.controller.ts:132-149 |
| GET | /users/me/verification-status | users | JWT | default | Verification/seller eligibility | users.controller.ts:154-172 |
| GET | /users/me/settings | users | JWT | default | User settings | users.controller.ts:177-185 |
| PATCH | /users/me/settings | users | JWT | default | Update settings (merge) | users.controller.ts:190-201 |
| POST | /users/me/resend-verification | users | JWT | default | Resend verify email | users.controller.ts:206-229 |
| POST | /users/me/enable-seller | users | JWT | default | Become seller (requirements gate) | users.controller.ts:234-262 |
| GET | /users/:id | users | OptJWT | default | Public profile | users.controller.ts:267-296 |
| GET | /notifications | notifications | JWT | default | List notifications | notifications.controller.ts:24-38 |
| GET | /notifications/unread-count | notifications | JWT | default | Unread count | notifications.controller.ts:40-48 |
| PATCH | /notifications/read-all | notifications | JWT | default | Mark all read | notifications.controller.ts:50-58 |
| PATCH | /notifications/:id/read | notifications | JWT | default | Mark one read | notifications.controller.ts:60-72 |
| GET | /watchlist | watchlist | JWT (class) | default | My watchlist | watchlist.controller.ts:26-36 |
| POST | /watchlist | watchlist | JWT (class) | default | Add auction to watchlist | watchlist.controller.ts:38-54 |
| DELETE | /watchlist/:auctionId | watchlist | JWT (class) | default | Remove (idempotent) | watchlist.controller.ts:56-74 |
| POST | /upload/image | upload | JWT | default | Upload image (mime-restricted) | upload.controller.ts:28-59 |
| GET | /health | health | Public | default | Basic health | health.controller.ts:16-21 |
| GET | /health/detailed | health | Public | default | Detailed health + deps | health.controller.ts:27-32 |
| POST | /admin/auth/login | admin | Public+SkipThrottle | none | Admin login (creds + optional TOTP), 8h JWT | admin-auth.controller.ts:25-113 |
| GET/PATCH/... | /admin/* (≈60 routes) | admin | **AdminDual (class)** | default | Admin ops — see block below | admin.controller.ts:31-739 |
| GET | /diagnostics/* (9 routes) | diagnostics | **DevOnly (class)** | default | Dev-only logs/metrics/errors | diagnostics.controller.ts:18-230 |

### Admin controller routes (all `@UseGuards(AdminDualAuthGuard)` at class, `admin.controller.ts:31`)
Dashboard: `GET stats:47`, `dashboard/extended-stats:53`, `dashboard/revenue-by-day:59`, `dashboard/users-by-day:65`.
Users: `GET users:73`, `GET users/:id:83`, `PATCH users/:id:89`.
Auctions (moderation): `GET auctions:97`, `GET auctions/:id:106`, `PATCH auctions/:id/cancel:112`, `.../approve:119`, `.../reject:126`, `.../suspend:133`, `.../force-close:140`, `.../reopen:147`.
Lots: `GET lots:156`, `GET lots/:id:165`, `PATCH lots/:id/block:171`, `.../unblock:178`, `PATCH lots/:id:185`.
Orders/Payments: `GET orders:193`, `GET payments:204`.
Financial/commissions: `GET financial/commissions/config:218`, `PUT .../config/global:224`, `PUT .../config/seller/:sellerId:230`, `DELETE .../config/:id:243`, `GET .../records:249`, `PATCH .../records/:id/mark-collected:258`.
Reports: `GET reports/financial:267`, `reports/operational:290`, `reports/fiscal:311`.
Config: `GET/PUT configuration/platform:334,340`, `.../smtp:346,352`, `.../storage:358,364`, `.../cfdi:370,376`, `GET/PUT system/payment-config:385,391`.
Disputes: `GET disputes:399`, `GET disputes/:id:645`, `POST disputes/:id/resolve-buyer:651`, `.../resolve-seller:661`, `.../request-evidence:671`.
Audit/moderation: `GET audit-logs:407`, `GET moderation:443`, `PATCH moderation/:id/approve:449`, `.../reject:456`.
KYC: `GET kyc:473`, `GET kyc/:id:482`, `PATCH kyc/:id/approve:488`, `.../reject:495`, `.../request-correction:502`.
CFDI: `GET cfdi:514`, `GET cfdi/:orderId:523`, `POST cfdi/:orderId/generate:529`, `.../cancel:536`.
Notifications: `POST notifications/campaigns:545`, `GET notifications/campaigns:566`.
Refunds: `GET refunds:574`, `POST refunds:583`, `PATCH refunds/:id/status:596`.
Reconciliation: `GET reconciliation:605`, `GET reconciliation/export:615`.
SEO/CMS: `GET seo:680`, `PUT seo/:page:686`, `GET cms:706`, `PUT cms/:key:712`.
Queues: `GET queues:728`.

**Approx total endpoints: ~118** (12 auth, 5 auctions, 4 bids, 4 wallet, 6 payments, 2 orders, 3 disputes, 3 shipments, 2 ratings, 11 users, 4 notifications, 3 watchlist, 1 upload, 2 health, 1 admin-auth, ~60 admin, 9 diagnostics).

---

## 2. BUSINESS RULES IN CODE

1. **Bid must exceed current price (strict `>`).** Enforced in CORE: `bidAmount <= currentPrice → invalid` (`core/src/domain/bid/bid-validation.ts:35`). API calls `BidValidation.validate` at `bids.service.ts:71-83`. Note: increment is **exactly +1 minimum** implicitly — there is **no configurable min-increment**; the "next min" surfaced in errors is `currentPrice + 1` (`bids.service.ts:82`).
2. **Seller cannot bid on own auction.** CORE `bidderId === sellerId → invalid` (`bid-validation.ts:31-33`); mapped to `BidOnOwnAuctionException` (`bids.service.ts:79-81`). Plus **self-outbid block**: a user who is already top bidder cannot re-bid (`bids.service.ts:86-89`).
3. **Bid only on ACTIVE/PUBLISHED and not-expired auctions.** `bids.service.ts:59-65` (status check allows PUBLISHED too; CORE-only-ACTIVE reason is deliberately skipped, comment `bids.service.ts:67-70`); `endsAt < now → not active` (`bids.service.ts:63`).
4. **Fund locking on bid (wallet hold-first).** Funds held before bid TX: `walletService.holdFunds` (`bids.service.ts:92-97`). Availability check CORE `canLockFunds` (`core/src/domain/wallet/wallet-calculation.ts:17-20`, `wallet.service.ts:182`). Wallet must be **active** to hold (`wallet.service.ts:175`). Balance decremented, heldFunds incremented atomically in a Prisma `$transaction` (`wallet.service.ts:186-215`).
5. **Outbid releases previous top bidder's funds** back to balance + BID_OUTBID notification (`bids.service.ts:137-162`). On any failure the placing user's just-held funds are released as compensation (`bids.service.ts:192-202`).
6. **Soft-close extension.** Window = config `AUCTION_SOFT_CLOSE_WINDOW_SEC` default **120s** (`bids.service.ts:100-101`, `system-config` default). If `timeRemaining < window`, `endsAt += window` and `auction:extended` emitted (`bids.service.ts:105-108, 122-129, 174-176`).
7. **Auction create requires seller flag.** `user.isSeller` false → Forbidden (`auctions.service.ts:47-49`). End must be after start (`auctions.service.ts:56-58`); start not >1min in past if explicitly set (`auctions.service.ts:62-64`). Created in DRAFT (`auctions.service.ts:78`).
8. **Auction edit/publish only from DRAFT.** Owner check (`auctions.service.ts:188-190, 226-228`) + CORE `AuctionStateMachine.canTransition(status, PUBLISHED)` gate (`auctions.service.ts:194-201, 231-238`). Valid transitions defined `core/src/domain/auction/auction-state-machine.ts:10-17`.
9. **Optional moderation on publish.** If config `REQUIRE_AUCTION_MODERATION === 'true'`, publish targets `PENDING_MODERATION` instead of PUBLISHED and keeps original dates (`auctions.service.ts:250-262`). Publish recomputes `endsAt = now + originalDuration` (fallback 7 days if duration ≤0) (`auctions.service.ts:242-247`).
10. **Platform fee = 10% (HARD-CODED) on capture.** `feePercentage = 0.1` (`wallet.service.ts:285`), debited from seller as `FEE_PLATFORM` ledger (`wallet.service.ts:356-367`). NOTE this differs from the configurable CommissionsService rate (rule 20) — two independent fee mechanisms.
11. **Capture flow at auction close:** buyer heldFunds → DEBIT_ORDER (balance already reduced at hold), seller balance += amount (CREDIT_SALE) then − fee (FEE_PLATFORM) (`wallet.service.ts:275-386`). Runs atomically inside the scheduler's close TX (`auction-scheduler.service.ts:149-156`).
12. **Order auto-created PAID at auction close** (winner=highest bid) with funds captured in same TX (`auction-scheduler.service.ts:127-160`). Manual `createFromAuction` path also exists (idempotent, winner-only, status PENDING_PAYMENT) but the public POST is **disabled/commented** (`orders.controller.ts:16-26`); service still present (`orders.service.ts:49-103`).
13. **Order state machine enforced on updateStatus.** CORE `OrderStateMachine.canTransition` (`orders.service.ts:159-168`); transitions `core/src/domain/order/order-state-machine.ts:5-11` (PENDING_PAYMENT→PAID/CANCELLED; PAID→SHIPPED/REFUNDED; SHIPPED→DELIVERED; DELIVERED→REFUNDED; CANCELLED/REFUNDED terminal).
14. **Shipment requires order PAID + seller.** Seller check (`shipments.service.ts:34-36`), order must be PAID (`shipments.service.ts:38-40`), one shipment per order (`shipments.service.ts:42-48`). Status update cascades: SHIPPED→order SHIPPED, DELIVERED→order DELIVERED, sets shippedAt/deliveredAt (`shipments.service.ts:103-125`).
15. **Dispute 14-day window.** CORE `DISPUTE_WINDOW_DAYS = 14` (`core/src/domain/dispute/dispute-state-machine.ts:12,26-29`); enforced `disputes.service.ts:55-59`. Reference date = order.deliveredAt if DELIVERED else updatedAt (`disputes.service.ts:50-53`). Order must be PAID/SHIPPED/DELIVERED (`disputes.service.ts:43-45`); one dispute per order (`disputes.service.ts:39-41`); participant-only (`disputes.service.ts:34-37`).
16. **Rating requires DELIVERED shipment + participant + one-per-author.** `order.shipment.status !== 'DELIVERED' → reject` (`ratings.service.ts:40-42`); participant check (`ratings.service.ts:33-38`); duplicate check (`ratings.service.ts:44-53`); target = counterparty (`ratings.service.ts:55`).
17. **Withdrawal daily limit = 5000 MXN (HARD-CODED).** `DAILY_LIMIT = 5000`, sums last-24h withdrawals (`wallet.controller.ts:130-134`, `wallet.service.ts:406-423`). Requires valid saved payment method (`wallet.controller.ts:126-127`). Balance sufficiency in service (`wallet.service.ts:124-130`).
18. **Deposit amount is trusted from the VERIFIED payment, not user input.** Payment verified first (`wallet.controller.ts:96-99`); mismatch between verified amount and requested → `PaymentMismatchException` (`wallet.controller.ts:104-108`). Prevents "pay $1 claim $1000". Currency standardized MXN (`payments.service.ts:52`).
19. **Webhook signature validation (never trust unvalidated).**
    - MercadoPago: requires `x-signature`,`x-request-id`,`data.id`; builds manifest `id:...;request-id:...;ts:...;` and validates via CORE `WebhookSignatureValidator.validateHmacSignature` (`mercadopago.provider.ts:137-180`). **Rejects (throws) if `MERCADO_PAGO_WEBHOOK_SECRET` unset** (`:138-140`).
    - PayPal: IPN re-post to `ipnpb[.sandbox].paypal.com/cgi-bin/webscr`, `validateIpnResponse` (`paypal.provider.ts:72-106`).
    - HeyBanco: HMAC-SHA256 over body, header `x-hey-signature`, compares `sha256=<hex>` (`heybanco.provider.ts:130-146`).
    Webhook credits wallet only on `status==='COMPLETED'` and reference prefix `DEP-<userId>-<ts>`, amount extracted from webhook metadata (`payments.service.ts:159-187`).
20. **Configurable commission (separate from rule 10).** `CommissionsService.calculateForOrder`: rate = seller override else GLOBAL config else **default 10** (`commissions.service.ts:37-47`); amount = total × rate/100, 2dp (`commissions.service.ts:22`); idempotent per order (`commissions.service.ts:12-13`); record status PENDING→COLLECTED (`commissions.service.ts:109-114`). **Not wired into the auction-close capture path** — appears admin/report-driven only.
21. **Refund creates ledger credit + flips order to REFUNDED.** CORE transition gate to REFUNDED (`refunds.service.ts:19-26`); amount 0<amt≤total (`refunds.service.ts:28-30`); one refund per order (`refunds.service.ts:17`); buyer wallet balance += amount, REFUND ledger, order→REFUNDED, audit event, all in one TX (`refunds.service.ts:32-89`). Currency MXN hard-coded (`refunds.service.ts:37`).
22. **Seller onboarding requirements gate.** Must accept terms (`users.service.ts:311-313`), not already seller (`:325-327`); requirements: state ACTIVE, email verified, displayName, profile address/city/country (`users.service.ts:377-414`).
23. **Password hashing bcrypt saltRounds=12** (`auth.service.ts:52,124,536,596`). Reset token expires 1h (`auth.service.ts:488`); email-verify token 24h (`auth.service.ts:128`); reset revokes all sessions (`auth.service.ts:539-552`). Forgot-password never reveals existence (`auth.service.ts:480-484`).
24. **JWT session model.** Access token default 15m, refresh 7d (`auth.service.ts:70-71`); refresh stored as DB Session row, validated for revoked/expired (`auth.service.ts:311-344`); role derived from `isSeller` — **no role column in DB** (`auth.service.ts:364,646`); BANNED users rejected at validateUser (`auth.service.ts:636`); SUSPENDED/PENDING blocked at login (`auth.service.ts:733-742`).
25. **2FA (TOTP) via otplib**, secret saved but disabled until verified (`two-factor-auth.service.ts:14-31`); enable/disable both require a valid current token (`:33-76`); login requires code if enabled (`auth.service.ts:259-272`).
26. **Auction close uses a Redis distributed lock** `lock:auction-close` TTL 60s to avoid multi-instance double-processing (`auction-scheduler.service.ts:45-75`).

---

## 3. SERVICES CATALOG

| Module → Service | Key methods | Responsibility / entities touched |
|---|---|---|
| auth/AuthService | register, login, refreshToken, logout, verifyEmail, forgot/reset/changePassword, validateUser, getMe | JWT+session lifecycle, bcrypt, email tokens. Entities: User, Session, Profile |
| auth/TwoFactorAuthService | generateSecret, verifyAndEnable, disable, validateToken | TOTP 2FA. Entity: User |
| auctions/AuctionsService | create, findAll, findOne, update, publish, mapToResponse | Auction CRUD + DRAFT/PUBLISH state gate. Entity: Auction, User |
| bids/BidsService | placeBid, getBidsForAuction, getUserActiveBids, getUserBids | Bid placement, fund hold/release orchestration, WS emit, audit. Entities: Auction, Bid, Wallet |
| wallet/WalletService | getWallet, getBalance, deposit, withdraw, holdFunds, releaseFunds, captureHeldFunds, getHistory, getDailyWithdrawals | Balance + held funds + immutable Ledger; 10% capture fee. Entities: Wallet, Ledger |
| payments/PaymentsService | initiatePayment, verifyPayment, createCheckoutSession, handleWebhook, getAvailableProviders, processPayment | Provider abstraction (Stripe/MP/PayPal/HeyBanco), webhook→deposit. Entities: UserPaymentMethod, (Payment via providers) |
| orders/OrdersService | createFromAuction, findAllForUser/Seller, findOne, updateStatus, enrichOrder | Order lifecycle + ledger link. Entities: Order, Auction, Bid, Ledger |
| disputes/DisputesService | create, findAllByUser, findOne | 14-day dispute open + participant checks. Entities: Dispute, Order |
| shipments/ShipmentsService | create, findOne, updateStatus | Carrier tracking, cascades order status. Entities: Shipment, Order |
| ratings/RatingsService | create, findAllByTarget | Post-delivery reputation. Entities: Rating, Order, Shipment |
| commissions/CommissionsService | calculateForOrder, resolveRate, upsertGlobal/SellerRate, getRecords, markCollected | Configurable platform fee tracking. Entities: CommissionRecord, CommissionConfig, Order |
| refunds/RefundsService | createRefund, listRefunds, updateStatus | Refund + wallet credit + order→REFUNDED. Entities: RefundRequest, Order, Wallet, Ledger, AuditEvent |
| notifications/NotificationsService | create, findAllByUser, markAsRead, markAllAsRead, getUnreadCount | In-app notifications. Entity: Notification |
| notifications/EmailService | sendVerificationEmail, sendPasswordResetEmail | SMTP email |
| users/UsersService | getOwnProfile, updateProfile, getUserStats, getVerificationStatus, get/updateSettings, resendVerificationEmail, enableSeller, getPublicProfile | Profile + seller onboarding. Entities: User, Profile |
| watchlist/WatchlistService | findAll, add, remove | Buyer watchlist. Entities: Watchlist, Auction |
| kyc/KycService | getQueue, getSubmission, approve, reject, requestCorrection, submit | KYC review; approve sets isSeller. Entities: KycSubmission, User |
| cfdi/CfdiService | getCfdi, list, generate, cancel, get/updateConfig | Mexican fiscal invoice — **STUB** (see §7). Entity: CfdiRecord |
| cms/CmsService, seo/SeoService | content/SEO metadata | Entities: CMS/SEO config |
| system-config/SystemConfigService | get, getNumber, set | Runtime config key/value (soft-close window, moderation flag, CFDI keys) |
| feature-flags/FeatureFlagsService | flag evaluation | Feature toggles |
| audit/AuditPersistenceService | recordAudit | Immutable AuditEvent log |
| admin/AdminService | ~40 methods: stats, user/auction/order/payment mgmt, moderation, dispute resolution, reconcile | Admin ops across most entities |
| scheduler/AuctionSchedulerService | handleCron, startScheduledAuctions, closeExpiredAuctions | Cron state transitions (see §4/§5) |
| scheduler+system-cleanup/SystemCleanupService | cleanupAuditLogs / cleanOldLogs | Log retention |

---

## 4. STATE MACHINES / LIFECYCLE (as implemented)

**Auction** (`core/src/domain/auction/auction-state-machine.ts:10-17`, enforced in auctions.service + scheduler):
`DRAFT → {PUBLISHED, CANCELLED}` · `PUBLISHED → {ACTIVE, CANCELLED}` · `ACTIVE → {CLOSED, CANCELLED, SUSPENDED}` · `PENDING_MODERATION → {PUBLISHED, CANCELLED}` · `SUSPENDED → {PUBLISHED}` · CLOSED/CANCELLED terminal.
Runtime advances: DRAFT→PUBLISHED (`auctions.service.ts:254`), PUBLISHED→ACTIVE by scheduler (`auction-scheduler.service.ts:81-91`), ACTIVE→CLOSED by scheduler (`auction-scheduler.service.ts:130-133`), first bid also forces status ACTIVE (`bids.service.ts:126`). Scheduler must skip PENDING_MODERATION/SUSPENDED (`auction-state-machine.ts:23-26`).
⚠ Admin cancel/approve/reject/suspend/force-close/reopen write status **directly via prisma.update, bypassing the CORE state machine** (e.g. `admin.service.ts:114`, :409, :421).

**Order** (`core/src/domain/order/order-state-machine.ts:5-11`):
`PENDING_PAYMENT → {PAID, CANCELLED}` · `PAID → {SHIPPED, REFUNDED}` · `SHIPPED → {DELIVERED}` · `DELIVERED → {REFUNDED}` · CANCELLED/REFUNDED terminal. Enforced `orders.service.ts:159-168`, `refunds.service.ts:19-26`. Scheduler creates orders directly as PAID (`auction-scheduler.service.ts:144`); shipments write SHIPPED/DELIVERED directly (`shipments.service.ts:115-124`, no state-machine call).

**Dispute** (`core/src/domain/dispute/dispute-state-machine.ts:5-10`):
`OPEN → {IN_MEDIATION, CLOSED}` · `IN_MEDIATION → {RESOLVED, CLOSED}` · `RESOLVED → {CLOSED}` · CLOSED terminal. Admin resolution sets RESOLVED / IN_MEDIATION directly via prisma (`admin.service.ts:875-899`) **without** invoking canTransition.

**Payment (verification result)** — not a persisted enum machine; provider results normalized to `COMPLETED|PENDING|FAILED` (`payments.service.ts:12-17,113-118`). MP `approved`→COMPLETED (`mercadopago.provider.ts:194`), PayPal `Completed`→COMPLETED (`paypal.provider.ts:96`).

**User state** (`UserState` from Prisma): PENDING_VERIFICATION → ACTIVE (on email verify, `auth.service.ts:446`); SUSPENDED/BANNED gate access (`auth.service.ts:733-742`, `:636`).

---

## 5. SCHEDULER/CRON + WEBSOCKET

**Cron jobs (only 3 in codebase):**
1. `AuctionSchedulerService.handleCron` — **EVERY_MINUTE** (`auction-scheduler.service.ts:36`). Runs `startScheduledAuctions` (PUBLISHED+startsAt≤now → ACTIVE, `:81-91`) then, under Redis lock, `closeExpiredAuctions` (ACTIVE+endsAt≤now → CLOSED, create PAID order for winner, capture funds, release losers' held funds, notify winner/seller/losers, emit `auction.closed` domain event via EventEmitter2) (`:105-254`).
2. `scheduler/SystemCleanupService.cleanupAuditLogs` — **EVERY_DAY_AT_MIDNIGHT**, deletes AuditEvent >90 days (`scheduler/system-cleanup.service.ts:14-34`).
3. `system-cleanup/SystemCleanupService.cleanOldLogs` — **EVERY_DAY_AT_MIDNIGHT**, deletes AuditEvent + RequestLog >30 days (`system-cleanup/system-cleanup.service.ts:18-40`). ⚠ **Two overlapping cleanup services with conflicting retention (90 vs 30 days)** — see §7.

**WebSocket gateways:**
- `AuctionsGateway` namespace `auctions` (`auctions.gateway.ts:19-25`). Inbound: `joinAuction`, `leaveAuction` (room `auction:<id>`). Outbound emits: `bid:new` (`:48`), `auction:extended` (`:52`), `auction:ended` (`:56`). CORS from `ALLOWED_ORIGINS` env. ⚠ **No auth guard on WS** — JWT guard commented out (`auctions.gateway.ts:9-11`); read-only room joins.
- `EventsGateway` namespace `events` (`events.gateway.ts:19-25`). joinAuction/leaveAuction + generic `emitAuctionEvent`. Logs connect/disconnect. Also unauthenticated.
Bid placement emits via AuctionsGateway (`bids.service.ts:167,175`).

---

## 6. CROSS-MODULE DEPENDENCY NOTES

- **BidsService** injects: PrismaService, WalletService, NotificationsService, AuditPersistenceService, AuctionsGateway, SystemConfigService (`bids.service.ts:30-39`). Central hub for a bid.
- **AuctionSchedulerService** injects: Prisma, WalletService, NotificationsService, DistributedLockService, SystemConfigService, EventEmitter2 (`auction-scheduler.service.ts:27-34`).
- **ShipmentsService** injects OrdersService (`shipments.service.ts:19`).
- **WalletController** injects PaymentsService + WalletService + Prisma (`wallet.controller.ts:38-42`) — deposit verifies payment before crediting.
- **AuthService** injects AuditPersistenceService, EmailService, TwoFactorAuthService (`auth.service.ts:64-66`).
- **AdminService** injects SystemConfigService, CommissionsService, KycService, CfdiService, NotificationQueueProducer (`admin.service.ts:11-18`) — admin is the umbrella exposing commissions/kyc/cfdi/refunds/seo/cms (those modules have **no own controllers**).
- **@ironloot/core** is imported by bids, auctions, orders, disputes, refunds, wallet, scheduler, payments providers — single source of domain rules.
- Payment providers (Stripe/MercadoPago/PayPal/HeyBanco) injected into PaymentsService (`payments.service.ts:24-28`).

---

## 7. NOTABLE GAPS / STUBS

1. **CFDI (Mexican fiscal invoicing) is a STUB.** `generate()` writes ERROR/PENDING record then `throw new NotImplementedException` — PAC integration not built (`cfdi.service.ts:33-67`). References "PENDING_TASKS.md task 84-85". `getConfig` returns masked `pacApiKey:'****'` (`cfdi.service.ts:80`).
2. **Payment reconciliation is a STUB.** `AdminService.reconcilePayments` returns internal records only; `providerOnly:[]`, `matched:[]`, note "requires API credentials" (`admin.service.ts:904-925`).
3. **Dispute resolution does not move money.** `resolveDisputeFavorBuyer` just sets status RESOLVED and returns a *note* "Initiate refund via POST /admin/refunds" — no automatic refund/capture (`admin.service.ts:868-891`).
4. **Duplicate/overlapping platform-fee logic:** hard-coded 10% at capture (`wallet.service.ts:285`) vs configurable CommissionsService rate (`commissions.service.ts:46`). CommissionsService is **not invoked** in the auction-close/capture flow — potential double-count or orphan record risk.
5. **Two conflicting cleanup crons** (90-day vs 30-day retention) both `@Cron(EVERY_DAY_AT_MIDNIGHT)` deleting AuditEvent — `scheduler/system-cleanup.service.ts` vs `system-cleanup/system-cleanup.service.ts`. Effective retention = 30 days (stricter wins). Likely leftover duplication.
6. **WebSocket gateways are unauthenticated** — `JwtAuthGuard` commented out in AuctionsGateway (`auctions.gateway.ts:9-11`); any client can join any `auction:<id>` room and receive bid streams.
7. **Admin auth via static creds + optional TOTP.** Username/password compared to env `ADMIN_USERNAME/ADMIN_PASSWORD` (defaults `admin`/`admin`) (`admin-auth.controller.ts:42-47`); API-key fallback default `dev-admin-key` (`admin-dual-auth.guard.ts:53`, `admin-api-key.guard.ts:11`). Dangerous if env not overridden in prod. Admin-auth login is `@SkipThrottle()` (`admin-auth.controller.ts:15`) — no brute-force limiting.
8. **Admin bypasses domain state machines** — auction/dispute status changed via raw `prisma.update` (§4), so invalid transitions are possible administratively.
9. **Manual order-creation endpoint disabled** (commented out, `orders.controller.ts:16-26`) though `OrdersService.createFromAuction` remains reachable via other paths — dead-ish code.
10. **Diagnostics** guarded only by `DevelopmentOnlyGuard`; comment notes `// @Public() ... (TODO: restrict in production)` (`diagnostics.controller.ts:19-20`) — exposes logs/audit/requests/metrics.
11. **No configurable bid increment** — minimum raise is effectively +1 (rule 1); no per-auction step config found.
12. **Withdrawal daily limit (5000) and capture fee (10%) are hard-coded constants**, not runtime config (`wallet.controller.ts:130`, `wallet.service.ts:285`).
13. **Stripe/HeyBanco providers are conditionally active** via `checkStatus()`; only MercadoPago + PayPal are always listed (`payments.service.ts:192-196`).
14. **`processPayment` only supports MercadoPago**; other providers throw (`payments.service.ts:203-208`). PayPal `verifyPayment` throws "requires IPN" (`paypal.provider.ts:67-70`).
