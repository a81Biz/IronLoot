# 09 — Security Architecture

**Source:** `src/api/src/main.ts`, `src/apps/base/src/main.ts`, `src/apps/client/src/main.ts`, `src/api/src/modules/auth/auth.controller.ts`, `.env.example`

## 1. Authentication Model

### API — JWT Bearer Tokens
- Access token: short-lived (default 15m, `JWT_ACCESS_EXPIRY`)
- Refresh token: long-lived (default 7d, `JWT_REFRESH_EXPIRY`), stored in DB (`sessions` table)
- `JwtAuthGuard` applied **globally** as `APP_GUARD` — all routes protected by default
- Routes opt out of auth with `@Public()` decorator
- Token payload: `{ id, email, state, isSeller, ... }`

Source: `src/api/src/app.module.ts:140-151`, `src/api/src/modules/auth/decorators/auth.decorators.ts`

### Admin — Session-Based (express-session)
- Sessions stored server-side in admin service memory
- Auth state: `req.session.isAdmin = true`
- Optional TOTP: `ADMIN_TOTP_SECRET` env var enables second factor
- Guard: `AdminAuthGuard` checks session on every admin request

Source: `src/admin/src/app.controller.ts:25-73`

### BFF Cookie Pattern (BASE site)
- JWT stored in `HttpOnly` cookies — JS cannot read them
- `access_token` cookie: 7 days, `httpOnly: true`, `sameSite: Lax`
- `refresh_token` cookie: 30 days
- Cookie domain: `COOKIE_DOMAIN` env var (e.g., `.ironloot.local` for cross-subdomain SSO)
- BASE proxy injects `Authorization: Bearer` from cookie before forwarding to API
- Client-side JS **never** has access to JWT values

Source: `src/apps/base/src/main.ts:21-28, 84-86`

## 2. Authorization

### Role-Based (API)
- `JwtAuthGuard` validates token and populates `req.user`
- Admin endpoints additionally require `ADMIN_API_KEY` header or session
- Seller-specific operations: checked inside service layer via `user.isSeller`
- Resource ownership: checked per-endpoint (e.g., "user can only update own auction")

### Admin API Key
- Header: `x-api-key: <ADMIN_API_KEY>`
- Admin service sends key on all API calls (`AdminApiClient`)
- In production: key must not be `dev-admin-key` (startup validation gate)

Source: `src/api/src/main.ts:25-27`

## 3. Production Startup Security Gate

The API **refuses to start** in production if any of these conditions are true:

```typescript
const PLACEHOLDER_SECRETS = new Set([
  'dev-admin-key', 'change-me', 'secret',
  'your-secret-here', 'your-jwt-secret', 'changeme'
]);

// Validates in production:
// - ADMIN_API_KEY: not placeholder
// - JWT_SECRET: ≥ 32 chars, not placeholder
// - SESSION_SECRET: ≥ 32 chars, not placeholder
// - ALLOWED_ORIGINS: must be explicitly set
```

Failure: `console.error(errors); process.exit(1)`

Source: `src/api/src/main.ts:10-47`

## 4. CORS Configuration

- `ALLOWED_ORIGINS` env var (comma-separated): explicit allowlist
- `credentials: true` — required for cookie-based auth
- Development: allow-all if `ALLOWED_ORIGINS` is empty
- Production: startup gate ensures origins are explicitly configured

```
ALLOWED_ORIGINS=http://base.localhost,http://client.localhost,http://localhost:5174,http://localhost:5175
```

Source: `src/api/src/main.ts:72-86`, `.env.example:56`

## 5. Security Headers (Helmet)

Applied on: API (`main.ts:70`), BASE (`base/main.ts:41`), CLIENT (`client/main.ts:27`).

**Content Security Policy — no `'unsafe-inline'` in any directive** (PT-096 removed it from
`script-src`, PT-105 from `style-src`):

| Directive | BASE | CLIENT | ADMIN |
|---|---|---|---|
| `default-src` | `'self'` | `'self'` | `'self'` |
| `script-src` | `'self'` | `'self'`, `https://cdn.socket.io` | `'self'`, `https://cdn.jsdelivr.net` |
| `style-src` | `'self'`, Google Fonts | `'self'`, Google Fonts | `'self'`, Google Fonts, jsDelivr |
| `font-src` | `'self'`, Google Fonts, `data:` | idem | idem |
| `img-src` | `'self'`, `data:`, `https:` | idem | idem |
| `connect-src` | `'self'` | `'self'` | `'self'` |
| `frame-src` / `object-src` | `'none'` | `'none'` | `'none'` |
| `upgrade-insecure-requests` | production only | production only | production only |

