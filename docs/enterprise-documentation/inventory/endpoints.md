# Inventory — API Endpoints

**159 rutas** en `src/api` bajo el prefijo `/api/v1/`.
**Medido** el 2026-07-29 (PT-188) sobre `src/api/src/modules/**/*.controller.ts`, y contrastado con las 159 rutas
que Nest declara montadas en el arranque.

## Cómo leer la columna «Autorización»

| Valor | Significa |
|---|---|
| `Public` | Sin autenticación. Son 14 y están revisadas una a una: catálogo, flujos de entrada, salud, el webhook de la pasarela y la reputación pública |
| `JWT` | El guard global. **Es el valor por defecto**: una ruta sin `@Public()` está protegida sin declarar nada (Pattern 1 de `11-Conventions.md`) |
| `AdminDualAuthGuard` | Sesión de ADMIN **o** `ADMIN_API_KEY`. Son 79 |
| `DevelopmentOnlyGuard + DevOnly` | **No existen en producción**. Son 11: los 9 de diagnóstico y los 2 disparadores del planificador |

**`@Public()` no significa «sin autorización»: significa «no pases por el JWT global».** `admin.controller.ts`
declara `@UseGuards(AdminDualAuthGuard)` **y** `@Public()` a la vez — y leerlo mal daría por abiertos los ochenta
endpoints del módulo de más privilegio del sistema. Se dice aquí porque es la trampa de este fichero.

## Límite de peticiones

Global **100/min**. Excepciones medidas:

| Ruta | Límite |
|---|---|
| `POST /auth/register`, `POST /auth/login` | **5/min en producción** (60 en desarrollo) |
| `POST /admin/auth/login` | 10/min |
| `POST /payments/webhook/:provider` | 20/min |
| `GET /users/:userId/ratings` | `RATINGS_PUBLIC_LIMIT` (PT-163) |
| `POST /wallet/withdrawals`, `POST /wallet/withdraw`, `POST /wallet/payment-methods/:id/verify` | 5/min |
| `POST /wallet/payment-methods/:id/verify/confirm` | 10/min |
| Todo `/admin/**` y `/health*` | `@SkipThrottle()` |

## Lo que este inventario NO dice

- **No es la especificación de las peticiones ni de las respuestas.** Para eso está Swagger en `/docs` y
  [`docs-v2/4-ingenieria/Catalogo-de-API.md`](../../../docs-v2/4-ingenieria/Catalogo-de-API.md).
- **`GET /health/detailed` es público y revela el estado de las dependencias** (base y Redis, con latencia). Es
  una característica declarada, no un descuido: se usa para diagnosticar desde fuera. Queda escrito para que
  quien endurezca el despliegue sepa que está ahí.

> **Este fichero se queda obsoleto solo.** Lo vigila `inventario-de-endpoints-completo.spec.ts`: ninguna ruta
> montada puede faltar, y **ninguna ruta documentada puede no existir** — que es la mitad que faltaba, y por la
> que este inventario documentó `/users/settings` durante meses después de que H-020 demostrara que no existe.

---

## Admin — 80 rutas

