# D-frontend.md — Phase 3 Frontend Audit (BASE / CLIENT / ADMIN)

Scope: `src/apps/base/`, `src/apps/client/`, `src/admin/`. All facts cite `file:line`. Nothing in this
document is inferred beyond what is directly observed in the cited source.

---

## 1. ROUTES/SCREENS CATALOG

### 1.1 BASE (public site, port 5174, `src/apps/base/`)

Controller: `src/apps/base/src/app.controller.ts` (single `AppController`, no guard — 100% public/guest).

| Route (URL) | Controller:method (file:line) | Template rendered | Purpose | Auth required | API calls |
|---|---|---|---|---|---|
| `GET /` | `app.controller.ts:19-24` `home()` | `pages/home.html` | Landing page, shows 6 active auctions | guest | `GET {API_URL}/api/v1/auctions?status=ACTIVE&limit=6` (`:22`) |
| `GET /about` | `app.controller.ts:26-30` `about()` | `pages/static/about.html` | Static "how it works" page | guest | none |
| `GET /privacy` | `app.controller.ts:32-36` `privacy()` | `pages/static/privacy.html` | Static privacy policy | guest | none |
| `GET /terms` | `app.controller.ts:38-40` `termsRedirect()` | 301 → `/static/terms` | Legacy URL redirect | guest | none |
| `GET /static/terms` | `app.controller.ts:42-46` `terms()` | `pages/static/terms.html` | Terms of use | guest | none |
| `GET /auctions` | `app.controller.ts:48-54` `auctionsList()` | `pages/auctions/list.html` | Public auction catalog, paginated, `q` search | guest | `GET {API_URL}/api/v1/auctions?{page,q}` (`:52`) |
| `GET /auctions/:id` | `app.controller.ts:56-61` `auctionDetail()` | `pages/auctions/detail.html` | Single auction detail; "Pujar ahora" links out to `{clientUrl}/auctions/{id}` (see GAP §6) | guest | `GET {API_URL}/api/v1/auctions/:id` (`:59`) |
| `GET /auth/login` | `app.controller.ts:63-67` `login()` | `pages/auth/login.html` | Login form (client-side POST) | guest | `POST /api/v1/auth/login` (proxied, `login.html:54`) |
| `GET /auth/register` | `app.controller.ts:69-73` `register()` | `pages/auth/register.html` | Registration form | guest | `POST /api/v1/auth/register` (`register.html:55`) |
| `GET /auth/recovery` | `app.controller.ts:75-79` `recovery()` | `pages/auth/recovery.html` | Forgot-password request | guest | `POST /api/v1/auth/forgot-password` (`recovery.html:45`) |
| `GET /auth/reset-password` | `app.controller.ts:81-85` `resetPassword()` | `pages/auth/reset-password.html` | Reset password w/ `?token=` | guest | `POST /api/v1/auth/reset-password` (`reset-password.html:49`) |
| `GET /auth/verify-email` | `app.controller.ts:87-91` `verifyEmail()` | `pages/auth/verify-email.html` | Confirms e-mail via `?token=` | guest | `POST /api/v1/auth/verify-email` (`verify-email.html:33`) |
| `GET /auth/verify-email-pending` | `app.controller.ts:93-97` `verifyEmailPending()` | `pages/auth/verify-email-pending.html` | "Check your inbox" holding page | guest | none |
| (any unmatched) | `common/filters/not-found.filter.ts:5-12` | `pages/404.html` | 404 fallback | guest | none |

No route exists for `/contact` (see GAP §6), even though it is linked from the footer.

### 1.2 CLIENT (private portal, port 5175, `src/apps/client/`)

Controller: `src/apps/client/src/app.controller.ts`. `@UseGuards(ClientAuthGuard)` is applied at
**class level** (`app.controller.ts:25-27`), so every route below requires a valid `access_token`
JWT cookie — enforced by `src/apps/client/src/common/guards/client-auth.guard.ts:11-30`.

