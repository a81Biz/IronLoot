# F-core-tests — Shared Domain Library & Test Coverage (Audit Phase 3)

Repo: c:\DevOps\Desarrollos\IronLoot · Scope: `src/packages/core/` + all test suites across `src/`.
Method: static source analysis only (tests were NOT executed). Test counts are `it()`/`test()` source-block
counts obtained by grep; where a spec uses `it.each([...])` the executed count is higher — such counts are
marked "approx".

---

## 1. CORE DOMAIN CONTENTS

The `@ironloot/core` package (`src/packages/core/package.json:2`, name `@ironloot/core`) is a pure,
dependency-light domain library: no HTTP, no DB, no NestJS. It is organized as
`domain/` (leaf rules), `application/` (use-cases), `contracts/` (repo interfaces), `events/`, `integrations/`.

### 1.1 State Machines

**Auction lifecycle** — `src/packages/core/src/domain/auction/auction-state-machine.ts:10-45`
Statuses: `src/packages/core/src/domain/auction/auction-status.enum.ts:1-9`
(DRAFT, PUBLISHED, ACTIVE, CLOSED, CANCELLED, SUSPENDED, PENDING_MODERATION).

| From | Allowed To | Cite |
|---|---|---|
| DRAFT | PUBLISHED, CANCELLED | line 11 |
| PUBLISHED | ACTIVE, CANCELLED | line 12 |
| ACTIVE | CLOSED, CANCELLED, SUSPENDED | line 13 |
| PENDING_MODERATION | PUBLISHED, CANCELLED | line 14 |
| SUSPENDED | PUBLISHED | line 15 |
| CLOSED | *(terminal)* | line 16 |
| CANCELLED | *(terminal)* | line 16 |

Also `isSchedulerAutoTransitionAllowed()` (line 42-44): scheduler is BLOCKED from auto-advancing
PENDING_MODERATION and SUSPENDED (`SCHEDULER_BLOCKED`, line 23-26) — admin intervention required.

**Order lifecycle** — `src/packages/core/src/domain/order/order-state-machine.ts:5-19`
Statuses: `order-status.enum.ts:1-8` (PENDING_PAYMENT, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED).

| From | Allowed To | Cite |
|---|---|---|
| PENDING_PAYMENT | PAID, CANCELLED | line 6 |
| PAID | SHIPPED, REFUNDED | line 7 |
| SHIPPED | DELIVERED | line 8 |
| DELIVERED | REFUNDED | line 9 |
| CANCELLED | *(terminal)* | line 10 |
| REFUNDED | *(terminal)* | line 10 |

**Dispute lifecycle** — `src/packages/core/src/domain/dispute/dispute-state-machine.ts:5-37`
Statuses: `dispute-status.enum.ts:1-6` (OPEN, IN_MEDIATION, RESOLVED, CLOSED).

| From | Allowed To | Cite |
|---|---|---|
| OPEN | IN_MEDIATION, CLOSED | line 6 |
| IN_MEDIATION | RESOLVED, CLOSED | line 7 |
| RESOLVED | CLOSED | line 8 |
| CLOSED | *(terminal)* | line 9 |

Dispute window rule: `canOpenDispute(deliveredAt, now)` — must open within
`DISPUTE_WINDOW_DAYS = 14` of delivery (`dispute-state-machine.ts:12, 26-29, 34-36`).

**Payment** has no explicit state machine object; payment progression is expressed through the *order*
state machine + `ProcessPaymentUseCase` (see §1.4). No standalone `PaymentStatus` machine exists in core.

### 1.2 Validators

**BidValidation** — `src/packages/core/src/domain/bid/bid-validation.ts:16-41`.
Pure static `validate(ctx)` evaluating rules in priority order (first failure returned):
1. Auction must be ACTIVE (line 23-25).
2. Bid amount must be > 0 (line 27-29).
3. Seller cannot bid on own auction — `bidderId !== sellerId` (line 31-33).
4. Bid amount must be strictly > currentPrice (line 35-37).
Note: there is **no minimum-increment rule** — any amount strictly above current price passes.
Increment is 1 only as a *hint* used by the API's exception message, not enforced by core.

