# Inventory — API Endpoints

All REST API endpoints on `src/api` (`/api/v1/`).  
Auth column: `JWT` = Bearer token required; `Public` = no auth; `ApiKey` = ADMIN_API_KEY header.  
**Source:** `src/api/src/modules/**/*.controller.ts`

## Auth (`/api/v1/auth`)

| Method | Path | Auth | Rate Limit | Audit Event |
|---|---|---|---|---|
| POST | `/auth/register` | Public + Recaptcha | 5/m (prod) | USER_REGISTERED |
| POST | `/auth/login` | Public | 5/m (prod) | USER_LOGGED_IN |
| POST | `/auth/refresh` | Public | — | — |
| POST | `/auth/logout` | JWT | — | USER_LOGGED_OUT |
| POST | `/auth/verify-email` | Public | — | USER_VERIFIED |
| POST | `/auth/forgot-password` | Public | — | — |
| POST | `/auth/reset-password` | Public | — | USER_PASSWORD_RESET |
| POST | `/auth/change-password` | JWT | — | USER_PASSWORD_CHANGED |
| POST | `/auth/2fa/generate` | JWT | — | — |
| POST | `/auth/2fa/enable` | JWT | — | — |
| POST | `/auth/2fa/disable` | JWT | — | — |
| GET | `/auth/me` | JWT | — | — |

## Users (`/api/v1/users`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| GET | `/users/me` | JWT | — |
| PATCH | `/users/me` | JWT | USER_PROFILE_UPDATED |
| GET | `/users/settings` | JWT | — |
| PATCH | `/users/settings` | JWT | USER_SETTINGS_UPDATE |
| POST | `/users/seller/request` | JWT | USER_SELLER_ENABLED |

## Auctions (`/api/v1/auctions`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| GET | `/auctions` | Public | — |
| GET | `/auctions/:id` | Public | — |
| POST | `/auctions` | JWT (seller) | AUCTION_CREATED |
| PATCH | `/auctions/:id` | JWT (owner) | AUCTION_UPDATED |
| POST | `/auctions/:id/publish` | JWT (owner) | AUCTION_PUBLISHED |
| DELETE | `/auctions/:id` | JWT (owner) | AUCTION_CANCELLED |

## Bids (`/api/v1/bids`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| POST | `/bids` | JWT | BID_PLACED |
| GET | `/bids/my-active` | JWT | — |
| GET | `/bids/my-history` | JWT | — |
| GET | `/bids/auction/:id` | Public | — |

## Wallet (`/api/v1/wallet`)

| Method | Path | Auth | Rate Limit | Audit Event |
|---|---|---|---|---|
| GET | `/wallet/balance` | JWT | — | — |
| GET | `/wallet/history` | JWT | — | — |
| ~~POST~~ | ~~`/wallet/deposit`~~ | — | — | **RETIRADO (PT-133)** — ADR-047 |
| POST | `/wallet/withdraw` | JWT | 5/m | PAYMENT_INITIATED |

## Payments (`/api/v1/payments`)

| Method | Path | Auth | Rate Limit | Audit Event |
|---|---|---|---|---|
| ~~POST~~ | ~~`/payments/checkout`~~ | — | — | **RETIRADO (PT-133)** — ADR-047 |
| POST | `/payments/webhook/:provider` | Public (HMAC) | 20/m | PAYMENT_CONFIRMED / FAILED |
| POST | `/payments/initiate` | JWT | — | — |
| POST | `/payments/process` | JWT | — | — |
| GET | `/payments/providers` | Public | — | — |
| GET | `/payments/status/:reference` | JWT | — | — |
| GET | `/payments/methods` | Public | — | — |

## Orders (`/api/v1/orders`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| GET | `/orders` | JWT | — |
| GET | `/orders/:id` | JWT | — |
| POST | `/orders/:id/cancel` | JWT | ORDER_CANCELLED |

## Shipments (`/api/v1/shipments`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| POST | `/shipments` | JWT (seller) | SHIPMENT_REGISTERED |
| GET | `/shipments/:orderId` | JWT | — |
| PATCH | `/shipments/:id` | JWT (seller) | SHIPMENT_UPDATED |
| POST | `/shipments/:id/deliver` | JWT | DELIVERY_CONFIRMED |

## Disputes (`/api/v1/disputes`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| POST | `/disputes` | JWT (buyer) | DISPUTE_OPENED |
| GET | `/disputes` | JWT | — |
| GET | `/disputes/:id` | JWT | — |
| PATCH | `/disputes/:id` | JWT | DISPUTE_RESOLVED |

## Ratings (`/api/v1/ratings`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| POST | `/ratings` | JWT | RATING_SUBMITTED |
| GET | `/ratings/user/:id` | Public | — |

## Notifications (`/api/v1/notifications`)

| Method | Path | Auth |
|---|---|---|
| GET | `/notifications` | JWT |
| PATCH | `/notifications/:id/read` | JWT |
| PATCH | `/notifications/read-all` | JWT |