| Route (URL) | Controller:method (file:line) | Template | Purpose | Auth required | API calls |
|---|---|---|---|---|---|
| `GET /dashboard` | `app.controller.ts:29-40` `dashboard()` | `pages/dashboard.html` | Buyer home: profile, wallet, last bids, active auctions | authenticated | `GET /api/v1/users/me`, `/api/v1/wallet`, `/api/v1/bids/my?limit=5`, `/api/v1/auctions?status=ACTIVE&limit=6` (`:34-37`) |
| `GET /auth/logout` | `app.controller.ts:42-46` `logout()` | redirect | Clears `access_token` cookie, redirects to BASE login | authenticated | none (local cookie clear) |
| `GET /profile` | `app.controller.ts:48-53` `profile()` | `pages/profile.html` | View/edit profile | authenticated | `GET /api/v1/users/me`; client JS `PUT /api/v1/users/profile` (`profile.html:30`) |
| `GET /settings` | `app.controller.ts:55-60` `settings()` | `pages/settings.html` | Notification preferences | authenticated | `GET /api/v1/users/settings`; client JS `PUT /api/v1/users/settings` (`settings.html:23`) |
| `GET /my-bids` | `app.controller.ts:62-67` `myBids()` | `pages/bids/my.html` | Paginated list of user's bids | authenticated | `GET /api/v1/bids/my?page=` (`:65`) |
| `GET /auctions/won-auctions` | `app.controller.ts:69-74` `wonAuctions()` | `pages/won-auctions.html` | Auctions the user won (as buyer orders) | authenticated | `GET /api/v1/orders?role=buyer` (`:72`) |
| `GET /auctions/watchlist` | `app.controller.ts:76-81` `watchlist()` | `pages/watchlist.html` | Watchlisted auctions | authenticated | `GET /api/v1/watchlist` (`:79`) |
| `GET /wallet` | `app.controller.ts:83-88` `wallet()` | `pages/wallet.html` | Wallet balance / held funds | authenticated | `GET /api/v1/wallet` (`:86`) |
| `GET /wallet/deposit` | `app.controller.ts:90-94` `deposit()` | `pages/wallet/deposit.html` | Deposit form | authenticated | client JS `POST /api/v1/wallet/deposit` (`deposit.html:31`) |
| `GET /wallet/withdraw` | `app.controller.ts:96-100` `withdraw()` | `pages/wallet/withdraw.html` | Withdraw form | authenticated | client JS `POST /api/v1/wallet/withdraw` (`withdraw.html:26`) |
| `GET /wallet/history` | `app.controller.ts:102-107` `walletHistory()` | `pages/wallet/history.html` | Ledger history, paginated | authenticated | `GET /api/v1/wallet/history?page=` (`:105`) |
| `GET /payments` | `app.controller.ts:109-114` `payments()` | `pages/payments.html` | Filtered ledger (debit-order/credit-sale) | authenticated | `GET /api/v1/wallet/history?types=DEBIT_ORDER,CREDIT_SALE` (`:112`) |
| `GET /orders` | `app.controller.ts:116-121` `orders()` | `pages/orders/list.html` | Buyer+seller order list, paginated | authenticated | `GET /api/v1/orders?page=` (`:119`) |
| `GET /orders/:id` | `app.controller.ts:123-128` `orderDetail()` | `pages/orders/detail.html` | Order detail | authenticated | `GET /api/v1/orders/:id` (`:126`) |
| `GET /notifications` | `app.controller.ts:130-135` `notifications()` | `pages/notifications/list.html` | In-app notification list | authenticated | `GET /api/v1/notifications` (`:133`) |
| `GET /disputes` | `app.controller.ts:137-142` `disputes()` | `pages/disputes/list.html` | Dispute list | authenticated | `GET /api/v1/disputes` (`:140`) |
| `GET /disputes/create` | `app.controller.ts:144-148` `disputeCreate()` | `pages/disputes/create.html` | New dispute form, `?orderId=` prefill | authenticated | client JS `POST /api/v1/disputes` (`disputes/create.html:26`) |
| `GET /disputes/:id` | `app.controller.ts:150-155` `disputeDetail()` | `pages/disputes/detail.html` | Dispute detail | authenticated | `GET /api/v1/disputes/:id` (`:153`) |
| `GET /reputation` | `app.controller.ts:157-162` `reputation()` | `pages/reputation.html` | Buyer/seller rating summary | authenticated | `GET /api/v1/users/me` (`:160`) |
| `GET /seller/onboarding` | `app.controller.ts:165-169` `sellerOnboarding()` | `pages/seller/onboarding.html` | Seller enablement form | authenticated | client JS `POST /api/v1/users/enable-seller` (`seller/onboarding.html:31`) |
| `GET /seller/auctions` | `app.controller.ts:171-176` `sellerAuctions()` | `pages/seller/auctions.html` | Seller's own auctions, paginated | authenticated (seller) | `GET /api/v1/auctions?role=seller&page=` (`:174`) |
| `GET /seller/orders` | `app.controller.ts:178-183` `sellerOrders()` | `pages/seller/orders.html` | Seller's orders, paginated | authenticated (seller) | `GET /api/v1/orders?role=seller&page=` (`:181`) |
| `GET /auctions/create` | `app.controller.ts:185-189` `auctionCreate()` | `pages/auction/create.html` | New auction form | authenticated (seller) | client JS `POST /api/v1/auctions` (`auction/create.html:59`) |
| `GET /auctions/:id/edit` | `app.controller.ts:191-196` `auctionEdit()` | `pages/auction/edit.html` | Edit auction | authenticated (seller) | `GET /api/v1/auctions/:id`; client JS `PUT /api/v1/auctions/:id` (`:194`, `auction/edit.html:38`) |
| (any unmatched) | `common/filters/not-found.filter.ts:5-12` | `pages/404.html` | 404 fallback | — | none |