**WebhookSignatureValidator** — `src/packages/core/src/domain/payment/webhook-signature-validator.ts:7-34`.
Timing-safe HMAC-SHA256 validation via `crypto.timingSafeEqual` (line 28); returns false on length
mismatch (line 24-26) and on any crypto error (line 29-32). Used by Mercado Pago provider.

**IPN validator (PayPal)** — `src/packages/core/src/domain/payment/ipn-validator.ts:14-24`.
`buildIpnVerificationPayload()` prefixes `cmd=_notify-validate&` (line 14-16);
`validateIpnResponse()` returns true only for exact `"VERIFIED"` (line 22-24). Used by PayPal provider.

**WalletCalculation** — `src/packages/core/src/domain/wallet/wallet-calculation.ts:5-30` (pure fund math):
`getAvailableBalance = balance - heldFunds` (line 9-11); `canLockFunds` requires amount>0 and
available ≥ amount (line 17-20); `calculateNewHeldFunds = currentHeld + bidAmount` (line 27-29).

### 1.3 Value Objects

**Money** — `src/packages/core/src/domain/money/money.ts:22-94`. Immutable, stored as integer **centavos**
(all arithmetic on integers to avoid float errors, line 17-21). Constructor rejects non-integer (line 27-29)
and negative (line 30-32) centavos; normalizes currency to uppercase (line 34). `fromDecimal` rounds
`amount*100` (line 37-40, accepts Prisma Decimal-like `{toNumber()}`). Ops: `add`/`subtract` (subtract
throws `InsufficientFundsError` on overdraw, line 61-67), comparisons, `toDecimal`/`toCentavos`/`toString`.
Custom errors: `InsufficientFundsError` (line 1-8), `CurrencyMismatchError` (line 10-15, thrown by
`assertSameCurrency`, line 50-54) — cross-currency operations are forbidden.

Supporting DTOs (not behavior): `shared/money.dto.ts`, `shared/pagination.dto.ts`.

### 1.4 Application Use-Cases (orchestration, depend only on `contracts/` interfaces)

- **PlaceBidUseCase** — `application/bids/place-bid.use-case.ts:21-64`. find auction → `BidValidation.validate`
  → find wallet → `WalletCalculation.canLockFunds` → `lockFunds` → `createBid` → `updateCurrentPrice` →
  emit `bid.placed`.
- **CloseAuctionUseCase** — `application/auctions/close-auction.use-case.ts:17-74`. Requires ACTIVE
  (line 31-33); finds highest bid; sets CLOSED; emits `auction.closed`; if a winner exists, creates order
  and emits `order.created` (line 54-70). No bid ⇒ closes with no order (line 50-52).
- **ProcessPaymentUseCase** — `application/payments/process-payment.use-case.ts:23-60`. Rejects if
  `isSignatureValid` false (line 30-32); **idempotency guard**: already PAID ⇒ `alreadyProcessed`
  (line 38-40); requires PENDING_PAYMENT (line 42-44); sets PAID; credits seller (`CREDIT_SALE`, line 47);
  emits `payment.completed`.
- **ProcessRefundUseCase** — `application/payments/process-refund.use-case.ts:24-55`. Refundable only from
  PAID/SHIPPED/DELIVERED (`REFUNDABLE_STATUSES`, line 18-22, 34-36); amount must be `>0` and `≤ totalAmount`
  (line 38-40); sets REFUNDED; credits buyer (`REFUND`, line 43); emits `refund.processed`.

Repository contracts (ports): `contracts/{auction,bid,order,wallet}-repository.interface.ts`.
Integration ports: `integrations/{payment-provider,email-service,storage-service,cfdi-pac-provider}.interface.ts`.
Events: `events/{bid-placed,auction-closed,order-created,payment-completed,refund-processed}.event.ts`.

---

## 2. DOMAIN RULES CENTRALIZED IN CORE (with duplication flags)

