# PT-033 — Evidence: Test Results

**Date:** 2026-06-23  
**Branch:** fix/PT-033-auth-email-links  
**Command:** `cd src/api && npm test --no-coverage`

---

## EmailService unit tests (targeted)

```
PASS test/unit/notifications/email.service.spec.ts
  EmailService
    sendVerificationEmail
      ✓ should generate verification URL pointing to BASE_URL (10 ms)
      ✓ should not throw when mailerService fails (1 ms)
    sendPasswordResetEmail
      ✓ should generate reset-password URL pointing to BASE_URL (1 ms)
      ✓ should not throw when mailerService fails (1 ms)
    BASE_URL configuration
      ✓ should read BASE_URL from ConfigService with correct default fallback (2 ms)

Tests: 5 passed, 5 total
Time:  2.989 s
```

---

## Full test suite (regression check)

```
Test Suites: 29 passed, 29 total
Tests:       153 passed, 153 total
Snapshots:   0 total
Time:        11.58 s
```

All 29 suites pass. No regressions introduced.

### Suites verified:
- `test/unit/notifications/email.service.spec.ts` — NEW (PT-033)
- `test/unit/notifications/notifications.service.spec.ts`
- `test/unit/auth/auth.service.spec.ts`
- `src/modules/auth/auth.controller.spec.ts`
- `test/unit/bids/bids.service.spec.ts`
- `test/unit/bids/bids.controller.spec.ts`
- `test/unit/wallet/wallet.controller.spec.ts`
- `src/modules/wallet/wallet.service.spec.ts`
- `test/unit/payments/payments.service.spec.ts`
- `test/unit/payments/payments.controller.spec.ts`
- `test/unit/users/users.controller.spec.ts`
- `test/unit/orders/orders.service.spec.ts`
- `test/unit/orders/orders.controller.spec.ts`
- `test/unit/auctions/auctions.controller.spec.ts`
- `test/unit/scheduler/auction-scheduler.service.spec.ts`
- `test/unit/disputes/disputes.service.spec.ts`
- `test/unit/disputes/disputes.controller.spec.ts`
- `src/modules/disputes/disputes.controller.spec.ts`
- `test/unit/health/health.controller.spec.ts`
- `src/modules/shipments/shipments.controller.spec.ts`
- `src/modules/ratings/ratings.controller.spec.ts`
- `src/modules/diagnostics/diagnostics.controller.spec.ts`
- `test/unit/web-views/web-views.deprecation.spec.ts`
- (6 additional suites — all PASS)

### Expected noise (not regressions):
- `[AuctionSchedulerService] Failed to close auction auction-1` — from `auction-scheduler.service.spec.ts` which deliberately simulates a wallet-not-found error scenario.
- `[DistributedLockService] Failed to acquire lock` — from `distributed-lock.service.spec.ts` which tests Redis failure paths.

---

## TypeScript type check

```
Command: cd src/api && npm run typecheck
Output:  (empty — no errors)
Exit:    0
```

0 type errors after all PT-033 changes.
