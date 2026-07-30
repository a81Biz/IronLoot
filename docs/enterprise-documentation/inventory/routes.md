# Inventory — Routes

All frontend routes across BASE, CLIENT, and ADMIN services.
**Source:** `src/apps/base/src/**/*.controller.ts`, `src/apps/client/src/**/*.controller.ts`,
`src/admin/src/**/*.controller.ts`

> **Alcance corregido el 2026-07-30 (PT-198).** El título decía *«all frontend routes»* y la línea
> de origen citaba **tres ficheros**: los `app.controller.ts`. ADMIN declara la mayoría de sus rutas
> en los controladores de sus dieciocho módulos, así que el documento nombraba **63 de 110** y **se
> leía como completo**. Las dos frases no podían ser ciertas a la vez.
>
> Lo vigila `inventarios-completos.spec.ts`.

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

## Dos páginas que faltaban (medido en PT-188)

| Sitio | Ruta | Qué es |
|---|---|---|
| BASE | `/contact` | Página de contacto pública. |
| CLIENT | `/wallet/deposit/return` | **La ruta canónica de retorno de TODAS las pasarelas** (ADR-042). Antes cada proveedor volvía a una ruta distinta y **ninguna existía**, así que un pago real acababa en 404 después de haber cobrado. El `status` que llega por la URL **no es fuente de verdad** —lo escribe el navegador—: la página pregunta a `GET /payments/status/:reference` (ADR-043). Un ciclo abierto se informa **pendiente**, jamás fallido: efectivo y SPEI tardan horas, y decir «falló» provoca un segundo pago. |

Que la ruta de retorno de los pagos no estuviera en el inventario de rutas es exactamente la clase de omisión
que ADR-042 existe para que no vuelva a pasar.

---

## Nginx Traffic Routing (`ironloot.local` — PT-025)

| Pattern | Destination | Status Code |
|---|---|---|
| `^/auctions` | `http://base.ironloot.local$uri` | 301 |
| `^/(dashboard\|wallet\|orders\|my-bids\|seller\|auction/\|profile\|settings\|payments\|notifications\|disputes\|reputation\|watchlist)` | `http://client.ironloot.local$uri` | 301 |
| `^/auth` | `http://base.ironloot.local$uri` | 301 |
| `/` (catch-all) | `http://base.ironloot.local$uri` | 301 |

Source: `src/nginx/nginx.conf:116-140`

## ADMIN — rutas de módulo (`src/admin/src/modules/`)

Las declaradas fuera de `app.controller.ts`, una fila por decorador. **Todas exigen sesión de
administrador** (`AdminDualAuthGuard`); no se repite en cada fila.

