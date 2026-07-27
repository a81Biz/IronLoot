# 08 — API Catalog

**Base URL:** `http://localhost:3000/api/v1` (dev) | `https://api.ironloot.local/api/v1` (local prod)  
**Auth:** `Authorization: Bearer <access_token>` unless marked `[Public]`  
**Rate limits:** Global 100/min unless noted  
**Swagger:** `http://localhost:3000/docs` (non-production only)

Source: `src/api/src/modules/**/*.controller.ts`

---

## Auth — `/api/v1/auth`

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/auth/register` | Public + RecaptchaGuard | 5/min prod, 60/min dev | Register new user |
| POST | `/auth/login` | Public | 5/min prod, 60/min dev | Login → JWT tokens |
| POST | `/auth/refresh` | Public | — | Refresh access token |
| POST | `/auth/logout` | JWT required | — | Revoke session(s) |
| POST | `/auth/verify-email` | Public | — | Verify email with token |
| POST | `/auth/forgot-password` | Public | — | Request reset email |
| POST | `/auth/reset-password` | Public | — | Reset password with token |
| POST | `/auth/change-password` | JWT required | — | Change password (authenticated) |
| POST | `/auth/2fa/generate` | JWT required | — | Generate TOTP QR code |
| POST | `/auth/2fa/enable` | JWT required | — | Enable 2FA with TOTP token |
| POST | `/auth/2fa/disable` | JWT required | — | Disable 2FA |
| GET | `/auth/me` | JWT required | — | Get current user profile |

Source: `src/api/src/modules/auth/auth.controller.ts`

---

## Users — `/api/v1/users`

Source: `src/api/src/modules/users/users.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | JWT required | Current user profile |
| PATCH | `/users/me` | JWT required | Update profile |
| GET | `/users/settings` | JWT required | Get user settings |
| PATCH | `/users/settings` | JWT required | Update user settings |
| POST | `/users/seller/request` | JWT required | Request seller access |

---

## Auctions — `/api/v1/auctions`

Source: `src/api/src/modules/auctions/auctions.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auctions` | Public | List auctions (filters: status, role, page, q) |
| GET | `/auctions/:id` | Public | Get auction by ID |
| POST | `/auctions` | JWT required (seller) | Create auction draft |
| PATCH | `/auctions/:id` | JWT required (owner) | Update auction |
| POST | `/auctions/:id/publish` | JWT required (owner) | Submit for moderation |
| DELETE | `/auctions/:id` | JWT required (owner) | Cancel draft auction |

---

## Bids — `/api/v1/bids`

Source: `src/api/src/modules/bids/bids.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/bids` | JWT required | Place a bid |
| GET | `/bids/my-active` | JWT required | Active auctions the user has bid on (`Bid[]`) |
| GET | `/bids/my-history` | JWT required | Full bid history of the user (`Bid[]`) |
| GET | `/bids/auction/:id` | Public | All bids for auction |

---

## Wallet — `/api/v1/wallet`

Source: `src/api/src/modules/wallet/wallet.controller.ts`

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| GET | `/wallet/balance` | JWT required | — | Balance + held funds (`{available, held, currency, isActive}`) |
| GET | `/wallet/history` | JWT required | — | Ledger history (limit param) |
| POST | `/wallet/deposit` | JWT required | 10/min | Confirm wallet deposit |
| POST | `/wallet/withdraw` | JWT required | 5/min | Withdraw funds |

---

## Payments — `/api/v1/payments`

Source: `src/api/src/modules/payments/payments.controller.ts`

| Method | Path | Auth | Rate Limit | Description |
|---|---|---|---|---|
| POST | `/payments/checkout` | JWT required | — | Create checkout session for order |
| POST | `/payments/webhook/:provider` | Public (HMAC validated) | 20/min | Receive payment provider webhook |
| POST | `/payments/initiate` | JWT required | — | Initiate payment flow (deposit) |
| POST | `/payments/process` | JWT required | — | Process payment directly |
| GET | `/payments/providers` | Public | — | List available providers |
| GET | `/payments/methods` | Public | — | List Mercado Pago methods |

---

## Orders — `/api/v1/orders`

Source: `src/api/src/modules/orders/orders.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/orders` | JWT required | List orders (role: buyer\|seller, page) |
| GET | `/orders/:id` | JWT required | Get order by ID |
| POST | `/orders/:id/cancel` | JWT required | Cancel order |

