# Inventory — Services

All injectable NestJS services across services.
**Source:** `src/api/src/**/*.service.ts`, `src/admin/src/**/*.service.ts`,
`src/apps/{base,client}/src/**/*.service.ts`, `src/packages/core/src/`

> **Alcance corregido el 2026-07-30.** El título decía *«all … across services»* y la línea de origen
> declaraba uno más estrecho —sólo `src/api/src/modules/**` y un único fichero de ADMIN—, así que el
> documento **se leía como completo y nombraba 39 de 48**. Las dos frases no podían ser ciertas a la
> vez. Se amplía el origen, que es lo que el título ya prometía. Lo vigila
> `inventarios-completos.spec.ts`.

---

## API Services (`src/api/src/`)

### Infrastructure Services

| Service | Module | Responsibility |
|---|---|---|
| `PrismaService` | `DatabaseModule` | Prisma client; DB connection; lifecycle hooks |
| `StructuredLogger` | `ObservabilityModule` | JSON structured logging; NestJS logger interface |
| `RequestContextService` | `ObservabilityModule` | AsyncLocalStorage context (traceId, userId) |
| `MetricsService` | `ObservabilityModule` | In-memory metrics collection |
| `AuditService` | `AuditModule` | Persists AuditEvent, ErrorEvent, RequestLog to DB |
| `DistributedLockService` | `common/redis/` | Redis-based distributed lock (for scheduler) |
| `SystemConfigService` | `SystemConfigModule` | Runtime key-value configuration from DB |

### Feature Services

| Service | Module | Key Responsibilities |
|---|---|---|
| `AuthService` | `AuthModule` | Register, login, logout, token refresh, password reset, email verify |
| `TwoFactorAuthService` | `AuthModule` | TOTP secret generation, verification, enable/disable |
| `UsersService` | `UsersModule` | User profile CRUD, seller onboarding, settings |
| `AuctionsService` | `AuctionsModule` | Auction CRUD, publish, cancel, status management |
| `BidsService` | `BidsModule` | Bid placement, fund locking, outbid release, WebSocket broadcast |
| `WalletService` | `WalletModule` | Balance management, deposit, withdraw, ledger entries, held funds |
| `PaymentsService` | `PaymentsModule` | Payment initiation, webhook handling, HMAC validation, provider routing |
| `OrdersService` | `OrdersModule` | Order creation, status transitions, cancellation |
| `ShipmentsService` | `ShipmentsModule` | Shipment registration, tracking updates, delivery confirmation |
| `RatingsService` | `RatingsModule` | Rating submission and retrieval |
| `DisputesService` | `DisputesModule` | Dispute creation (with 14-day window check), status management |
| `NotificationsService` | `NotificationsModule` | In-app notification delivery; bulk campaigns |
| `WatchlistService` | `WatchlistModule` | Watchlist add/remove/list |
| `UploadService` | `UploadModule` | File upload handling |
| `AdminService` | `AdminModule` | Admin-specific user, auction, and platform management operations |
| `SystemCleanupService` | `SystemCleanupModule` | Scheduled cleanup of expired sessions, old logs |
| `CommissionsService` | `CommissionsModule` | Commission rate config, per-order commission records |
| `KycService` | `KycModule` | KYC submission management, status transitions |
| `CfdiService` | `CfdiModule` | CFDI record management (stub — no real PAC integration) |
| `RefundsService` | `RefundsModule` | Refund request lifecycle |
| `SeoService` | `SeoModule` | Per-page SEO metadata CRUD |
| `CmsService` | `CmsModule` | Content key-value CRUD |
| `FeatureFlagsService` | `FeatureFlagsModule` | Feature toggle management |

### Scheduler Services

| Service | Cron | Lock | Responsibility |
|---|---|---|---|
| `AuctionSchedulerService` | Every 60s | `lock:auction-close` (Redis) | Close expired auctions, start scheduled auctions |

Source: `src/api/src/modules/scheduler/auction-scheduler.service.ts`

---

## @ironloot/core Use Cases (`src/packages/core/src/application/`)

| Use Case | Location | Responsibility |
|---|---|---|
| `CloseAuctionUseCase` | `application/auctions/` | Domain logic for closing an auction (no I/O — pure) |
| `PlaceBidUseCase` | `application/bids/` | Domain validation for bid placement |
| `ProcessPaymentUseCase` | `application/payments/` | Domain logic for payment processing |
| `ProcessRefundUseCase` | `application/payments/` | Domain logic for refund processing |