No "seller" role distinction is enforced in the CLIENT app itself — role gating for seller pages is
assumed to happen at the API layer; the SSR controller only checks that a JWT is present
(`client-auth.guard.ts:15-19`), not the `isSeller` claim.

**No route renders `pages/dashboard/auctions-gate.html`** — see GAP §6.
**No route exists for placing a bid on a specific auction** (`/auctions/:id` GET) — see GAP §6.

### 1.3 ADMIN (backoffice, port 3001, `src/admin/`)

Auth: `AdminAuthGuard` (`src/admin/src/auth/auth.guard.ts:4-15`) checks `req.session.isAdmin`,
applied per-route via `@UseGuards(AdminAuthGuard)` on every handler except `login`/`logout`.
Session is server-side (Redis-backed, `src/admin/src/main.ts:19-30`), single flat `isAdmin` boolean —
**no distinct admin roles/permissions model** (see §5).

| Module | Route | Controller:line | Template | Purpose |
|---|---|---|---|---|
| App (root) | `GET /login`, `POST /login`, `POST /logout` | `app.controller.ts:23-79` | `pages/login.html` | Admin auth (username/password + optional TOTP proxied to `POST {API}/api/v1/admin/auth/login`, `:40`) |
| App (root) | `GET /` | `app.controller.ts:83-93` | `pages/dashboard.html` | Main KPI dashboard |
| App (root) | `GET /api/dashboard/extended-stats`, `/revenue-by-day`, `/users-by-day` | `app.controller.ts:97-113` | JSON | Dashboard chart data feed (called by `dashboard-charts.js`) |
| **auctions** | `GET /auctions`, `/auctions/:id`; `POST /auctions/:id/{cancel,approve,reject,suspend,force-close,reopen}` | `modules/auctions/auctions.controller.ts:9-84` | `auctions.html`, `auction-detail.html` | Auction lifecycle moderation |
| **lots** | `GET /lots`, `/lots/:id`; `POST /lots/:id/{block,unblock,update,update-category}` | `modules/lots/lots.controller.ts:9-67` | `lots.html`, `lot-detail.html` | Catalog item (lot) moderation |
| **moderation** | `GET /moderation`; `POST /moderation/:id/{approve,reject}` | `modules/moderation/moderation.controller.ts:9-42` | `moderation.html` | Generic content moderation queue |
| **users** | `GET /users`, `/users/:id`; `POST /users/:id/{suspend,ban,unban,enable-seller,disable-seller}` | `modules/users/users.controller.ts:9-73` | `users.html`, `user-detail.html` | User account management |
| **kyc** | `GET /kyc`, `/kyc/:id`; `POST /kyc/:id/{approve,reject,request-correction}` | `modules/kyc/kyc.controller.ts:9-69` | `kyc.html`, `kyc-detail.html` | KYC identity review |
| **orders** | `GET /orders` | `modules/orders/orders.controller.ts:9-25` | `orders.html` | Order list (read-only) |
| **payments** | `GET /payments` | `modules/payments/payments.controller.ts:9-29` | `payments.html` | Payment transaction list (read-only) |
| **refunds** | `GET /refunds`; `POST /refunds/create`, `/refunds/:id/status` | `modules/refunds/refunds.controller.ts:9-41` | `refunds.html` | Refund workflow |
| **reconciliation** | `GET /reconciliation`, `/reconciliation/export` | `modules/reconciliation/reconciliation.controller.ts:9-34` | `reconciliation.html` | Payment-provider reconciliation + CSV export |
| **commissions** | `GET /commissions`; `POST /commissions/config/global`, `/config/seller`, `/config/:id/delete`, `/records/:id/mark-collected` | `modules/commissions/commissions.controller.ts:9-60` | `commissions.html` | Commission rate config + collection tracking |
| **cfdi** | `GET /cfdi`, `/cfdi/:orderId/download/:format`; `POST /cfdi/:orderId/{generate,cancel}` | `modules/cfdi/cfdi.controller.ts:9-55` | `cfdi.html` | Mexican fiscal invoice mgmt |
| **disputes** | `GET /disputes`, `/disputes/:id`; `POST /disputes/:id/{resolve-buyer,resolve-seller}` | `modules/disputes/disputes.controller.ts:9-56` | `disputes.html`, `dispute-detail.html` | Dispute resolution |
| **notifications** | `GET /notifications`; `POST /notifications/send` | `modules/notifications/notifications.controller.ts:9-42` | `notifications.html` | Mass-notification campaigns |
| **reports** | `GET /reports`, `/reports/download/:type` | `modules/reports/reports.controller.ts:10-45` | `reports.html` | Financial/operational reports + CSV |
| **audit** | `GET /audit`, `/audit/export` | `modules/audit/audit.controller.ts:10-52` | `audit.html` | Immutable audit-log viewer + CSV export |
| **configuration** | `GET/POST /configuration/platform`; `GET/POST /configuration/cfdi`; `GET /settings`; `POST /settings/{payment-config,smtp,storage}` | `modules/configuration/configuration.controller.ts:11-118` | `platform-config.html`, `cfdi-config.html`, `settings.html` | Platform config, CFDI provider config, payment/SMTP/storage settings ("Pasarelas" in nav) |
| **seo** | `GET /seo`; `POST /seo/:page` | `modules/seo/seo.controller.ts:9-30` | `seo.html` | Per-page SEO metadata |
| **cms** | `GET /cms`; `POST /cms/:key` | `modules/cms/cms.controller.ts:9-30` | `cms.html` | CMS content key/value editor |