Todo el panel va por `AdminDualAuthGuard` (sesión de ADMIN **o** `ADMIN_API_KEY`) y lleva `@SkipThrottle()`.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/admin/account-verifications` | AdminDualAuthGuard | — |
| POST | `/admin/account-verifications/:id/sent` | AdminDualAuthGuard | — |
| GET | `/admin/auctions` | AdminDualAuthGuard | — |
| GET | `/admin/auctions/:id` | AdminDualAuthGuard | — |
| PATCH | `/admin/auctions/:id/approve` | AdminDualAuthGuard | — |
| PATCH | `/admin/auctions/:id/cancel` | AdminDualAuthGuard | — |
| PATCH | `/admin/auctions/:id/force-close` | AdminDualAuthGuard | — |
| PATCH | `/admin/auctions/:id/reject` | AdminDualAuthGuard | — |
| PATCH | `/admin/auctions/:id/reopen` | AdminDualAuthGuard | — |
| PATCH | `/admin/auctions/:id/suspend` | AdminDualAuthGuard | — |
| GET | `/admin/audit-logs` | AdminDualAuthGuard | — |
| POST | `/admin/auth/login` | Public | — |
| GET | `/admin/cfdi` | AdminDualAuthGuard | — |
| GET | `/admin/cfdi/:orderId` | AdminDualAuthGuard | — |
| POST | `/admin/cfdi/:orderId/cancel` | AdminDualAuthGuard | — |
| POST | `/admin/cfdi/:orderId/generate` | AdminDualAuthGuard | — |
| GET | `/admin/cms` | AdminDualAuthGuard | — |
| PUT | `/admin/cms/:key` | AdminDualAuthGuard | — |
| GET | `/admin/configuration/cfdi` | AdminDualAuthGuard | — |
| PUT | `/admin/configuration/cfdi` | AdminDualAuthGuard | — |
| GET | `/admin/configuration/platform` | AdminDualAuthGuard | — |
| PUT | `/admin/configuration/platform` | AdminDualAuthGuard | — |
| GET | `/admin/configuration/smtp` | AdminDualAuthGuard | — |
| PUT | `/admin/configuration/smtp` | AdminDualAuthGuard | — |
| GET | `/admin/configuration/storage` | AdminDualAuthGuard | — |
| PUT | `/admin/configuration/storage` | AdminDualAuthGuard | — |
| GET | `/admin/dashboard/extended-stats` | AdminDualAuthGuard | — |
| GET | `/admin/dashboard/revenue-by-day` | AdminDualAuthGuard | — |
| GET | `/admin/dashboard/users-by-day` | AdminDualAuthGuard | — |
| GET | `/admin/disputes` | AdminDualAuthGuard | — |
| GET | `/admin/disputes/:id` | AdminDualAuthGuard | — |
| POST | `/admin/disputes/:id/request-evidence` | AdminDualAuthGuard | — |
| POST | `/admin/disputes/:id/resolve-buyer` | AdminDualAuthGuard | — |
| POST | `/admin/disputes/:id/resolve-seller` | AdminDualAuthGuard | — |
| GET | `/admin/financial/commissions/config` | AdminDualAuthGuard | — |
| DELETE | `/admin/financial/commissions/config/:id` | AdminDualAuthGuard | — |
| PUT | `/admin/financial/commissions/config/global` | AdminDualAuthGuard | — |
| PUT | `/admin/financial/commissions/config/seller/:sellerId` | AdminDualAuthGuard | — |
| GET | `/admin/financial/commissions/records` | AdminDualAuthGuard | — |
| PATCH | `/admin/financial/commissions/records/:id/mark-collected` | AdminDualAuthGuard | — |
| GET | `/admin/kyc` | AdminDualAuthGuard | — |
| GET | `/admin/kyc/:id` | AdminDualAuthGuard | — |
| PATCH | `/admin/kyc/:id/approve` | AdminDualAuthGuard | — |
| PATCH | `/admin/kyc/:id/reject` | AdminDualAuthGuard | — |
| PATCH | `/admin/kyc/:id/request-correction` | AdminDualAuthGuard | — |
| GET | `/admin/lots` | AdminDualAuthGuard | — |
| GET | `/admin/lots/:id` | AdminDualAuthGuard | — |
| PATCH | `/admin/lots/:id` | AdminDualAuthGuard | — |
| PATCH | `/admin/lots/:id/block` | AdminDualAuthGuard | — |
| PATCH | `/admin/lots/:id/unblock` | AdminDualAuthGuard | — |
| GET | `/admin/moderation` | AdminDualAuthGuard | — |
| PATCH | `/admin/moderation/:id/approve` | AdminDualAuthGuard | — |
| PATCH | `/admin/moderation/:id/reject` | AdminDualAuthGuard | — |
| GET | `/admin/notifications/campaigns` | AdminDualAuthGuard | — |
| POST | `/admin/notifications/campaigns` | AdminDualAuthGuard | — |
| GET | `/admin/orders` | AdminDualAuthGuard | — |
| GET | `/admin/payments` | AdminDualAuthGuard | — |
| GET | `/admin/payments/anomalies` | AdminDualAuthGuard | — |
| GET | `/admin/payments/trace/:reference` | AdminDualAuthGuard | — |
| GET | `/admin/queues` | AdminDualAuthGuard | — |
| GET | `/admin/reconciliation` | AdminDualAuthGuard | — |
| GET | `/admin/reconciliation/export` | AdminDualAuthGuard | — |
| GET | `/admin/refunds` | AdminDualAuthGuard | — |
| POST | `/admin/refunds` | AdminDualAuthGuard | — |
| PATCH | `/admin/refunds/:id/status` | AdminDualAuthGuard | — |
| GET | `/admin/reports/financial` | AdminDualAuthGuard | — |
| GET | `/admin/reports/fiscal` | AdminDualAuthGuard | — |
| GET | `/admin/reports/operational` | AdminDualAuthGuard | — |
| GET | `/admin/seo` | AdminDualAuthGuard | — |
| PUT | `/admin/seo/:page` | AdminDualAuthGuard | — |
| GET | `/admin/stats` | AdminDualAuthGuard | — |
| GET | `/admin/system/payment-config` | AdminDualAuthGuard | — |
| PUT | `/admin/system/payment-config` | AdminDualAuthGuard | — |
| GET | `/admin/users` | AdminDualAuthGuard | — |
| GET | `/admin/users/:id` | AdminDualAuthGuard | — |
| PATCH | `/admin/users/:id` | AdminDualAuthGuard | — |
| GET | `/admin/withdrawals` | AdminDualAuthGuard | — |
| PATCH | `/admin/withdrawals/:id/approve` | AdminDualAuthGuard | — |
| PATCH | `/admin/withdrawals/:id/mark-paid` | AdminDualAuthGuard | — |
| PATCH | `/admin/withdrawals/:id/reject` | AdminDualAuthGuard | — |

## Auctions — 5 rutas

El catálogo es público a propósito: es lo que se ve antes de registrarse.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/auctions` | Public | — |
| POST | `/auctions` | JWT | — |
| GET | `/auctions/:id` | Public | — |
| PATCH | `/auctions/:id` | JWT | — |
| POST | `/auctions/:id/publish` | JWT | — |