1. **Auction transition matrix** — core `auction-state-machine.ts:10-17`.
   USED by API: `src/api/src/modules/auctions/auctions.service.ts:16` imports `AuctionStateMachine`
   (comments at lines 192, 230 confirm DRAFT-edit and DRAFT→PUBLISHED checks delegate to core). Not duplicated.
2. **Scheduler auto-transition block (moderation/suspended)** — core `auction-state-machine.ts:23-26,42-44`.
3. **Order transition matrix** — core `order-state-machine.ts:5-11`. USED by API:
   `orders.service.ts:13` and `refunds.service.ts:4` import `OrderStateMachine`. Not duplicated.
4. **Dispute transition matrix + 14-day window** — core `dispute-state-machine.ts:5-11,12`.
   USED by API: `disputes.service.ts:11` imports `DisputeStateMachine`. Not duplicated.
5. **Bid validity (active / >0 / not-seller / > currentPrice)** — core `bid-validation.ts:22-40`.
   PARTIALLY DUPLICATED / DIVERGENT in API: `bids.service.ts:71-83` calls `BidValidation.validate`, but the
   API **re-adds and overrides** rules around it: it accepts bids on PUBLISHED as well as ACTIVE auctions
   (`bids.service.ts:59`), then deliberately swallows core's "Auction is not active" reason
   (`bids.service.ts:78`), and adds a self-outbid rule (`bids.service.ts:85-89`) that core does not model.
   → **FLAG: the production status rule diverges from core (PUBLISHED allowed in API, not in core).**
6. **Fund-locking math (available balance, canLockFunds, new held)** — core `wallet-calculation.ts:5-30`.
   USED by API: `wallet.service.ts:10,180-188` calls `WalletCalculation`. But the API's ledger/hold
   mechanics (`wallet.service.ts:164-262`) are implemented directly on Prisma with `Decimal`, not via core.
7. **Money as integer centavos + currency-safe arithmetic** — core `money.ts:22-94`.
   → **FLAG (unused abstraction): `Money` is NOT imported anywhere in `src/api` (grep: 0 hits).** The API
   performs money math with Prisma `Decimal` (e.g. `wallet.service.ts:188,234,293`). The float-safety and
   currency-mismatch guarantees proven by core's 30 Money tests are **not applied to the production money path** —
   a genuine duplication-of-concept with divergent implementation.
8. **HMAC-SHA256 webhook signature (timing-safe)** — core `webhook-signature-validator.ts:15-33`.
   USED by API: `payments/providers/mercadopago.provider.ts:9`. Not duplicated.
9. **PayPal IPN protocol** — core `ipn-validator.ts:14-24`. USED by API:
   `payments/providers/paypal.provider.ts:3`. Not duplicated.
10. **Payment idempotency + refund guards** — core `process-payment.use-case.ts:38-44`,
    `process-refund.use-case.ts:18-40`.
    → **FLAG (parallel-implementation duplication): the four core use-cases
    (PlaceBid, CloseAuction, ProcessPayment, ProcessRefund) are NOT wired into the API** — grep for
    `PlaceBidUseCase|CloseAuctionUseCase|ProcessPaymentUseCase|ProcessRefundUseCase` in `src/api/src` = 0 hits.
    The API re-implements the same orchestrations (bid-and-hold in `bids.service.ts:91-132`, close in
    `scheduler`, payment in `payments.service`, refund in `refunds.service`). The core use-case tests
    therefore validate a **parallel code path that production does not execute** → false confidence risk.

**Summary:** core centralizes the *leaf* rules (3 state machines, bid validation, wallet math, Money,
2 webhook validators) and these are largely reused by the API — EXCEPT (a) `Money` (unused; API uses
Decimal), (b) the bid status rule (API diverges to allow PUBLISHED), and (c) the four application
use-cases (present + tested in core but never invoked by the API, which duplicates the orchestration).

---

## 3. TEST INVENTORY

Counts are grepped `it()`/`test()` blocks (approx where `it.each` is used). CLAUDE.md advertises core as
"12 suites / 157 tests"; the 12 spec files below were confirmed. The grepped block count (~104) is lower
than 157 because several suites (notably `money.spec.ts`) expand cases via `it.each` — treat 157 as the
executed-case figure and the per-file numbers below as source blocks (approx).

