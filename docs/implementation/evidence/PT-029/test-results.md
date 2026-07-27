# PT-029 — Evidence: Test Results

**Date:** 2026-06-23  
**Branch:** fix/PT-029-withdraw-payment-method-validation  
**Commits:** 7a8eec2, e9561d5

## RED Phase (before implementation)

```
FAIL test/unit/payments/payments.service.spec.ts
  TS2339: Property 'getUserPaymentMethod' does not exist on type 'PaymentsService'.

FAIL test/unit/wallet/wallet.controller.spec.ts
  TS2769: No overload matches this call — 'getUserPaymentMethod' not assignable to keyof PaymentsService.

Test Suites: 2 failed, 2 total
Tests: 0 total (suite-level failures)
```

## GREEN Phase (after implementation)

```
PASS test/unit/payments/payments.service.spec.ts (5.675 s)
PASS test/unit/wallet/wallet.controller.spec.ts (5.973 s)

Test Suites: 2 passed, 2 total
Tests: 10 passed, 10 total
```

## Full Suite (regression check)

```
Test Suites: 28 passed, 28 total
Tests: 145 passed, 145 total
Snapshots: 0 total
Time: 14.671 s
```

No regressions. All 145 tests pass.

## New Tests Covering PT-029

### payments.service.spec.ts — getUserPaymentMethod (PT-029)
- `should return null for unknown referenceId` ✓
- `should return the method when it exists and is active` ✓
- `should query with userId, referenceId, and isActive: true` ✓

### wallet.controller.spec.ts — withdraw (PT-029)
- `should return 400 when payment method is not registered` ✓
- `should proceed when payment method is registered` ✓

## DB Evidence

`prisma db push` output:
```
Your database is now in sync with your Prisma schema. Done in 125ms
✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 190ms
```

Table `user_payment_methods` created with:
- `@@unique([userId, referenceId])` — prevents duplicate registration
- `onDelete: Cascade` — cleanup on user deletion
