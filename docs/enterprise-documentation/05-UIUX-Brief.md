# 05 — UI/UX Brief

**Source:** `src/apps/base/src/app.controller.ts`, `src/apps/client/src/app.controller.ts`, `src/apps/base/src/main.ts`, `src/apps/client/src/main.ts`

## 1. Frontend Architecture

Iron Loot uses **Server-Side Rendering (SSR)** with two separate NestJS apps, both using Nunjucks as the template engine. There is **no client-side framework** (no React, Vue, Angular). Client-side interactivity is implemented with plain vanilla JavaScript per-page.

### Two-Site Split (BFF Pattern)

| Site | Domain | Purpose | Auth |
|---|---|---|---|
| **BASE** | `base.ironloot.local` (`:5174`) | Public site: catalog, home, auth pages | Public (no auth required) |
| **CLIENT** | `client.ironloot.local` (`:5175`) | Private portal: dashboard, wallet, bids, seller | Auth required (`ClientAuthGuard`) |

### BASE Site: BFF Proxy
BASE implements the **Backend-for-Frontend** pattern. It intercepts calls to `/api/*` and:
1. Reads `access_token` cookie from the browser request
2. Proxies request to the API with `Authorization: Bearer <token>` header
3. On auth endpoints (login/register/refresh): intercepts response, extracts JWT tokens, sets `HttpOnly` cookies on the browser

Source: `src/apps/base/src/main.ts:72-118`

### CLIENT Site: Direct API Calls
CLIENT does NOT use the proxy. Controllers directly call the API using `fetch()` with the cookie token.

Source: `src/apps/client/src/app.controller.ts:9-19`

## 2. Template Engine

- **Nunjucks** with `autoescape: true`
- Templates in `views/` directory, layouts in `views/layouts/`
- View engine set to `'html'` extension
- Template data injected by controllers via `@Render('pages/...')` decorator

Source: `src/apps/base/src/main.ts:60-69`, `src/apps/client/src/main.ts:44-54`

## 3. Static Assets

- Static files served from `public/` directory
- Plain CSS (no preprocessor confirmed)
- Vanilla JS in `public/js/pages/<feature>/<page>.js` pattern
- Google Fonts allowed in CSP (`styleSrc`, `fontSrc`)

Source: `CLAUDE.md:171-173`, `src/apps/base/src/main.ts:67`

## 4. BASE Site — Page Inventory

| Route | Template | Description |
|---|---|---|
| `GET /` | `pages/home.html` | Homepage with active auctions grid |
| `GET /auctions` | `pages/auctions/list.html` | Auction catalog with pagination + search |
| `GET /auctions/:id` | `pages/auctions/detail.html` | Auction detail + real-time bid updates |
| `GET /auth/login` | `pages/auth/login.html` | Login form |
| `GET /auth/register` | `pages/auth/register.html` | Registration form |
| `GET /auth/recovery` | `pages/auth/recovery.html` | Forgot password form |
| `GET /auth/reset-password` | `pages/auth/reset-password.html` | Reset password (with token query param) |
| `GET /auth/verify-email` | `pages/auth/verify-email.html` | Email verification (with token query param) |
| `GET /auth/verify-email-pending` | `pages/auth/verify-email-pending.html` | Verification pending notice |
| `GET /about` | `pages/static/about.html` | About page |
| `GET /privacy` | `pages/static/privacy.html` | Privacy policy |
| `GET /static/terms` | `pages/static/terms.html` | Terms of service |
| `GET /terms` | — | 301 redirect to /static/terms |

Source: `src/apps/base/src/app.controller.ts`

## 5. CLIENT Site — Page Inventory

All routes protected by `ClientAuthGuard` (redirects to BASE `/auth/login` if no valid token).

**Buyer Portal:**

