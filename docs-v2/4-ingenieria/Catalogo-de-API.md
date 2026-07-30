# Catálogo de API (REST + WebSocket) — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia (deriva del código, no de Swagger) |
| **Fuente** | `audit/raw/B-api-backend.md`, controllers de `src/api/src/modules/*` |
| **Fecha** | 2026-07-23 · **medido de nuevo 2026-07-29** (PT-188) |
| **Documentos usados** | 08-API-Catalog, inventory/endpoints |
| **Código usado** | `*.controller.ts` de los 27 módulos, `main.ts` |
| **Nivel de confianza** | Alto (cada endpoint citado `archivo:línea` en `audit/raw/B`) |

> **159 endpoints** — medidos el 2026-07-29 sobre los controladores y contrastados con lo que Nest declara
> montado al arrancar. Prefijo global `/api/v1` (versionado URI, `main.ts:89-95`). Guards: `JWT`=JwtAuthGuard ·
> `Public`=@Public · `AdminDual`=sesión de ADMIN o `x-admin-key` · `DevOnly`=no existe en producción ·
> `Recaptcha`. Throttle: global 100/min salvo lo indicado.
>
> **Decía «~118».** Faltaban 41, entre ellas los dos disparadores del planificador, el reenvío de verificación y
> los `/users/me/*`. Y su reparto por autorización es: **79** `AdminDual` · **55** `JWT` · **14** `Public` ·
> **11** `DevOnly`.

> **La lista exhaustiva vive en un solo sitio.** Este catálogo describe **guard y límite** por familia de rutas;
> la enumeración completa y medida de las 159 está en
> [`docs/enterprise-documentation/inventory/endpoints.md`](../../docs/enterprise-documentation/inventory/endpoints.md),
> que tiene guarda en las dos direcciones (`inventario-de-endpoints-completo.spec.ts`).
>
> No se duplica aquí a propósito: mantener dos listas de 159 filas es exactamente el problema que **ADR-049**
> resolvió — cada PT pagaría la escritura doble y la divergencia sería cuestión de tiempo.

> **`@Public()` no significa «sin autorización»: significa «no pases por el JWT global».**
> `admin.controller.ts` declara `@UseGuards(AdminDualAuthGuard)` **y** `@Public()` a la vez. Leerlo mal daría por
> abiertos los ochenta endpoints del módulo de más privilegio del sistema.

## Auth (`/auth`) — 12
| Método | Ruta | Guard | Throttle |
|---|---|---|---|
| POST | /auth/register | Public+Recaptcha | 5(prod)/60(dev)/60s |
| POST | /auth/login | Public | 5/60/60s |
| POST | /auth/refresh | Public | default | **Rota** el refresh token: el que devuelve **no es el que se envió** (PT-196). Un cliente que ignore ese campo deja de funcionar en su segundo refresco. Presentar uno ya rotado fuera de `ROTATION_GRACE_SEC` **revoca la sesión** |
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

## Wallet (`/wallet`) — 8 · Payments (`/payments`) — 6 · KYC (`/kyc`) — 2
| Método | Ruta | Guard | Throttle |
|---|---|---|---|
| GET | /wallet/balance \| /wallet/history | JWT | default |
| ~~POST~~ | ~~/wallet/deposit~~ | — | — | **RETIRADO (PT-133)**. Sin llamantes. El deposito real es `POST /payments/initiate` (ciclo de pago, PT-080/PT-087). Acreditaba dinero a partir de un `referenceId` elegido por el cliente: superficie que mueve saldo, sin uso ni cobertura. Ver ADR-047 |
| POST | /wallet/withdraw | JWT | 5/60s |
| GET/POST | /wallet/payment-methods | JWT | default |
| GET/POST | /wallet/withdrawals | JWT | default |
| POST | /kyc · GET /kyc/me | JWT | default |
| POST | /payments/checkout | JWT | default |
| POST | /payments/webhook/:provider | **Public** | 20/60s | PT-080: acepta los dos formatos de MP (Webhooks e IPN). Firma invalida -> **401** (antes 500). Duplicado -> 2xx sin acreditar. Desajuste con la solicitud -> ANOMALY. |
| POST | /payments/initiate \| /payments/process | JWT | default |
| GET | /payments/providers \| /payments/methods | Public | default |
| GET | /payments/status/:reference | JWT | default | **PT-088**: estado del deposito propio, para la pagina de retorno. El `status` de la URL lo escribe el navegador y no decide nada. **404 si no existe O no es del usuario** (indistinguibles a proposito: distinguirlos confirmaria que existe). Un ciclo abierto se informa `pending`, jamas `failed`. |