---

## @ironloot/core Domain Logic (`src/packages/core/src/domain/`)

| Class | Location | Responsibility |
|---|---|---|
| `AuctionStateMachine` | `domain/auction/` | Valid state transitions for AuctionStatus |
| `BidValidation` | `domain/bid/` | Bid amount and ownership validation rules |
| `DisputeStateMachine` | `domain/dispute/` | Valid state transitions for DisputeStatus |
| `Money` | `domain/money/` | MXN money value object with arithmetic |
| `OrderStateMachine` | `domain/order/` | Valid state transitions for OrderStatus |
| `WebhookSignatureValidator` | `domain/payment/` | HMAC signature validation for payment webhooks |
| `IpnValidator` | `domain/payment/` | IPN (Instant Payment Notification) validation |
| `WalletCalculation` | `domain/wallet/` | Balance calculation rules (held funds, available) |


## Módulo `payments` — servicios añadidos por PT-080

| Servicio | Responsabilidad |
|---|---|
| `PaymentCycleService` | Fases del ciclo: abre la solicitud, evalúa la respuesta contra el invariante (usuario, importe, moneda) y la cierra. **Decide, no acredita.** Primera respuesta gana. |
| `PaymentReconciliationService` | Vía garantizada. Cron que consulta a la pasarela por las solicitudes abiertas, con retroceso exponencial (1 min…12 h) y expiración a `PAYMENT_EXPIRATION_HOURS` (72). **PT-087**: resuelve el adaptador por el registro; ya no conoce pasarelas. Un proveedor que no declare `findPayment` no tiene vía garantizada, y eso es explícito. |
| `PaymentProviderRegistry` | Resuelve el adaptador por clave o alias. Añadir o quitar una pasarela no obliga a tocar `PaymentsService`. |
| `PaymentTraceService` (PT-086) | **Punto único de escritura de la traza.** La redacción de credenciales vive dentro: ningún llamante puede saltársela. Normaliza objetos no planos (`Decimal`, `Date`) antes de persistir, y **nunca lanza** — un apunte no puede costar un depósito. |

`PaymentsService.applyProviderResult()` es el punto único por el que pasa toda respuesta de una
pasarela, llegue por notificación (vía rápida) o por consulta (vía garantizada).


---

## Servicios que faltaban en el inventario (añadidos 2026-07-27, PT-109)

El inventario venía del recorrido de Foundation Protocol del 23-jun y no recogía estos. Cada uno
con el fichero donde se lee, que es la regla desde PT-090.

| Servicio | Módulo | Responsabilidad | Fichero |
|---|---|---|---|
| `AccountVerificationService` | `WalletModule` | Verifica que una cuenta de cobro es del vendedor moviendo **20 MXN** con un **token corto de 6 caracteres** como concepto. Cierra TD-003 (PT-092) | `modules/wallet/account-verification.service.ts` |
| `WithdrawalsService` | `WalletModule` | Solicitud y despacho de retiros. Exige KYC aprobado **y cuenta verificada** (`:50`) | `modules/wallet/withdrawals.service.ts` |
| `EmailService` | `NotificationsModule` | Correo saliente vía `@nestjs-modules/mailer` | `modules/notifications/email.service.ts` |
| `HealthService` | `HealthModule` | `/health` y `/health/detailed` | `modules/health/health.service.ts` |
| `AuditPersistenceService` | `AuditModule` | Escritura del registro inmutable de eventos | `modules/audit/audit-persistence.service.ts` |

### Sobre `AccountVerificationService`, lo que no es obvio

- El **token nunca viaja en una respuesta de la API**. Si viajara, quien pide la verificación lo
  sabría sin haber accedido nunca a la cuenta, y la verificación no probaría nada.
- El alfabeto excluye `0/O` y `1/I/L`: el código se dicta por teléfono y se transcribe a mano.
- Se acepta **en minúsculas**: exigir mayúsculas sería castigar al usuario por cómo teclea.
- **Nunca se escribe en la traza de pagos** (`PaymentTraceService`).

## ADMIN Services (`src/admin/src/`)