18 modules confirmed under `src/admin/src/modules/`: auctions, audit, cfdi, cms, commissions,
configuration, disputes, kyc, lots, moderation, notifications, orders, payments, reconciliation,
refunds, reports, seo, users — matching CLAUDE.md's "18 feature modules" claim exactly.

All admin API calls to the core API go through the singleton `AdminApiClient`
(`src/admin/src/shared/admin-api-client.service.ts:9-101`), which obtains its own short-lived admin
JWT via `POST {API}/api/v1/admin/auth/login` (`:29-33`) — separate from any per-user JWT — and falls
back to a static `X-Admin-Key` header (`ADMIN_API_KEY` env, default `'dev-admin-key'`, `:13,63`) if
JWT refresh fails.

---

## 2. LAYOUTS & SHARED

- **BASE root layout**: `src/apps/base/views/layouts/base.html` — header nav (`Subastas`, `Acerca de`,
  login/register buttons, `:15-43`), inline SVG logo repeated in header (`:18-33`) and footer
  (`:52-63`), footer with 4 columns incl. a `/contact` link that has no route (`:79`), single stylesheet
  `/css/base.css` (`:11`) plus Google Fonts Montserrat/Inter (`:10`).
- **CLIENT root layout**: `src/apps/client/views/layouts/client.html` — sidebar nav split into
  "Comprador" (Dashboard, Ganadas, Mis ofertas, Watchlist, Órdenes, Wallet, Notificaciones, Disputas,
  Reputación, `:36-46`) and "Vendedor" (Mis subastas, Crear subasta, Pedidos, Onboarding, `:48-53`)
  sections, plus bottom Perfil/Configuración/Salir (`:54-58`). Top bar has page-title and action
  blocks (`:63-66`). Single stylesheet `/css/client.css` (`:10`).
