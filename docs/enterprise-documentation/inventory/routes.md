# Inventory — Routes

All frontend routes across BASE, CLIENT, and ADMIN services.  
**Source:** `src/apps/base/src/app.controller.ts`, `src/apps/client/src/app.controller.ts`, `src/admin/src/app.controller.ts`

---

## BASE Site (`:5174` / `base.ironloot.local`)

| Method | Route | Template | Auth | API Calls |
|---|---|---|---|---|
| GET | `/` | `pages/home.html` | Public | `GET /api/v1/auctions?status=ACTIVE&limit=6` |
| GET | `/auctions` | `pages/auctions/list.html` | Public | `GET /api/v1/auctions?page=N&q=?` |
| GET | `/auctions/:id` | `pages/auctions/detail.html` | Public | `GET /api/v1/auctions/:id` |
| GET | `/auth/login` | `pages/auth/login.html` | Public | — |
| GET | `/auth/register` | `pages/auth/register.html` | Public | — |
| GET | `/auth/recovery` | `pages/auth/recovery.html` | Public | — |
| GET | `/auth/reset-password` | `pages/auth/reset-password.html` | Public | — (token via query) |
| GET | `/auth/verify-email` | `pages/auth/verify-email.html` | Public | — (token via query) |
| GET | `/auth/verify-email-pending` | `pages/auth/verify-email-pending.html` | Public | — |
| GET | `/about` | `pages/static/about.html` | Public | — |
| GET | `/privacy` | `pages/static/privacy.html` | Public | — |
| GET | `/terms` | — | Public | 301 → /static/terms |
| GET | `/static/terms` | `pages/static/terms.html` | Public | — |
| POST | `/api/*` | — | BFF proxy | Proxied to API with cookie token |

---

## CLIENT Site (`:5175` / `client.ironloot.local`)

All routes protected by `ClientAuthGuard` (redirects to BASE `/auth/login` if unauthenticated).

### Buyer

| Method | Route | Template | API Calls |
|---|---|---|---|
| GET | `/dashboard` | `pages/dashboard.html` | `/users/me`, `/wallet`, `/bids/my?limit=5`, `/auctions?status=ACTIVE&limit=6` |
| GET | `/profile` | `pages/profile.html` | `/users/me` |
| GET | `/settings` | `pages/settings.html` | `/users/settings` |
| GET | `/my-bids` | `pages/bids/my.html` | `/bids/my?page=N` |
| GET | `/auctions/won-auctions` | `pages/won-auctions.html` | `/orders?role=buyer` |
| GET | `/auctions/watchlist` | `pages/watchlist.html` | `/watchlist` |
| GET | `/wallet` | `pages/wallet.html` | `/wallet` |
| GET | `/wallet/deposit` | `pages/wallet/deposit.html` | — |
| GET | `/wallet/withdraw` | `pages/wallet/withdraw.html` | — |
| GET | `/wallet/history` | `pages/wallet/history.html` | `/wallet/history?page=N` |
| GET | `/payments` | `pages/payments.html` | `/wallet/history?types=DEBIT_ORDER,CREDIT_SALE` |
| GET | `/orders` | `pages/orders/list.html` | `/orders?page=N` |
| GET | `/orders/:id` | `pages/orders/detail.html` | `/orders/:id` |
| GET | `/notifications` | `pages/notifications/list.html` | `/notifications` |
| GET | `/disputes` | `pages/disputes/list.html` | `/disputes` |
| GET | `/disputes/create` | `pages/disputes/create.html` | — (orderId via query) |
| GET | `/disputes/:id` | `pages/disputes/detail.html` | `/disputes/:id` |
| GET | `/reputation` | `pages/reputation.html` | `/users/me` |
| GET | `/auth/logout` | — | Clears cookies → redirect to BASE |

### Seller

| Method | Route | Template | API Calls |
|---|---|---|---|
| GET | `/seller/onboarding` | `pages/seller/onboarding.html` | — |
| GET | `/seller/auctions` | `pages/seller/auctions.html` | `/auctions?role=seller&page=N` |
| GET | `/seller/orders` | `pages/seller/orders.html` | `/orders?role=seller&page=N` |
| GET | `/auctions/create` | `pages/auction/create.html` | — |
| GET | `/auctions/:id/edit` | `pages/auction/edit.html` | `/auctions/:id` |

---

## ADMIN Site (`:3001` / `admin.ironloot.local`)

Auth: session-based (`req.session.isAdmin`). All routes protected by `AdminAuthGuard` except login.

| Method | Route | Template | Description |
|---|---|---|---|
| GET | `/login` | `pages/login` | Admin login form |
| POST | `/login` | — | Login action → session |
| POST | `/logout` | — | Destroy session |
| GET | `/` | Dashboard | Platform stats |
| GET | `/users` | Users list | User management |
| GET | `/users/:id` | User detail | User edit |
| GET | `/auctions` | Auctions list | Auction moderation |
| GET | `/auctions/:id` | Auction detail | Auction edit |
| GET | `/orders` | Orders list | Order management |
| GET | `/payments` | Payments list | Payment management |
| GET | `/reconciliation` | Reconciliation | Financial reconciliation |
| GET | `/kyc` | KYC list | KYC submissions |
| GET | `/moderation` | Moderation queue | Content moderation |
| GET | `/cfdi` | CFDI list | Tax invoices |
| GET | `/reports` | Reports | Platform reports |
| GET | `/notifications` | Campaign list | Notification campaigns |
| GET | `/audit` | Audit log | Audit events viewer |
| GET | `/seo` | SEO config | SEO metadata |
| GET | `/cms` | CMS content | Content management |
| GET | `/refunds` | Refunds list | Refund management |
| GET | `/disputes` | Disputes list | Dispute management |
| GET | `/commissions` | Commission config | Commission management |
| GET | `/configuration` | System config | Runtime configuration |

Source: `src/admin/src/app.module.ts` (18 admin modules)

---

## Nginx Traffic Routing (`ironloot.local` — PT-025)

| Pattern | Destination | Status Code |
|---|---|---|
| `^/auctions` | `http://base.ironloot.local$uri` | 301 |
| `^/(dashboard\|wallet\|orders\|my-bids\|seller\|auction/\|profile\|settings\|payments\|notifications\|disputes\|reputation\|watchlist)` | `http://client.ironloot.local$uri` | 301 |
| `^/auth` | `http://base.ironloot.local$uri` | 301 |
| `/` (catch-all) | `http://base.ironloot.local$uri` | 301 |

Source: `src/nginx/nginx.conf:116-140`
