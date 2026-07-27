# PT-034 — Evidence: Test Results

**Date:** 2026-06-23  
**Branch:** fix/PT-034-cookie-domain-docker  
**Command:** `cd src/api && npm test --no-coverage --verbose`

---

## Full test suite (regression check)

```
PASS test/unit/users/users.service.spec.ts
PASS src/common/redis/distributed-lock.service.spec.ts
PASS test/unit/shipments/shipments.service.spec.ts
PASS src/modules/wallet/wallet.service.spec.ts
PASS test/unit/wallet/wallet.service.spec.ts
PASS src/modules/notifications/notifications.controller.spec.ts
PASS test/unit/ratings/ratings.service.spec.ts
PASS test/unit/auctions/auctions.service.spec.ts
PASS test/unit/orders/orders.controller.spec.ts
PASS test/unit/notifications/email.service.spec.ts
PASS test/unit/users/users.controller.spec.ts
PASS test/unit/auctions/auctions.controller.spec.ts
PASS src/modules/disputes/disputes.controller.spec.ts
PASS test/unit/scheduler/auction-scheduler.service.spec.ts
PASS test/unit/bids/bids.service.spec.ts
PASS src/modules/ratings/ratings.controller.spec.ts
PASS test/unit/web-views/web-views.deprecation.spec.ts
PASS test/unit/payments/payments.service.spec.ts
PASS src/modules/diagnostics/diagnostics.controller.spec.ts
PASS src/modules/shipments/shipments.controller.spec.ts
PASS src/modules/auth/auth.controller.spec.ts
PASS test/unit/orders/orders.service.spec.ts
PASS test/unit/disputes/disputes.service.spec.ts
PASS test/unit/health/health.controller.spec.ts
PASS test/unit/notifications/notifications.service.spec.ts
PASS test/unit/bids/bids.controller.spec.ts
PASS test/unit/wallet/wallet.controller.spec.ts
PASS test/unit/payments/payments.controller.spec.ts
PASS test/unit/auth/auth.service.spec.ts

Test Suites: 29 passed, 29 total
Tests:       153 passed, 153 total
Snapshots:   0 total
Time:        11.841 s
```

**Resultado:** 0 regresiones. PT-034 no modifica `src/` — los tests confirman que los cambios de configuración no impactan el suite de unidad.

---

## TypeScript type check (pre-commit hook)

```
Command: tsc --noEmit (ejecutado por pre-commit hook)
Exit:    0 — sin errores
```