### 3.1 CORE (`src/packages/core`) — 12 suites

| Suite/file | Area | ~count | type |
|---|---|---|---|
| domain/money/money.spec.ts | Money value object | 30 | unit |
| domain/wallet/wallet-calculation.spec.ts | fund-lock math | 12 | unit |
| domain/payment/ipn-validator.spec.ts | PayPal IPN | 11 | unit |
| domain/dispute/dispute-state-machine.spec.ts | dispute FSM + window | 7 | unit |
| domain/payment/webhook-signature-validator.spec.ts | HMAC sig | 7 | unit |
| domain/auction/auction-state-machine.spec.ts | auction FSM | 6 | unit |
| domain/bid/bid-validation.spec.ts | bid rules | 6 | unit |
| domain/order/order-state-machine.spec.ts | order FSM | 2 | unit |
| application/payments/process-refund.use-case.spec.ts | refund use-case | 8 | unit |
| application/bids/place-bid.use-case.spec.ts | place-bid use-case | 6 | unit |
| application/payments/process-payment.use-case.spec.ts | payment use-case | 5 | unit |
| application/auctions/close-auction.use-case.spec.ts | close use-case | 4 | unit |
| **CORE TOTAL** | | **~104 blocks (157 cases per CLAUDE.md)** | |

### 3.2 API unit / integration (`src/api/test/unit` + `src/api/src/**/*.spec.ts`) — 30 suites

| Suite/file | Area | ~count | type |
|---|---|---|---|
| test/unit/users/users.service.spec.ts | users/profile/seller | 21 | unit |
| test/unit/auctions/auctions.service.spec.ts | auction lifecycle | 11 | unit |
| src/common/redis/distributed-lock.service.spec.ts | redis lock | 11 | unit |
| test/unit/auth/auth.service.spec.ts | auth/JWT/2FA | 9 | unit |
| test/unit/wallet/wallet.service.spec.ts | wallet/ledger/hold | 8 | unit |
| test/unit/users/users.controller.spec.ts | users controller | 8 | unit |
| test/unit/disputes/disputes.service.spec.ts | disputes | 7 | unit |
| test/scheduler-lock.integration.spec.ts | scheduler locking | 7 | integration |
| test/unit/shipments/shipments.service.spec.ts | shipments | 6 | unit |
| test/unit/ratings/ratings.service.spec.ts | ratings | 6 | unit |
| test/unit/payments/payments.service.spec.ts | payments/webhooks | 6 | unit |
| test/unit/wallet/wallet.controller.spec.ts | wallet controller | 5 | unit |
| test/unit/notifications/email.service.spec.ts | email | 5 | unit |
| test/unit/auctions/auctions.controller.spec.ts | auction controller | 5 | unit |
| src/modules/notifications/notifications.controller.spec.ts | notif controller | 5 | unit |
| test/unit/notifications/notifications.service.spec.ts | notifications | 4 | unit |
| test/unit/bids/bids.service.spec.ts | **bids fund-lock** | 4 | unit |
| src/modules/shipments/shipments.controller.spec.ts | shipments ctrl | 4 | unit |
| src/modules/disputes/disputes.controller.spec.ts | disputes ctrl | 4 | unit |
| src/modules/diagnostics/diagnostics.controller.spec.ts | diagnostics | 4 | unit |
| test/unit/web-views/web-views.deprecation.spec.ts | deprecated web | 3 | unit |
| test/unit/scheduler/auction-scheduler.service.spec.ts | **auction close cron** | 3 | unit |
| test/unit/payments/payments.controller.spec.ts | payments ctrl | 3 | unit |
| src/modules/ratings/ratings.controller.spec.ts | ratings ctrl | 3 | unit |
| src/modules/auth/auth.controller.spec.ts | auth ctrl | 3 | unit |
| test/unit/health/health.controller.spec.ts | health | 2 | unit |
| test/unit/orders/orders.service.spec.ts | **orders** | 1 | unit |
| test/unit/orders/orders.controller.spec.ts | orders ctrl | 1 | unit |
| test/unit/bids/bids.controller.spec.ts | bids ctrl | 1 | unit |
| src/modules/wallet/wallet.service.spec.ts | wallet (extra) | 1 | unit |
| **API UNIT SUBTOTAL** | | **~161 blocks** | |