> **Completado el 2026-07-31 (PT-236). Antes nombraba 8 de 21, y la guarda estaba en verde.**
>
> El motivo es la parte que importa: `C3` comparaba **nombres de clase** contra el documento entero, y
> **18 de los 19 servicios de módulo de ADMIN se llaman igual que uno del API** — `AuditService`,
> `CmsService`, `KycService`, `OrdersService`, `UsersService`, `WithdrawalsService`… La fila del API
> satisfacía la comprobación del de ADMIN, así que trece servicios podían faltar **sin que nada
> protestara**. Es un falso *negativo* por medir por nombre: la otra cara del falso positivo que
> `core-sin-superficie-huerfana.spec.ts` ya documenta, y más caro, porque no se ve.
>
> Lo vigila `inventarios-completos.spec.ts` con `C3-bis`, que resuelve **por sección**: un servicio de
> ADMIN sólo cuenta si lo nombra una sección cuyo encabezado diga `src/admin/src`.
>
> Había además **dos** secciones de ADMIN —«Admin Services» y «ADMIN Services»— con contenidos
> distintos. Se funden aquí: dos tablas para un mismo alcance son dos respuestas a la misma pregunta.

| Service | Fichero | Qué hace |
|---|---|---|
| `AppService` | `app.service.ts` | Todas las llamadas de proxy al API; estadísticas del panel |
| `AdminApiClient` | `shared/admin-api-client.service.ts` | Cliente HTTP hacia el API, con su propio refresco de JWT |
| `AuctionsAdminService` | `modules/auctions/auctions.service.ts` | Moderación de subastas desde el panel |
| `AuditService` | `modules/audit/audit.service.ts` | Consulta y exportación del registro inmutable |
| `CfdiService` | `modules/cfdi/cfdi.service.ts` | Facturas CFDI: emisión y cancelación |
| `CmsService` | `modules/cms/cms.service.ts` | Contenido editable del sitio |
| `CommissionsService` | `modules/commissions/commissions.service.ts` | Configuración de comisiones y su recaudación |
| `ConfigurationService` | `modules/configuration/configuration.service.ts` | Configuración de pago y almacenamiento |
| `DisputesService` | `modules/disputes/disputes.service.ts` | Resolución de disputas; dispara el reembolso |
| `KycService` | `modules/kyc/kyc.service.ts` | Revisión de identidad: aprobar, rechazar, pedir corrección |
| `LotsService` | `modules/lots/lots.service.ts` | Lotes |
| `ModerationService` | `modules/moderation/moderation.service.ts` | Cola de moderación |
| `NotificationsService` | `modules/notifications/notifications.service.ts` | Campañas y notificaciones por segmento |
| `OrdersService` | `modules/orders/orders.service.ts` | Pedidos desde el panel |
| `PaymentsService` | `modules/payments/payments.service.ts` | Pagos, anomalías y traza por referencia |
| `ReconciliationService` | `modules/reconciliation/reconciliation.service.ts` | Conciliación de pagos |
| `RefundsService` | `modules/refunds/refunds.service.ts` | Flujo de reembolsos |
| `ReportsService` | `modules/reports/reports.service.ts` | Informes del panel |
| `SeoService` | `modules/seo/seo.service.ts` | Metadatos SEO y sitemap |
| `UsersService` | `modules/users/users.service.ts` | Gestión de cuentas |
| `WithdrawalsService` | `modules/withdrawals/withdrawals.service.ts` | Cola de retiros: aprobar, rechazar y marcar pagado (`PT-216`) |

Source: `src/admin/src/**/*.service.ts` — **21 servicios**, que son todos los que existen.

## Observabilidad (`src/api/src/common/observability/`)

| Service | Fichero | Qué hace |
|---|---|---|
| `StructuredLogger` | `logger.service.ts` | Registro estructurado con `traceId`; raíz de todos los hijos |
| `ChildLogger` | `logger.service.ts` | Registro con contexto de un servicio concreto (`logger.child('X')`) |

> Los dos de observabilidad viven **fuera de `modules/`**, y por eso el origen anterior no los alcanzaba.
> Se nombran porque son inyectables y porque `StructuredLogger` es dependencia de casi todo el API: un
> inventario de servicios que no lo mencione da una imagen falsa de las dependencias.