- **ADMIN root layout**: `src/admin/views/layouts/admin.html` — sidebar grouped into Catálogo, Usuarios,
  Finanzas, Operaciones, Configuración sections (`:44-132`), each `nav-item` highlighted via
  server-passed `activePage` var. Top bar has a "Ver sitio" external link hardcoded to
  `http://localhost:5173` (`:153`) — **wrong port**, see GAP §6. Loads `/js/admin.js` (`:165`) plus
  per-page chart libraries via `{% block scripts %}`.
- All three layouts embed the same inline Iron Loot SVG isotype (paths identical across
  `base.html:18-32`, `client.html:17-27`, `admin.html:19-29`) — no shared partial/include file; the
  markup is duplicated per app (there is no Nunjucks `{% include %}` for the logo).
- 404 pages: `src/apps/base/views/pages/404.html`, `src/apps/client/views/pages/404.html` — both
  rendered via each app's `NotFoundExceptionFilter` (`base/.../not-found.filter.ts:5-12`,
  `client/.../not-found.filter.ts:5-12`), identical implementation duplicated per app. ADMIN has no
  equivalent 404 filter/template (not found in `src/admin`).

---

## 3. CLIENT-SIDE JS

Neither BASE nor CLIENT has a `public/js/pages/` directory as CLAUDE.md's stated per-page convention
describes (`find src/apps/base/public`, `find src/apps/client/public` show only `css/`, plus one
`images/logo-3d.png` in BASE) — see GAP §6. All client-side behavior lives as inline `<script>` blocks
inside the Nunjucks templates themselves.