## Auth — 12 rutas

Los flujos de entrada son `Public` por necesidad. `register` y `login` van a **5/min en producción** (60 fuera); `register` pasa además por `RecaptchaGuard`, que desde PT-182 **verifica de verdad**.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| POST | `/auth/2fa/disable` | JWT | — |
| POST | `/auth/2fa/enable` | JWT | — |
| POST | `/auth/2fa/generate` | JWT | — |
| POST | `/auth/change-password` | JWT | — |
| POST | `/auth/forgot-password` | Public | — |
| POST | `/auth/login` | Public | — |
| POST | `/auth/logout` | JWT | — |
| GET | `/auth/me` | JWT | — |
| POST | `/auth/refresh` | Public | — |
| POST | `/auth/register` | Public | — |
| POST | `/auth/reset-password` | Public | — |
| POST | `/auth/verify-email` | Public | — |

## Bids — 4 rutas

Leer las pujas de una subasta es público; pujar exige sesión.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/auctions/:auctionId/bids` | Public | — |
| POST | `/auctions/:auctionId/bids` | JWT | — |
| GET | `/bids/my-active` | JWT | — |
| GET | `/bids/my-history` | JWT | — |

## Diagnostics — 9 rutas

**No existen en producción**: todo el controlador va detrás de `DevelopmentOnlyGuard`.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/diagnostics/audit` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/audit/entity/:type/:id` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/errors` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/errors/trace/:traceId` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/metrics` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/ping` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/requests` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/requests/slow` | DevelopmentOnlyGuard + DevOnly | — |
| GET | `/diagnostics/stats` | DevelopmentOnlyGuard + DevOnly | — |

## Disputes — 3 rutas

Ventana de 14 días (`DISPUTE_WINDOW_DAYS`) desde la entrega.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/disputes` | JWT | — |
| POST | `/disputes` | JWT | DISPUTE_OPENED |
| GET | `/disputes/:id` | JWT | — |

## Health — 2 rutas

`Public` y con `@SkipThrottle()` — sin lo segundo, el endpoint que diagnostica la caída de Redis **era el que la caída silenciaba** (PT-178).

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/health` | Public | — |
| GET | `/health/detailed` | Public | — |

## KYC — 2 rutas

Puerta obligatoria del retiro del vendedor (PT-069).

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| POST | `/kyc` | JWT | — |
| GET | `/kyc/me` | JWT | — |

## Notifications — 4 rutas

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/notifications` | JWT | — |
| PATCH | `/notifications/:id/read` | JWT | — |
| PATCH | `/notifications/read-all` | JWT | — |
| GET | `/notifications/unread-count` | JWT | — |

