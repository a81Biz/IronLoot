# PT-033 — Evidence: Git Commits

**Date:** 2026-06-23  
**Branch:** fix/PT-033-auth-email-links  
**Command:** `git log --oneline -6`

---

## Commit log

```
029f2b8 fix: PT-033 add BASE_URL config for API service in docker-compose and .env.example
49c556b fix: PT-033 register NotFoundExceptionFilter in BASE
caacdb0 fix: PT-033 EmailService uses BASE_URL for auth email links
642a25b test: PT-033 add failing tests for EmailService URL construction
6e3395f refactor: migrate ThrottlerModule to Redis storage for multi-instance rate limiting  ← master base
f5b6361 Merge fix/PT-029-withdraw-payment-method-validation → master
```

## Verification

4 PT-033 commits, each atomic and named per convention:

| Commit | Type | Scope | Convention OK |
|--------|------|-------|---------------|
| `642a25b` | `test:` | PT-033.1 — EmailService test (RED) | ✓ |
| `caacdb0` | `fix:` | PT-033.2 — EmailService root cause fix | ✓ |
| `49c556b` | `fix:` | PT-033.3 — BASE NotFoundExceptionFilter | ✓ |
| `029f2b8` | `fix:` | PT-033.4+5 — docker-compose + .env.example | ✓ |

All commits traceable to PT-033 task IDs. No "WIP" or unclean messages.