| Route | Template | API Calls |
|---|---|---|
| `GET /dashboard` | `pages/dashboard.html` | `/users/me`, `/wallet`, `/bids/my?limit=5`, `/auctions?status=ACTIVE&limit=6` |
| `GET /profile` | `pages/profile.html` | `/users/me` |
| `GET /settings` | `pages/settings.html` | `/users/settings` |
| `GET /my-bids` | `pages/bids/my.html` | `/bids/my?page=N` |
| `GET /auctions/won-auctions` | `pages/won-auctions.html` | `/orders?role=buyer` |
| `GET /auctions/watchlist` | `pages/watchlist.html` | `/watchlist` |
| `GET /wallet` | `pages/wallet.html` | `/wallet` |
| `GET /wallet/deposit` | `pages/wallet/deposit.html` | — |
| `GET /wallet/withdraw` | `pages/wallet/withdraw.html` | — |
| `GET /wallet/history` | `pages/wallet/history.html` | `/wallet/history?page=N` |
| `GET /payments` | `pages/payments.html` | `/wallet/history?types=DEBIT_ORDER,CREDIT_SALE` |
| `GET /orders` | `pages/orders/list.html` | `/orders?page=N` |
| `GET /orders/:id` | `pages/orders/detail.html` | `/orders/:id` |
| `GET /notifications` | `pages/notifications/list.html` | `/notifications` |
| `GET /disputes` | `pages/disputes/list.html` | `/disputes` |
| `GET /disputes/create` | `pages/disputes/create.html` | — (orderId via query param) |
| `GET /disputes/:id` | `pages/disputes/detail.html` | `/disputes/:id` |
| `GET /reputation` | `pages/reputation.html` | `/users/me` |
| `GET /auth/logout` | — | Clears cookies + redirect to BASE /auth/login |

**Seller Portal:**

| Route | Template | API Calls |
|---|---|---|
| `GET /seller/onboarding` | `pages/seller/onboarding.html` | — |
| `GET /seller/auctions` | `pages/seller/auctions.html` | `/auctions?role=seller&page=N` |
| `GET /seller/orders` | `pages/seller/orders.html` | `/orders?role=seller&page=N` |
| `GET /auctions/create` | `pages/auction/create.html` | — |
| `GET /auctions/:id/edit` | `pages/auction/edit.html` | `/auctions/:id` |

Source: `src/apps/client/src/app.controller.ts`

## 6. ADMIN Site — Page Inventory

Auth: session-based with optional TOTP. Session check via `AdminAuthGuard`.

Key admin sections (from `src/admin/src/app.module.ts` modules + `src/admin/src/app.service.ts`):

| Module | Admin Operations |
|---|---|
| Users | List, view, suspend/ban, update |
| Auctions (Lots) | List, view, approve/reject/suspend/force-close/reopen |
| Orders | List, view |
| Payments | List, view, manage |
| Reconciliation | Reconciliation reports |
| KYC | Review submissions, approve/reject |
| Moderation | Approve/reject auction content |
| CFDI | Tax invoice management |
| Reports | Platform reports |
| Notifications | Bulk notification campaigns (segmented) |
| Audit | Audit event log viewer |
| SEO | Per-page SEO metadata |
| CMS | Content key-value management |
| Refunds | Refund request management |
| Disputes | Dispute management |
| Commissions | Commission config and records |
| Configuration | System configuration management |

Source: `src/admin/src/app.module.ts`

## 7. Security (Frontend)

- Helmet CSP applied on both BASE and CLIENT
- `scriptSrc: ["'self'"]` — **no `'unsafe-inline'`**. It used to be there for inline event
  handlers in the templates; PT-096 moved every one of them out to `public/js/`. All 24 were in
  fact **already dead**, blocked by `script-src-attr 'none'` — including the `confirm()` guards
  before destructive admin actions, which were firing without asking
- `styleSrc` has no `'unsafe-inline'` either since PT-105: styles live in the site's CSS
- `frameSrc: ["'none'"]`, `objectSrc: ["'none'"]`
- No `crossOriginEmbedderPolicy` (disabled for Google Fonts)
- Cookie `sameSite: Lax` — protects against CSRF on state-changing requests

Source: `src/apps/base/src/main.ts:41-57`, `src/apps/client/src/main.ts:27-43`