## Watchlist (`/api/v1/watchlist`)

| Method | Path | Auth | Audit Event |
|---|---|---|---|
| GET | `/watchlist` | JWT | — |
| POST | `/watchlist/:auctionId` | JWT | WATCHLIST_ADD |
| DELETE | `/watchlist/:auctionId` | JWT | WATCHLIST_REMOVE |

## Upload (`/api/v1/upload`)

| Method | Path | Auth |
|---|---|---|
| POST | `/upload/image` | JWT |

## Health (`/api/v1/health`)

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | Public |
| GET | `/health/detailed` | Public |

## Diagnostics (`/api/v1/diagnostics` — non-production)

| Method | Path | Auth |
|---|---|---|
| GET | `/diagnostics` | Dev only |
| GET | `/diagnostics/logs` | Dev only |
| GET | `/diagnostics/errors` | Dev only |
| GET | `/diagnostics/metrics` | Dev only |

## Admin (`/api/v1/admin`)

| Method | Path | Auth |
|---|---|---|
| POST | `/admin/auth/login` | ApiKey |
| GET | `/admin/stats` | ApiKey |
| GET | `/admin/dashboard/extended-stats` | ApiKey |
| GET | `/admin/dashboard/revenue-by-day` | ApiKey |
| GET | `/admin/dashboard/users-by-day` | ApiKey |
| GET | `/admin/users` | ApiKey |
| GET | `/admin/users/:id` | ApiKey |
| PATCH | `/admin/users/:id` | ApiKey |
| GET | `/admin/auctions` | ApiKey |
| GET | `/admin/auctions/:id` | ApiKey |
| PATCH | `/admin/auctions/:id/cancel` | ApiKey |
| PATCH | `/admin/auctions/:id/approve` | ApiKey |
| PATCH | `/admin/auctions/:id/reject` | ApiKey |
| PATCH | `/admin/auctions/:id/suspend` | ApiKey |
| PATCH | `/admin/auctions/:id/force-close` | ApiKey |
| PATCH | `/admin/auctions/:id/reopen` | ApiKey |
| GET | `/admin/lots` | ApiKey |
| GET | `/admin/lots/:id` | ApiKey |


## Añadidos por PT-080

| Método | Ruta | Notas |
|---|---|---|
| `GET` | `/admin/payments/trace/:reference` | **PT-086.** Traza completa de una transacción en orden cronológico: solicitud, llamadas salientes con endpoint y duración, notificaciones con cabeceras, validación de firma, decisión del ciclo y acreditación con saldos. Las credenciales van redactadas y marcadas. |
| `GET` | `/admin/payments/anomalies` | Cola de revisión: ciclos en `ANOMALY` o `EXPIRED` con su motivo y sus eventos. La decisión de devolver dinero es del admin (ADR-022). |

## Comportamiento modificado

| Ruta | Cambio |
|---|---|
| `POST /payments/webhook/:provider` | Acepta los **dos formatos** de Mercado Pago (Webhooks e IPN). Firma inválida → **401** (antes 500). Duplicado → 2xx sin acreditar. Desajuste con la solicitud → `ANOMALY`, sin acreditar. |
| `POST /payments/initiate` | Abre el ciclo en `REQUESTED`. La respuesta al cliente no cambia. |
| `GET /admin/reconciliation` | Lee `payment_cycles` en lugar de la tabla `payments`, que nunca se escribe. Sin proveedores en duro. |


---

## Endpoints de métodos de cobro y verificación (añadidos 2026-07-27, PT-109)

Introducidos por **PT-092** (cierra TD-003) y ausentes del inventario hasta ahora.
Fuente: `src/api/src/modules/wallet/wallet.controller.ts`.

| Método | Ruta | Qué hace | Línea |
|---|---|---|---|
| `POST` | `/wallet/payment-methods` | Registra una CLABE. Nace **sin verificar** | `:120` |
| `GET` | `/wallet/payment-methods` | Lista los métodos del usuario | `:129` |
| `POST` | `/wallet/payment-methods/paypal` | Registra PayPal. **Uno solo por usuario**; el rechazo nombra el que ya existe | `:136` |
| `POST` | `/wallet/payment-methods/:id/verify` | Abre la verificación: importe 20 MXN. **El token NO viene en la respuesta** | `:154` |
| `POST` | `/wallet/payment-methods/:id/verify/confirm` | Confirma con el token. 5 intentos, 7 días de vigencia | `:181` |
| `POST` | `/wallet/withdrawals` | Solicita un retiro. **HTTP 400 si la cuenta no está verificada** | `:194` |
| `GET` | `/wallet/withdrawals` | Historial de retiros | `:207` |

**Cardinalidad**: un PayPal, varias CLABEs y varias tarjetas. Decisión del desarrollador
(2026-07-27), registrada en la matriz junto a F-27.