### BASE inline scripts (all under `views/pages/auth/`)
| Template | Endpoint hit | Behavior |
|---|---|---|
| `login.html:46-73` | `POST /api/v1/auth/login` (relative, via BASE's own `/api` BFF proxy) | Submits email/password, `credentials:'include'`; on success redirects to `{{ clientUrl }}/dashboard` (`:62`); shows inline error otherwise |
| `register.html:55-57` (approx.) | `POST /api/v1/auth/register` | Account creation |
| `recovery.html:45-48` | `POST /api/v1/auth/forgot-password` | Password-reset request |
| `reset-password.html:49-52` | `POST /api/v1/auth/reset-password` | Consumes `?token=` + new password |
| `verify-email.html:33-36` | `POST /api/v1/auth/verify-email` | Auto-fires on page load with `?token=` |

These all call **relative** `/api/v1/...` paths, which are same-origin to BASE (port 5174) and are
intercepted by BASE's own proxy middleware (`src/apps/base/src/main.ts:75-120`) — correct BFF usage.

### CLIENT inline scripts (all read `const API = '{{ apiUrl }}'` and call the API **directly**)
| Template | Endpoint hit | Behavior |
|---|---|---|
| `settings.html:23-26` | `PUT {API}/api/v1/users/settings` | Save notification prefs |
| `profile.html:30-33` | `PUT {API}/api/v1/users/profile` | Save profile fields |
| `wallet/deposit.html:31-34` | `POST {API}/api/v1/wallet/deposit` | Submit deposit |
| `wallet/withdraw.html:26-29` | `POST {API}/api/v1/wallet/withdraw` | Submit withdrawal |
| `auction/create.html:59-62` | `POST {API}/api/v1/auctions` | Create auction |
| `auction/edit.html:38-41` | `PUT {API}/api/v1/auctions/:id` | Update auction |
| `disputes/create.html:26-29` | `POST {API}/api/v1/disputes` | Open dispute |
| `seller/onboarding.html:31-34` | `POST {API}/api/v1/users/enable-seller` | Enable seller role |

All 8 use `credentials: 'include'` but call `API_URL` (e.g. `http://localhost:3000`) directly,
**cross-origin** from `http://localhost:5175` — this bypasses CLIENT's BFF pattern entirely and is a
functional gap; see GAP §6 for why this most likely fails against the real API.

### ADMIN JS (`public/js/`)
| File | Purpose | Endpoints |
|---|---|---|
| `public/js/admin.js:1-33` | Toast notifications (`showToast`, `:5-18`) + active-nav-link highlighting fallback (`:22-33`) | none (pure DOM) |
| `public/js/dashboard-charts.js:1-83` | Renders dashboard bar/line charts (Chart.js, loaded externally) and polls KPIs every 30s (`setInterval(refreshKpis, 30000)`, `:3`) | `GET /api/dashboard/revenue-by-day?days=90`, `/users-by-day?days=30` (`:9-10`), `GET /api/dashboard/extended-stats` (`:67`) — all same-origin to ADMIN's own proxy routes in `app.controller.ts:97-113` |

---

## 4. SECURITY CONFIG per app

### BASE (`src/apps/base/src/main.ts`)
- Helmet CSP (`:43-60`): `default-src 'self'`; `script-src 'self' 'unsafe-inline'` (`:48`, weakens
  XSS defense — justified in-code as "Nunjucks templates may have inline event handlers");
  `style-src 'self' 'unsafe-inline' fonts.googleapis.com`; `font-src 'self' fonts.gstatic.com data:`;
  `img-src 'self' data: https:`; `connect-src 'self'`; `frame-src 'none'`; `object-src 'none'`;
  `upgradeInsecureRequests` only in prod (`:55`). `crossOriginEmbedderPolicy: false` to allow Google
  Fonts (`:58`).
- CSRF: explicitly **not implemented** — code comment states "BASE has no SSR POST routes — all state
  changes go through /api BFF proxy to the REST API which uses JWT Bearer tokens (immune to CSRF by
  design)" (`:39-42`). Relies on `sameSite: Lax` on the auth cookie for browser-level protection.
- Cookies (`:22-29`): `access_token`/`refresh_token` set `httpOnly: true`, `secure: isProd`,
  `sameSite` from `COOKIE_SAMESITE` env (default `Lax`), optional cross-subdomain `domain` from
  `COOKIE_DOMAIN` env, `maxAge` 7d (access) / 30d (refresh, `:105`), `path:'/'`.
- BFF proxy (`:73-120`): `/api/*` requests forwarded to `API_URL` (default `http://localhost:3000`)
  via `http-proxy-middleware`; injects `Authorization: Bearer <access_token cookie>` on the way out
  (`:84-89`); on the way back, intercepts responses from `AUTH_TOKEN_ENDPOINTS` (`login`, `register`,
  `refresh`, `:31`) to convert `{tokens}` JSON into HttpOnly cookies and strips tokens from the JSON
  body returned to the browser (`:100-109`); clears cookies on `/auth/logout` responses (`:111-115`).
  This is the textbook BFF pattern: the browser JS never sees the JWT.

### CLIENT (`src/apps/client/src/main.ts`)
- Helmet CSP (`:26-43`): identical directive set to BASE (same `'unsafe-inline'` script-src caveat,
  `:31`).
- CSRF: same rationale as BASE, stated in-code (`:23-25`) — "CLIENT has no SSR POST routes — state
  changes go through the BFF proxy to the REST API...". **This claim does not match the code**: CLIENT
  has no `/api` proxy middleware at all (absent from `main.ts`, confirmed by its absence vs. BASE's
  `:73-120` block) and its own templates make 8 direct cross-origin fetches to the raw API (§3) — see
  GAP §6.
- Cookie/auth: no cookie-setting logic in CLIENT's `main.ts` (CLIENT never sets `access_token`; it is
  only set by BASE and read by CLIENT via `COOKIE_DOMAIN` cross-subdomain scoping,
  `client-auth.guard.ts:5,15`). `ClientAuthGuard` (`common/guards/client-auth.guard.ts:11-30`)
  verifies the JWT locally with `jsonwebtoken.verify(token, JWT_SECRET)` (`:22`) — i.e. CLIENT
  independently re-validates the token rather than calling the API, which requires `JWT_SECRET` to be
  identically configured in both API and CLIENT processes (default `'change-me'` fallback, `:6`, is a
  weak-secret risk if unset in any environment).

### ADMIN (`src/admin/src/main.ts`)
- **No helmet call at all** — `main.ts` imports no `helmet`, unlike BASE/CLIENT (confirmed: no
  `helmet` string anywhere in `src/admin/src/main.ts`). No CSP, no other security headers configured
  for the admin dashboard. See GAP §6.
