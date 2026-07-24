# Catálogo de API (REST + WebSocket) — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia (deriva del código, no de Swagger) |
| **Fuente** | `audit/raw/B-api-backend.md`, controllers de `src/api/src/modules/*` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 08-API-Catalog, inventory/endpoints |
| **Código usado** | `*.controller.ts` de los 27 módulos, `main.ts` |
| **Nivel de confianza** | Alto (cada endpoint citado `archivo:línea` en `audit/raw/B`) |

> **~118 endpoints.** Prefijo global `/api/v1` (versionado URI, `main.ts:89-95`). Guards: `JWT`=JwtAuthGuard · `Public`=@Public · `OptJWT`=Opcional · `AdminDual`=JWT admin o x-admin-key · `DevOnly` · `Recaptcha`. Throttle: global 100/min salvo lo indicado.

## Auth (`/auth`) — 12
| Método | Ruta | Guard | Throttle |
|---|---|---|---|
| POST | /auth/register | Public+Recaptcha | 5(prod)/60(dev)/60s |
| POST | /auth/login | Public | 5/60/60s |
| POST | /auth/refresh | Public | default |
| POST | /auth/logout | JWT | default |
| POST | /auth/verify-email | Public | default |
| POST | /auth/forgot-password | Public | default |
| POST | /auth/reset-password | Public | default |
| POST | /auth/change-password | JWT | default |
| POST | /auth/2fa/generate\|enable\|disable | JWT | default |
| GET | /auth/me | JWT | default |

## Auctions (`/auctions`) — 5 · Bids — 4
| Método | Ruta | Guard |
|---|---|---|
| POST | /auctions | JWT (seller) |
| GET | /auctions | Public+OptJWT |
| GET | /auctions/:id | Public |
| PATCH | /auctions/:id | JWT (owner, DRAFT) |
| POST | /auctions/:id/publish | JWT (owner) |
| POST | /auctions/:auctionId/bids | JWT |
| GET | /auctions/:auctionId/bids | Public |
| GET | /bids/my-active \| /bids/my-history | JWT |

## Wallet (`/wallet`) — 4 · Payments (`/payments`) — 6
| Método | Ruta | Guard | Throttle |
|---|---|---|---|
| GET | /wallet/balance \| /wallet/history | JWT | default |
| POST | /wallet/deposit | JWT | 10/60s |
| POST | /wallet/withdraw | JWT | 5/60s |
| POST | /payments/checkout | JWT | default |
| POST | /payments/webhook/:provider | **Public** | 20/60s |
| POST | /payments/initiate \| /payments/process | JWT | default |
| GET | /payments/providers \| /payments/methods | Public | default |

## Orders — 2 · Shipments — 3 · Ratings — 2 · Disputes — 3
| Método | Ruta | Guard |
|---|---|---|
| GET | /orders \| /orders/:id | JWT |
| POST | /shipments · GET /shipments/:id · PATCH /shipments/:id/status | JWT |
| POST | /ratings · GET /users/:userId/ratings | JWT / Public |
| POST | /disputes · GET /disputes · GET /disputes/:id | JWT |

## Users (`/users`) — 11 · Notifications — 4 · Watchlist — 3 · Upload — 1 · Health — 2
- Users: `/users/me` (GET/PATCH), `/me/stats`, `/me/verification-status`, `/me/settings` (GET/PATCH), `/me/resend-verification`, `/me/enable-seller`, `/users/:id` (OptJWT). 
- Notifications: list, unread-count, read-all, `:id/read`.
- Watchlist: GET, POST, DELETE `/:auctionId`.
- Upload: `POST /upload/image` (JWT, mime-restringido).
- Health: `/health`, `/health/detailed` (Public).

## Admin (`/admin`) — ~61 (todos `AdminDualAuthGuard`)
`POST /admin/auth/login` es **Public + @SkipThrottle** (`AUD-004`). Bloques: dashboard/stats · users · auctions(moderación) · lots · orders/payments · financial/commissions · reports(financial/operational/fiscal) · configuration(platform/smtp/storage/cfdi/payment) · disputes(resolve-buyer/seller/request-evidence) · audit-logs · moderation · kyc · **cfdi(generate ✗ stub)** · notifications/campaigns · refunds · reconciliation(✗ stub) · seo/cms · queues. Detalle de rutas en `audit/raw/B §1`.

## Diagnostics (`/diagnostics`) — 9 (`DevOnly`)
Logs/metrics/errors dev-only; TODO restringir en prod (`AUD-025`).

## WebSocket
| Namespace | Eventos salientes | Entrantes | Auth |
|---|---|---|---|
| `auctions` | `bid:new`, `auction:extended`, `auction:ended` | joinAuction, leaveAuction | **✗ ninguna** (`AUD-006`) |
| `events` | `emitAuctionEvent` | joinAuction, leaveAuction | **✗ ninguna** |

CORS de WS por `ALLOWED_ORIGINS`. **Sin cliente WS en el frontend** (`AUD-002`).

> **Nota OpenAPI:** el proyecto expone Swagger (`@nestjs/swagger`, `docker-compose` `/docs`). Este catálogo se derivó del **código** (fuente de verdad), no del documento Swagger, por la regla "gana el código".