| Método | Ruta | Controlador |
|---|---|---|
| GET | `/auctions` | `modules/auctions/auctions.controller.ts` |
| GET | `/auctions/:id` | `modules/auctions/auctions.controller.ts` |
| POST | `/auctions/:id/approve` | `modules/auctions/auctions.controller.ts` |
| POST | `/auctions/:id/cancel` | `modules/auctions/auctions.controller.ts` |
| POST | `/auctions/:id/force-close` | `modules/auctions/auctions.controller.ts` |
| POST | `/auctions/:id/reject` | `modules/auctions/auctions.controller.ts` |
| POST | `/auctions/:id/reopen` | `modules/auctions/auctions.controller.ts` |
| POST | `/auctions/:id/suspend` | `modules/auctions/auctions.controller.ts` |
| GET | `/audit` | `modules/audit/audit.controller.ts` |
| GET | `/audit/export` | `modules/audit/audit.controller.ts` |
| GET | `/cfdi` | `modules/cfdi/cfdi.controller.ts` |
| GET | `/cfdi/:orderId/download/:format` | `modules/cfdi/cfdi.controller.ts` |
| POST | `/cfdi/:orderId/cancel` | `modules/cfdi/cfdi.controller.ts` |
| POST | `/cfdi/:orderId/generate` | `modules/cfdi/cfdi.controller.ts` |
| GET | `/cms` | `modules/cms/cms.controller.ts` |
| POST | `/cms/:key` | `modules/cms/cms.controller.ts` |
| GET | `/commissions` | `modules/commissions/commissions.controller.ts` |
| POST | `/commissions/config/:id/delete` | `modules/commissions/commissions.controller.ts` |
| POST | `/commissions/config/global` | `modules/commissions/commissions.controller.ts` |
| POST | `/commissions/config/seller` | `modules/commissions/commissions.controller.ts` |
| POST | `/commissions/records/:id/mark-collected` | `modules/commissions/commissions.controller.ts` |
| GET | `/configuration/cfdi` | `modules/configuration/configuration.controller.ts` |
| GET | `/configuration/platform` | `modules/configuration/configuration.controller.ts` |
| GET | `/settings` | `modules/configuration/configuration.controller.ts` |
| POST | `/configuration/cfdi` | `modules/configuration/configuration.controller.ts` |
| POST | `/configuration/platform` | `modules/configuration/configuration.controller.ts` |
| POST | `/settings/payment-config` | `modules/configuration/configuration.controller.ts` |
| POST | `/settings/storage` | `modules/configuration/configuration.controller.ts` |
| GET | `/disputes` | `modules/disputes/disputes.controller.ts` |
| GET | `/disputes/:id` | `modules/disputes/disputes.controller.ts` |
| POST | `/disputes/:id/resolve-buyer` | `modules/disputes/disputes.controller.ts` |
| POST | `/disputes/:id/resolve-seller` | `modules/disputes/disputes.controller.ts` |
| GET | `/kyc` | `modules/kyc/kyc.controller.ts` |
| GET | `/kyc/:id` | `modules/kyc/kyc.controller.ts` |
| POST | `/kyc/:id/approve` | `modules/kyc/kyc.controller.ts` |
| POST | `/kyc/:id/reject` | `modules/kyc/kyc.controller.ts` |
| POST | `/kyc/:id/request-correction` | `modules/kyc/kyc.controller.ts` |
| GET | `/lots` | `modules/lots/lots.controller.ts` |
| GET | `/lots/:id` | `modules/lots/lots.controller.ts` |
| POST | `/lots/:id/block` | `modules/lots/lots.controller.ts` |
| POST | `/lots/:id/unblock` | `modules/lots/lots.controller.ts` |
| POST | `/lots/:id/update` | `modules/lots/lots.controller.ts` |
| POST | `/lots/:id/update-category` | `modules/lots/lots.controller.ts` |
| GET | `/moderation` | `modules/moderation/moderation.controller.ts` |
| POST | `/moderation/:id/approve` | `modules/moderation/moderation.controller.ts` |
| POST | `/moderation/:id/reject` | `modules/moderation/moderation.controller.ts` |
| GET | `/notifications` | `modules/notifications/notifications.controller.ts` |
| POST | `/notifications/send` | `modules/notifications/notifications.controller.ts` |
| GET | `/orders` | `modules/orders/orders.controller.ts` |
| GET | `/payments` | `modules/payments/payments.controller.ts` |
| GET | `/reconciliation` | `modules/reconciliation/reconciliation.controller.ts` |
| GET | `/reconciliation/export` | `modules/reconciliation/reconciliation.controller.ts` |
| GET | `/refunds` | `modules/refunds/refunds.controller.ts` |
| POST | `/refunds/:id/status` | `modules/refunds/refunds.controller.ts` |
| POST | `/refunds/create` | `modules/refunds/refunds.controller.ts` |
| GET | `/reports` | `modules/reports/reports.controller.ts` |
| GET | `/reports/download/:type` | `modules/reports/reports.controller.ts` |
| GET | `/seo` | `modules/seo/seo.controller.ts` |
| POST | `/seo/:page` | `modules/seo/seo.controller.ts` |
| GET | `/users` | `modules/users/users.controller.ts` |
| GET | `/users/:id` | `modules/users/users.controller.ts` |
| POST | `/users/:id/ban` | `modules/users/users.controller.ts` |
| POST | `/users/:id/disable-seller` | `modules/users/users.controller.ts` |
| POST | `/users/:id/enable-seller` | `modules/users/users.controller.ts` |
| POST | `/users/:id/suspend` | `modules/users/users.controller.ts` |
| POST | `/users/:id/unban` | `modules/users/users.controller.ts` |
| GET | `/api/dashboard/extended-stats` | `app.controller.ts` |
| GET | `/api/dashboard/revenue-by-day` | `app.controller.ts` |
| GET | `/api/dashboard/users-by-day` | `app.controller.ts` |