> **Retiro del vendedor (PT-069..072).** `GET /wallet/balance` expone ahora `{ balance, held, pending }`
> (`pending` = liquidaciones retenidas). `POST /wallet/payment-methods` registra la CLABE (validada, RN-63).
> `POST /wallet/withdrawals {amount, paymentMethodId}` crea la solicitud y **reserva** el saldo (RN-65);
> `GET /wallet/withdrawals` lista las del vendedor. Lado admin: `GET /admin/withdrawals[?status]`,
> `PATCH /admin/withdrawals/:id/approve|reject|mark-paid` (RN-66). KYC: `POST /kyc` (submission→PENDING),
> `GET /kyc/me`; aprobación admin `PATCH /admin/kyc/:id/approve` (habilita venta y retiro, RN-62).

## Orders — 2 · Shipments — 3 · Ratings — 2 · Disputes — 3
| Método | Ruta | Guard |
|---|---|---|
| GET | /orders \| /orders/:id | JWT |
| POST | /shipments · GET /shipments/:id · PATCH /shipments/:id/status | JWT |
| POST | /ratings · GET /users/:userId/ratings | JWT / Public |
| POST | /disputes · GET /disputes · GET /disputes/:id | JWT |

## Users (`/users`) — 9 · Notifications — 4 · Watchlist — 3 · Upload — 1 · Health — 2
- Users: `/users/me` (GET/PATCH), `/me/stats`, `/me/verification-status`, `/me/settings` (GET/PATCH), `/me/resend-verification`, `/me/enable-seller`, `/users/:id` (OptJWT). 
- Notifications: list, unread-count, read-all, `:id/read`.
- Watchlist: GET, POST, DELETE `/:auctionId`.
- Upload: `POST /upload/image` (JWT, mime-restringido).
- Health: `/health`, `/health/detailed` (Public).

## Admin (`/admin`) — **80** (79 `AdminDualAuthGuard` + `POST /admin/auth/login` público, que es el que emite el token)
`POST /admin/auth/login` es **Public** —es el endpoint que **emite** el token— **con `@Throttle` de 10/min** (`admin-auth.controller.ts:40`). Decía `@SkipThrottle`, y eso es del **resto** de `/admin/**`, no del login: medido el 2026-07-29, `AUD-004` corregido. Bloques: dashboard/stats · users · auctions(moderación) · lots · orders/payments · financial/commissions · reports(financial/operational/fiscal) · configuration(platform/smtp/storage/cfdi/payment) · disputes(resolve-buyer/seller/request-evidence) · audit-logs · moderation · kyc · **cfdi(generate ✗ stub)** · notifications/campaigns · refunds · **reconciliation (PT-080: operativa, lee `payment_cycles`)** · **payments/anomalies (PT-080: cola de revision)** · **payments/trace/:reference (PT-086: traza completa de la transaccion)** · seo/cms · queues. Detalle de rutas en `audit/raw/B §1`.

## Scheduler (`/scheduler`) — 2 (`DevOnly`)

**No existen en producción** (`DevelopmentOnlyGuard`). Son los disparadores que permiten a QA recorrer la cadena
completa sin esperar 72 h ni los 120 s de la ventana de cierre (PT-175).

| Método | Ruta | Guard | Para qué |
|---|---|---|---|
| POST | /scheduler/release-settlements | DevOnly | Ejecuta la liberación del holdback ahora. Devuelve `pendientesAntes` / `pendientesDespues` / `liberados` |
| POST | /scheduler/expire-auction/:id | DevOnly | Lleva `endsAt` al pasado y cierra la subasta |

**Configurar no es falsear**: se ejecuta el mismo código y sólo se adelanta el reloj. Sembrar el resultado con un
`INSERT` sí sería falsear, y es lo que la fase 35 dejó de hacer.

## Diagnostics (`/diagnostics`) — 9 (`DevOnly`)
Logs/metrics/errors dev-only; TODO restringir en prod (`AUD-025`).

## WebSocket
| Namespace | Eventos salientes | Entrantes | Auth |
|---|---|---|---|
| `auctions` | `bid:new`, `auction:extended` | joinAuction, leaveAuction | **pública a propósito** (`AUD-006` corregido, PT-191): sin autenticación para que la puja en vivo se vea sin cuenta, con las cargas acotadas por prueba. `auction:ended` se retiró — difundía `winnerId` y no lo emitía nadie |
| `events` | `emitAuctionEvent` | joinAuction, leaveAuction | **✗ ninguna** |

CORS de WS por `ALLOWED_ORIGINS`. **Sin cliente WS en el frontend** (`AUD-002`).

> **Nota OpenAPI:** el proyecto expone Swagger (`@nestjs/swagger`, `docker-compose` `/docs`). Este catálogo se derivó del **código** (fuente de verdad), no del documento Swagger, por la regla "gana el código".