---

## Shipments — `/api/v1/shipments`

Source: `src/api/src/modules/shipments/shipments.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/shipments` | JWT required (seller) | Register shipment |
| GET | `/shipments/:orderId` | JWT required | Get shipment for order |
| PATCH | `/shipments/:id` | JWT required (seller) | Update tracking / status |
| POST | `/shipments/:id/deliver` | JWT required | Confirm delivery |

---

## Disputes — `/api/v1/disputes`

Source: `src/api/src/modules/disputes/disputes.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/disputes` | JWT required (buyer) | Open dispute |
| GET | `/disputes` | JWT required | My disputes |
| GET | `/disputes/:id` | JWT required | Get dispute |
| PATCH | `/disputes/:id` | JWT required (admin) | Update dispute status |

---

## Ratings — `/api/v1/ratings`

Source: `src/api/src/modules/ratings/ratings.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ratings` | JWT required | Submit rating |
| GET | `/ratings/user/:id` | Public | Get user ratings |

---

## Notifications — `/api/v1/notifications`

Source: `src/api/src/modules/notifications/notifications.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | JWT required | Get notifications |
| PATCH | `/notifications/:id/read` | JWT required | Mark as read |
| PATCH | `/notifications/read-all` | JWT required | Mark all as read |

---

## Watchlist — `/api/v1/watchlist`

Source: `src/api/src/modules/watchlist/watchlist.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/watchlist` | JWT required | Get watchlist |
| POST | `/watchlist/:auctionId` | JWT required | Add to watchlist |
| DELETE | `/watchlist/:auctionId` | JWT required | Remove from watchlist |

---

## Upload — `/api/v1/upload`

Source: `src/api/src/modules/upload/upload.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/upload/image` | JWT required | Upload image |

---

## Health — `/api/v1/health`

Source: `src/api/src/modules/health/health.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Basic health check |
| GET | `/health/detailed` | Public | Detailed health (DB, Redis, etc.) |

---

## Diagnostics — `/api/v1/diagnostics`

Source: `src/api/src/modules/diagnostics/diagnostics.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/diagnostics` | Dev only | System diagnostics dashboard |
| GET | `/diagnostics/logs` | Dev only | Recent request logs |
| GET | `/diagnostics/errors` | Dev only | Recent error events |
| GET | `/diagnostics/metrics` | Dev only | System metrics |

---

## Admin — `/api/v1/admin`

Source: `src/api/src/modules/admin/admin.controller.ts`, `admin-auth.controller.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/admin/auth/login` | API Key | Admin login (+ optional TOTP) |
| GET | `/admin/stats` | API Key | Dashboard statistics |
| GET | `/admin/dashboard/extended-stats` | API Key | Extended dashboard stats |
| GET | `/admin/dashboard/revenue-by-day` | API Key | Revenue by day |
| GET | `/admin/dashboard/users-by-day` | API Key | New users by day |
| GET | `/admin/users` | API Key | List users |
| GET | `/admin/users/:id` | API Key | Get user |
| PATCH | `/admin/users/:id` | API Key | Update user |
| GET | `/admin/auctions` | API Key | List auctions |
| GET | `/admin/auctions/:id` | API Key | Get auction |
| PATCH | `/admin/auctions/:id/cancel` | API Key | Cancel auction |
| PATCH | `/admin/auctions/:id/approve` | API Key | Approve auction |
| PATCH | `/admin/auctions/:id/reject` | API Key | Reject auction |
| PATCH | `/admin/auctions/:id/suspend` | API Key | Suspend auction |
| PATCH | `/admin/auctions/:id/force-close` | API Key | Force-close auction |
| PATCH | `/admin/auctions/:id/reopen` | API Key | Reopen auction |
| GET | `/admin/lots` | API Key | List lots |
| GET | `/admin/lots/:id` | API Key | Get lot |

Source: `src/admin/src/app.service.ts`

---

## WebSocket Events (Socket.io)

| Event | Direction | Description |
|---|---|---|
| `bid.new` | Server → Client | New bid placed on watched auction |
| `auction.extended` | Server → Client | Soft-close extension fired |
| `auction.closed` | Server → Client | Auction closed |

Source: `CLAUDE.md:178`, `src/api/package.json:65`