- **No CSRF protection** — no `csurf`/double-submit-cookie library, no CSRF token in any admin form
  (`grep` for `csrf` across `src/admin` returns no matches). All state-changing admin actions
  (`ban user`, `approve KYC`, `cancel auction`, `send notification campaign`, etc.) are plain
  `<form method="POST">`/`fetch` requests riding on the ambient session cookie — a CSRF exposure for a
  privileged surface. Sole mitigation is the session cookie's implicit browser defaults; `sameSite` is
  **not explicitly set** on the session cookie (`main.ts:38-42` sets only `httpOnly`, `secure`,
  `maxAge`).
- Session (`:19-44`): `express-session` with Redis store when available (`connect-redis` + `ioredis`,
  `:20-27`), else in-memory fallback with an explicit dev-only warning (`:29`). Secret from
  `ADMIN_SESSION_SECRET`, default `'admin-dev-secret-change-in-prod'` (`:35`) — a weak default that
  would be a real risk if left unset in production. Cookie: `httpOnly: true`, `secure` only in prod,
  `maxAge` 8h (`:38-42`).
- Auth model is a single boolean session flag `req.session.isAdmin` (`auth.guard.ts:9`) set on
  successful login (`app.controller.ts:47`) — no admin roles/scopes (see §5).
- Admin→API auth is separate: `AdminApiClient` obtains its own admin JWT (or falls back to a static
  `X-Admin-Key` shared secret, default `'dev-admin-key'`) — `admin-api-client.service.ts:12-13,56-64`.

### BFF pattern summary (as actually implemented)
- **BASE**: correct BFF — JWT lives only in an HttpOnly cookie; all browser-JS calls are relative and
  proxied server-side, which injects the `Authorization` header (`main.ts:73-120`).
- **CLIENT**: BFF pattern used for its own page renders (server-side `apiGet()` helper attaches
  `Authorization: Bearer` from the cookie, `app.controller.ts:9-19`), but **broken** for its 8
  client-side write actions, which call the API directly without any proxy or auth header (§3, GAP §6).
- **ADMIN**: a different, session-based BFF — the browser never holds any JWT; the admin's own backend
  process holds a service-level admin JWT (or API key) and proxies all reads/writes
  (`admin-api-client.service.ts`).

---

## 5. PERMISSIONS/ROLES MODEL (as enforced in the UI layer)

- **BASE**: no auth at all — 100% guest routes (§1.1). No role checks.
- **CLIENT**: binary gate only — `ClientAuthGuard` (`client-auth.guard.ts:11-30`) checks for a
  syntactically valid, non-expired JWT. It does **not** inspect any claim (e.g. `isSeller`) to
  distinguish buyer vs. seller pages. The "Vendedor" nav section and routes
  (`/seller/*`, `/auctions/create`, `/auctions/:id/edit`) are reachable by any authenticated user
  regardless of seller status at the SSR layer — any enforcement of the buyer/seller distinction must
  happen API-side (not verified in this pass; API modules were out of scope). This is a UI-layer
  permissions gap worth flagging to Phase-2/API auditors.
- **ADMIN**: single flat role — `req.session.isAdmin` (`auth.guard.ts:9`, set at
  `app.controller.ts:47`). There is no concept of admin sub-roles (e.g. finance-only vs.
  moderation-only admin) anywhere in the UI layer; every one of the 18 modules is reachable by any
  authenticated admin session. Optional TOTP second factor is gated only by whether
  `ADMIN_TOTP_SECRET` env is set (`app.controller.ts:26,37`), not per-user.

---

## 6. GAPS / INCONSISTENCIES