## Orders — 2 rutas

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/orders` | JWT | — |
| GET | `/orders/:id` | JWT | — |

## Payments — 6 rutas

El webhook es `Public` —lo llama la pasarela— y va a 20/min. La validación de firma **difiere por formato**: Webhooks de Mercado Pago llevan HMAC verificable; IPN no, y ahí la consulta a la pasarela es la única fuente de verdad.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| POST | `/payments/initiate` | JWT | — |
| GET | `/payments/methods` | JWT | — |
| POST | `/payments/process` | JWT | — |
| GET | `/payments/providers` | JWT | — |
| GET | `/payments/status/:reference` | JWT | — |
| POST | `/payments/webhook/:provider` | Public | — |

## Ratings — 2 rutas

La reputación pública tiene su propio límite (`RATINGS_PUBLIC_LIMIT`, PT-163): es lo que se consulta **antes** de registrarse, así que el límite levanta el listón frente al raspado sin cerrar la puerta.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| POST | `/ratings` | JWT | RATING_SUBMITTED |
| GET | `/users/:userId/ratings` | Public | — |

## Scheduler — 2 rutas

**No existen en producción** (`DevelopmentOnlyGuard`). Son los disparadores que permiten a QA recorrer la cadena sin esperar 72 h ni los 120 s de la ventana de cierre — PT-175. **Configurar no es falsear**: se ejecuta el mismo código y sólo se adelanta el reloj.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| POST | `/scheduler/expire-auction/:id` | DevelopmentOnlyGuard + DevOnly | — |
| POST | `/scheduler/release-settlements` | DevelopmentOnlyGuard + DevOnly | — |

## Shipments — 3 rutas

**La recepción la confirma quien recibe** (PT-174): el vendedor declara `SHIPPED`, el comprador —y sólo él— confirma `DELIVERED`. Antes ambos cambios eran del vendedor, que así liberaba su propio holdback.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| POST | `/shipments` | JWT | — |
| GET | `/shipments/:id` | JWT | — |
| PATCH | `/shipments/:id/status` | JWT | SHIPMENT_UPDATED |

## Upload — 1 rutas

Escritura en disco local; no hay almacenamiento remoto en v1.0.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| POST | `/upload/image` | JWT | — |

## Users — 9 rutas

Ojo con la forma de las rutas: son `/users/me/...`, **no** `/users/settings`. Esa ruta nunca existió y el CLIENT la pedía: caía en el comodín `@Get(':id')`, el `ParseUUIDPipe` la rechazaba y devolvía **400 «uuid inválido»** (H-020). Este inventario la documentó durante meses.

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/users/:id` | JWT | — |
| GET | `/users/me` | JWT | — |
| PATCH | `/users/me` | JWT | — |
| POST | `/users/me/enable-seller` | JWT | — |
| POST | `/users/me/resend-verification` | JWT | — |
| GET | `/users/me/settings` | JWT | — |
| PATCH | `/users/me/settings` | JWT | USER_SETTINGS_UPDATE |
| GET | `/users/me/stats` | JWT | — |
| GET | `/users/me/verification-status` | JWT | — |

## Wallet — 10 rutas

Los retiros y la verificación de método de pago van a **5–10/min**. Todo camino que mueve saldo lee bloqueando la fila (`SELECT … FOR UPDATE`, RULE-24).

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/wallet/balance` | JWT | — |
| GET | `/wallet/history` | JWT | — |
| GET | `/wallet/payment-methods` | JWT | — |
| POST | `/wallet/payment-methods` | JWT | — |
| POST | `/wallet/payment-methods/:id/verify` | JWT | — |
| POST | `/wallet/payment-methods/:id/verify/confirm` | JWT | — |
| POST | `/wallet/payment-methods/paypal` | JWT | — |
| POST | `/wallet/withdraw` | JWT | PAYMENT_INITIATED |
| GET | `/wallet/withdrawals` | JWT | — |
| POST | `/wallet/withdrawals` | JWT | PAYMENT_INITIATED |

## Watchlist — 3 rutas

| Método | Ruta | Autorización | Evento de auditoría |
|---|---|---|---|
| GET | `/watchlist` | JWT | — |
| POST | `/watchlist` | JWT | — |
| DELETE | `/watchlist/:auctionId` | JWT | — |