The two external origins are deliberate and pinned with SRI: socket.io for live bidding (CLIENT)
and Chart.js for the dashboard (ADMIN).

> **`upgrade-insecure-requests` is production-only on purpose.** Browsers exempt `localhost` from
> it but **not** real domains, so leaving it on in development broke ADMIN entirely once the sites
> moved to `*.ironloot.local` (F-30, fixed by PT-100).

Two guards keep this true, and both include control cases that prove they can fail:
`plantillas-sin-js-inline.spec.ts` (PT-096) and `estilos-fuera-de-plantillas.spec.ts` (PT-105).

`crossOriginEmbedderPolicy: false` to allow Google Fonts.

Source: `src/apps/base/src/main.ts:44-58`

## 6. CSRF Protection

- **API** uses JWT Bearer tokens — immune to CSRF by design (browser does not auto-send Bearer header)
- **Cookies**: `sameSite: Lax` provides browser-level CSRF protection for auth cookies
- No double-submit CSRF tokens needed on BASE/CLIENT (no SSR POST routes that bypass BFF)

Source: `src/apps/base/src/main.ts:37-39`, `src/apps/client/src/main.ts:23-25`

## 7. Rate Limiting

| Scope | Limit | TTL | Source |
|---|---|---|---|
| Global (all routes) | 100 req | 60s | `app.module.ts:75-85` |
| Auth register | 5 (prod) / 60 (dev) | 60s | `auth.controller.ts:35, 52` |
| Auth login | 5 (prod) / 60 (dev) | 60s | `auth.controller.ts:35, 77` |
| Wallet deposit | 10 | 60s | `wallet.controller.ts:84` |
| Wallet withdraw | 5 | 60s | `wallet.controller.ts:115` |
| Payment webhooks | 20 | 60s | `payments.controller.ts:47` |

`@SkipThrottle()` used on admin-scoped routes (PT-024) to prevent admin operations from being throttled.

## 8. Payment Webhook Security

- All webhook payloads validated with HMAC signature
- Validation happens in `PaymentsService.handleWebhook()` before any processing
- Provider-specific validation logic per `WebhookSignatureValidator` in `@ironloot/core`
- **Never trust unvalidated webhook payloads**

Source: `CLAUDE.md:182`, `src/packages/core/src/domain/payment/webhook-signature-validator.ts`

## 9. Financial Anti-Fraud Controls

- **Deposit**: amount verified against payment provider record, not user input
  ```typescript
  if (payment.amount !== dto.amount) throw new PaymentMismatchException(...)
  ```
- **Wallet fund locking**: held funds prevent double-spending during active bids
- **Ledger immutability**: all balance changes create permanent Ledger entries (no updates/deletes)

Source: `src/api/src/modules/wallet/wallet.controller.ts:94-111`

## 10. Data Security

- **Password hashing**: bcrypt with `BCRYPT_SALT_ROUNDS` (default 12)
- **Sensitive fields**: 2FA secrets stored encrypted; tokens time-limited
- **Email enumeration prevention**: forgot-password always returns success regardless of email existence
- **Audit log**: every significant action logged to `audit_events` with actor identity and result

Source: `src/api/src/modules/auth/auth.controller.ts:189-199`, `.env.example:84`

## 11. Input Validation

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`
- DTOs use `class-validator` decorators
- Unknown properties rejected (403-level validation error)

Source: `src/api/src/main.ts:98-107`

## 12. File Upload Security

- Upload endpoint requires authentication
- Uploads served statically from `/uploads` path

Source: `src/api/src/app.module.ts:135-138`

## 13. Known Security Notes

- **No `'unsafe-inline'` anywhere.** It was in `script-src` until PT-096 and in `style-src` until
  PT-105 (TD-014). Adding it back would silently re-enable a class of injection the guards no
  longer cover.
- **A new `style=` attribute or inline handler will not work.** The browser blocks it *silently* —
  the element simply looks or behaves wrong, with nothing in the console. This is the same silence
  that hid F-34 for days. See RULE-07 and RULE-09 in `11-Conventions.md`.
- **Admin TOTP is mandatory in production** since PT-093: startup aborts without
  `ADMIN_TOTP_SECRET` (min 16 chars). In development it is not required, deliberately.
- The API Swagger UI is disabled in production.

Source: `src/apps/base/src/main.ts`, `src/apps/client/src/main.ts`, `src/admin/src/main.ts`,
`src/api/src/main.ts:109-110`, `src/api/src/common/config/validate-startup-config.ts`