### 3.3 API e2e (`src/api/test/e2e`) — 15 suites (require running DB)

| Suite/file | Area | ~count | type |
|---|---|---|---|
| watchlist.e2e-spec.ts | watchlist | 9 | e2e |
| auth.e2e-spec.ts | auth flows | 8 | e2e |
| settings.e2e-spec.ts | user settings | 7 | e2e |
| bids.e2e-spec.ts | **bidding** | 7 | e2e |
| ratings.e2e-spec.ts | ratings | 6 | e2e |
| auctions.e2e-spec.ts | auctions | 6 | e2e |
| wallet.e2e-spec.ts | **wallet** | 5 | e2e |
| orders.e2e-spec.ts | orders | 5 | e2e |
| notifications.e2e-spec.ts | notifications | 5 | e2e |
| user-profile-sync.e2e-spec.ts | profile sync | 4 | e2e |
| shipments.e2e-spec.ts | shipments | 4 | e2e |
| profile-persistence.e2e-spec.ts | profile persist | 4 | e2e |
| payments.e2e-spec.ts | **payments** | 4 | e2e |
| disputes.e2e-spec.ts | disputes | 4 | e2e |
| orders-flow.e2e-spec.ts | end-to-end order flow | 1 | e2e |
| **API E2E SUBTOTAL** | | **~79 blocks** | |

### 3.4 Frontends
`src/apps/base`, `src/apps/client`, `src/admin`: **0 test files** (find for `*.spec.ts`/`*.test.ts` = none).
The SSR sites and admin dashboard are entirely untested.

**REPO TOTAL: ~57 suite files · ~344 grepped test blocks (core executed-case count per CLAUDE.md is 157).**

---

## 4. COVERAGE MAP (per API module)

Legend: TESTED (unit+e2e, incl. service logic) · PARTIAL (thin or controller-only or e2e-only) · UNTESTED.

| Module | Status | Evidence / note |
|---|---|---|
| auth | TESTED | auth.service 9 + auth.controller 3 + e2e 8 |
| users | TESTED | users.service 21 + controller 8 + settings/profile e2e |
| auctions | TESTED | service 11 + controller 5 + e2e 6; delegates FSM to core |
| disputes | TESTED | service 7 + controller 4 + e2e 4; core FSM tested |
| shipments | TESTED | service 6 + controller 4 + e2e 4 |
| ratings | TESTED | service 6 + controller 3 + e2e 6 |
| notifications | TESTED | service 4 + controller 5 + e2e 5 |
| wallet | TESTED* | service 8+1 + controller 5 + e2e 5 — but held-fund conversion on close is thin (see gaps) |
| health | TESTED | 2 (trivial) |
| common/redis lock | TESTED | distributed-lock 11 + scheduler-lock integration 7 |
| **bids** | **PARTIAL** | fund-locking is a critical money path but only **4** service unit tests (`bids.service.spec.ts`) + 7 e2e. Hold-before-transaction path (`bids.service.ts:92` outside tx `:111`) under-tested |
| **payments** | **PARTIAL** | service 6 + e2e 4. Core sig-validators well tested; API webhook idempotency/credit path thin |
| **orders** | **PARTIAL** | service **1** + controller 1 + e2e 5. Order creation/transition logic barely unit-tested |
| **scheduler** | **PARTIAL** | auction-close cron only **3** unit tests + lock integration 7. Winner selection / fund settlement on close weakly covered |
| diagnostics | PARTIAL | controller 4 only |
| watchlist | PARTIAL | e2e 9, **no unit tests** |
| **refunds** | **UNTESTED** | `refunds.service.ts` exists, **0 specs**. Only the *unwired* core `ProcessRefundUseCase` (8 tests) covers the concept |
| **commissions** | **UNTESTED** | `commissions.service.ts` exists, **0 specs**. Platform fee math unverified |
| **kyc** | UNTESTED | no specs |
| **cfdi** | UNTESTED | fiscal invoice (CFDI) — no specs |
| **cms** | UNTESTED | no specs |
| **audit** | UNTESTED | immutable event log — no specs |
| feature-flags | UNTESTED | no specs |
| seo | UNTESTED | no specs |
| system-cleanup | UNTESTED | scheduled deletion — no specs |
| system-config | UNTESTED | runtime config (drives soft-close window etc.) — no specs |
| upload | UNTESTED | file upload — no specs |
| admin | UNTESTED | no specs |

