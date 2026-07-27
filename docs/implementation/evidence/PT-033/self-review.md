# PT-033 — Self-Review

**Date:** 2026-06-23  
**Reviewer:** Agent (STATE 5 automated self-review)  
**Branch:** fix/PT-033-auth-email-links  
**Status:** VALIDATION_PENDING

---

## 1. Acceptance Criteria (from DISCOVERY.md)

| # | Criterion | Verified | Evidence |
|---|-----------|----------|----------|
| AC-1 | `sendVerificationEmail()` builds URL as `{BASE_URL}/auth/verify-email?token=...` | ✓ | `test-results.md` — test "should generate verification URL pointing to BASE_URL" GREEN |
| AC-2 | `sendPasswordResetEmail()` builds URL as `{BASE_URL}/auth/reset-password?token=...` | ✓ | `test-results.md` — test "should generate reset-password URL pointing to BASE_URL" GREEN |
| AC-3 | Default fallback for `BASE_URL` is `http://localhost:5174` (port BASE, not CLIENT) | ✓ | `test-results.md` — test "should read BASE_URL from ConfigService with correct default fallback" GREEN |
| AC-4 | Docker-compose `api` service has `BASE_URL=http://base.localhost` | ✓ | `docker-compose.yml:96` — `- BASE_URL=http://base.localhost` present |
| AC-5 | `.env.example` documents `BASE_URL` with comment and local dev default | ✓ | `.env.example:53-59` — section "Service URLs (PT-033)" present |
| AC-6 | BASE `NotFoundExceptionFilter` is registered in `main.ts` | ✓ | `src/apps/base/src/main.ts:8,37` — import + `useGlobalFilters` present; `build-base.md` — 0 build errors |
| AC-7 | Full test suite: 153/153 pass, no regressions | ✓ | `test-results.md` — 29 suites, 153 tests, 0 failures |
| AC-8 | TypeScript: 0 type errors across all changes | ✓ | `test-results.md` — `tsc --noEmit` exit 0 |

---

## 2. Test Scenarios (from changes/PT-033-auth-email-links/test-scenarios.md)

| Scenario | Description | Status | Notes |
|----------|-------------|--------|-------|
| TS-033.1 | Verify-email URL uses BASE_URL domain | PASS | Unit test GREEN |
| TS-033.2 | Reset-password URL uses BASE_URL domain | PASS | Unit test GREEN |
| TS-033.3 | Default fallback → localhost:5174 (not :5173) | PASS | Unit test GREEN |
| TS-033.4 | MailerService error does not propagate | PASS | Unit test GREEN |
| TS-033.5 | BASE 404 returns HTML without sidebar | PASS | `NotFoundExceptionFilter` registered; `build-base.md` clean; filter renders `pages/404.html` which extends `layouts/base.html` (no sidebar) — verified by code inspection |
| TS-033.6 | 404 on unknown BASE route → HTTP 404 status (not JSON) | PASS | Filter logic verified: renders template with `res.status(404)` |
| TS-033.7 | docker-compose api service contains BASE_URL | PASS | `docker-compose.yml:96` direct observation |
| TS-033.8 | `.env.example` documents BASE_URL | PASS | `.env.example:53-59` direct observation |

TS-033.5 and TS-033.6 are integration-level scenarios. Full E2E confirmation requires a running stack.  
These are marked PASS based on code structure verification; flagged for human E2E confirmation in STATE 6.

---

## 3. FDGE Self-Review Checklist

- [x] **All acceptance criteria verified?** — Yes, 8/8 AC confirmed above.
- [x] **All test scenarios passing?** — Yes, 8/8 TS confirmed (TS-033.5/6 flagged for E2E).
- [x] **No unintended side effects in related components?** — 29/29 suites pass; `auth.service.spec.ts`, `notifications.service.spec.ts` unchanged and GREEN.
- [x] **11-Conventions.md rules respected?**
  - RULE-01 (Folder structure): new test placed at `test/unit/notifications/` — mirrors existing `test/unit/payments/`, `test/unit/auth/`.
  - RULE-02 (Naming): `email.service.spec.ts` follows `<name>.service.spec.ts` convention.
  - RULE-06 (TDD): tests written as RED before fix applied (commit `642a25b` before `caacdb0`).
  - No RULE-04 (webhook) or RULE-05 (ledger) violations — changes are unrelated to payment or wallet flows.
- [x] **Commits atomic, named with convention, traceable to PT-033?** — Yes, see `git-log.md`.
- [x] **No debugging artifacts, console.log, commented-out code?**
  - `email.service.ts`: no console.log, no commented code.
  - `main.ts` (BASE): no console.log added.
  - `email.service.spec.ts`: no leftover debugging code.
- [x] **Documentation updated if public API changed?** — No public API surface changed. `.env.example` and `docker-compose.yml` updated as documentation of the new required env var.

---

## 4. Root Cause — Verified Fixed

**Before (bug):**
```typescript
// src/api/src/modules/notifications/email.service.ts:17
this.frontendUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:5173');
```

**After (fix):**
```typescript
this.frontendUrl = this.configService.get<string>('BASE_URL', 'http://localhost:5174');
```

Direct observation: `email.service.ts:17` reads `BASE_URL` with default `http://localhost:5174`.  
Unit tests confirm the URL construction with `http://test-base.localhost` prefix.

---

## 5. Secondary Issue — Verified Fixed

`NotFoundExceptionFilter` was present at  
`src/apps/base/src/common/filters/not-found.filter.ts` but never registered.

**After:**  
`src/apps/base/src/main.ts:8` — import present.  
`src/apps/base/src/main.ts:37` — `app.useGlobalFilters(new NotFoundExceptionFilter())` registered.  
`build-base.md` — `nest build` exits 0.

---

## 6. Out-of-Scope Confirmation

The following were explicitly NOT addressed (per `changes/PT-033-auth-email-links/out-of-scope.md`):

- Data remediation for existing `PENDING_VERIFICATION` users — requires admin action.
- Email delivery testing (Mailhog E2E) — infrastructure not running in this session.
- Email template rendering (HTML/text) — no template files changed.
- Token expiry logic — not related to root cause.
- CLIENT-side auth flows (`/auth/login`, `/auth/register`) — unaffected.

---

## 7. Verdict

Self-review: **PASS**

All unit-level criteria verified. TS-033.5/6 (sidebar absence in 404) requires human E2E confirmation on a running stack.

**Status: VALIDATION_PENDING** — per FDGE rules, BUG type requires human validation before CLOSED.