1. **Broken bidding flow (CLIENT)** — BASE's auction detail page links "Pujar ahora" to
   `{{ clientUrl }}/auctions/{{ auction.id }}` (`src/apps/base/views/pages/auctions/detail.html:69`),
   but CLIENT's `AppController` defines no `GET /auctions/:id` route (only
   `/auctions/won-auctions`, `/auctions/watchlist`, `/auctions/create`, `/auctions/:id/edit` —
   `app.controller.ts:69-196`). Clicking "Pujar ahora" 404s. No bid-placing page or Socket.io client
   code exists anywhere under `src/apps/client` (`grep` for `socket.io`/`placeBid`/`io(` across
   `src/apps/client` only matches the controller's route-string `bids/my`, not an actual integration).
   The real-time bidding UI described in CLAUDE.md's architecture is not present in the frontend.

2. **Orphan template (CLIENT)** — `src/apps/client/views/pages/dashboard/auctions-gate.html` exists
   but is never referenced by any `@Render(...)` call in `app.controller.ts`, nor linked from any
   other template (`grep -rn "auctions-gate"` across `src/apps/client` returns only the file itself).
   Dead/unreachable page.

3. **CLIENT client-side JS bypasses the BFF pattern and likely fails auth** — the 8 inline scripts
   listed in §3 (`settings.html:23`, `profile.html:30`, `wallet/deposit.html:31`,
   `wallet/withdraw.html:26`, `auction/create.html:59`, `auction/edit.html:38`,
   `disputes/create.html:26`, `seller/onboarding.html:31`) call `fetch(API + '/api/v1/...', {credentials:'include'})`
   directly against the raw API origin. The API's JWT strategy only accepts a Bearer header
   (`src/api/src/modules/auth/strategies/jwt.strategy.ts:20`,
   `ExtractJwt.fromAuthHeaderAsBearerToken()`); it never reads cookies. Since `access_token` is
   `httpOnly` (unreadable by this JS) and no `Authorization` header is ever attached, these 8 write
   actions have no route to succeed unless a separate, unseen mechanism exists. CLIENT's own
   `main.ts` code comment (`:23-25`) claims a BFF proxy is used for CSRF immunity, but no `/api` proxy
   middleware exists in `src/apps/client/src/main.ts` (unlike BASE's `:73-120`) — the comment does not
   match the code.

4. **Dead footer link (BASE)** — `src/apps/base/views/layouts/base.html:79` links to `/contact`; no
   controller in `src/apps/base/src/app.controller.ts` defines that route. 404 on click.

5. **Wrong hardcoded port (ADMIN)** — `src/admin/views/layouts/admin.html:153` "Ver sitio" link points
   to `http://localhost:5173`, but BASE is configured (and documented in CLAUDE.md, and confirmed in
   `docker-compose.yml:233,236`) to run on port **5174**. The admin "view site" shortcut is broken.

6. **ADMIN has no Helmet/CSP** — unlike BASE and CLIENT, `src/admin/src/main.ts` never calls
   `helmet()` and sets no CSP directives. Combined with finding 7 below, this is the least
   security-hardened of the three frontends despite holding the most privileged operations.

7. **ADMIN has no CSRF mitigation** — no CSRF token library, no double-submit cookie, and the session
   cookie does not set `sameSite` explicitly (`main.ts:38-42`). Every privileged POST action (ban
   user, force-close auction, resolve dispute, send notification campaign, change commission rates,
   etc.) relies solely on browser-default cookie behavior for CSRF protection.

8. **No shared UI partials** — the identical Iron Loot SVG logo markup is duplicated verbatim across
   `base.html:18-32/52-63`, `client.html:17-27`, and `admin.html:19-29` (three separate apps, no
   shared template/include and, being separate NestJS apps, no code-sharing mechanism for views is
   expected — noted for documentation completeness, not a bug).

9. **CLAUDE.md's stated JS convention not found** — CLAUDE.md states "Client JS in
   `src/apps/<site>/public/js/pages/` follows a per-page convention (e.g. `wallet/deposit.js`)"; no
   such directory exists in either BASE or CLIENT (`public/` contains only `css/` and, for BASE, one
   PNG). All client-side logic is inline `<script>` in the Nunjucks templates instead (§3). This is a
   documentation/reality mismatch, not necessarily a bug, but should be reconciled in
   `11-Conventions.md` if/when Foundation Protocol runs.

10. **Weak default secrets surfaced in frontend code** — `ClientAuthGuard`'s `JWT_SECRET` fallback
    `'change-me'` (`client-auth.guard.ts:6`), ADMIN's `ADMIN_SESSION_SECRET` fallback
    `'admin-dev-secret-change-in-prod'` (`admin/src/main.ts:35`), and `AdminApiClient`'s
    `ADMIN_API_KEY` fallback `'dev-admin-key'` (`admin-api-client.service.ts:13`) — all functional but
    dangerous if the corresponding env var is left unset in a real deployment.