**Financial/auction critical-path verdict:**
- Bid fund-locking: core math TESTED (wallet-calculation 12) but production path (`bids.service`) PARTIAL (4 unit).
- Auction close & settlement: core `CloseAuctionUseCase` TESTED (4) but **unwired**; production path (scheduler) PARTIAL (3).
- Wallet ledger: TESTED at unit level (8) though held→settled conversion under-covered.
- Payment webhooks: signature validation TESTED (core HMAC 7 + IPN 11); production webhook handling PARTIAL (6).
- Disputes: TESTED (core FSM 7 + service 7).
- Commissions (platform fees): **UNTESTED**.
- Refunds (production service): **UNTESTED** (only unwired core use-case is tested).

---

## 5. COVERAGE GAPS — highest risk, ranked

1. **Commissions module has ZERO tests** (`commissions.service.ts`, no spec). Platform fee/commission math is
   direct revenue logic; a miscalculation is money lost or overcharged with no test guard. (D1/D2, money.)
2. **Refunds production service has ZERO tests** (`refunds.service.ts`, no spec). The only refund coverage is
   core `ProcessRefundUseCase` (8 tests) which the API does not call — so refund amount/status guards
   (over-refund, refund-from-wrong-status) are unverified in the code that actually runs. (money, high risk.)
3. **Core application use-cases are tested but not executed in production.** PlaceBid/CloseAuction/
   ProcessPayment/ProcessRefund use-cases (23 tests total) are never imported by `src/api` (grep = 0). The
   tests give false confidence that the money orchestration is covered while the real API paths
   (`bids.service`, `scheduler`, `payments.service`, `refunds.service`) carry far fewer tests. (structural.)
4. **Auction close / winner settlement** — the real close path is the scheduler cron with only 3 unit tests
   (`auction-scheduler.service.spec.ts`). Winner selection, held→charge conversion, and release of losers'
   funds on close are the platform's single most important financial event and are weakly covered. (money.)
5. **Bid fund-locking race window** — `bids.service.ts:92` holds funds BEFORE opening the DB transaction at
   `:111`; if the transaction fails the compensating release relies on catch paths, and only 4 unit tests
   exist. No test evidence for hold-without-bid rollback / concurrent-bid double-hold. (money, concurrency.)
6. **Money value object unused in production** — `Money` (30 tests, integer-centavos, currency-safe) is not
   imported by the API, which uses Prisma `Decimal` for all balance/refund/commission math. The float-safety
   and currency-mismatch guarantees are proven only in core, not applied where money actually moves. (money.)
7. **Payment webhook idempotency in the API** — core proves signature validation and the idempotency concept,
   but the API `payments.service` (6 unit tests) is the actual webhook handler; duplicate-delivery and
   seller-credit idempotency need dedicated production-path tests. (money, security.)
8. **Bid status rule divergence untested** — API deliberately allows bids on PUBLISHED auctions and suppresses
   core's "not active" reason (`bids.service.ts:59,78`); no test locks this divergence, so a future core change
   could silently break it or re-open bidding on non-active auctions. (regression risk.)
9. **audit / system-config / cfdi / kyc untested** — the immutable audit log, the runtime config that drives
   business constants (soft-close window), Mexican fiscal CFDI, and KYC identity gating all have 0 tests.
10. **Entire frontend layer untested** — `base`, `client`, `admin` have no test files; BFF token handling,
    CSRF, and money-facing UI flows have no automated coverage.
