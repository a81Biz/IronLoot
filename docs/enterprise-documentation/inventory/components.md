# Inventory — Components (NestJS Modules)

All NestJS modules across all services.  
**Source:** `src/api/src/app.module.ts`, `src/admin/src/app.module.ts`, `src/apps/base/src/app.module.ts`, `src/apps/client/src/app.module.ts`

---

## API Service (`src/api/`)

### Core Infrastructure Modules

| Module | Location | Purpose |
|---|---|---|
| `AppModule` | `src/api/src/app.module.ts` | Root module; wires all modules + global guards |
| `ConfigModule` | `@nestjs/config` (global) | Loads `.env`, validates env vars |
| `ThrottlerModule` | `@nestjs/throttler` (global) | Rate limiting |
| `ThrottlerRedisModule` | `common/redis/` | Almacén de rate limiting en Redis (PT-030): sin él las cuotas viven en memoria y **cada instancia cuenta la suya** |
| `ThrottlerRedisService` | `common/redis/` | El almacén propiamente dicho, sobre `REDIS_URL` |
| `ObservabilityModule` | `src/api/src/common/observability/` | Logger, metrics, error handling, context middleware |
| `DatabaseModule` | `src/api/src/database/` | PrismaService provider |
| `AuditModule` | `src/api/src/modules/audit/` | Persists audit/error/request log events |
| `HealthModule` | `src/api/src/modules/health/` | `/health` and `/health/detailed` endpoints |
| `DiagnosticsModule` | `src/api/src/modules/diagnostics/` | Dev-only diagnostics dashboard |
| `SchedulerModule` | `src/api/src/modules/scheduler/` | Cron jobs for auction lifecycle |
| `EventEmitterModule` | `@nestjs/event-emitter` | Domain events bus (PT-013) |
| `BullModule` | `@nestjs/bullmq` | Shared Redis connection for BullMQ (PT-038) |
| `ServeStaticModule` | `@nestjs/serve-static` | Serves `/uploads` directory |

### Feature Modules (27 total)

| Module | Location | Controllers | Services |
|---|---|---|---|
| `AuthModule` | `modules/auth/` | `AuthController`, auth guards | `AuthService`, `TwoFactorAuthService` |
| `UsersModule` | `modules/users/` | `UsersController` | `UsersService` |
| `AuctionsModule` | `modules/auctions/` | `AuctionsController` | `AuctionsService` |
| `BidsModule` | `modules/bids/` | `BidsController` | `BidsService` |
| `WalletModule` | `modules/wallet/` | `WalletController` | `WalletService` |
| `PaymentsModule` | `modules/payments/` | `PaymentsController` | `PaymentsService` |
| `OrdersModule` | `modules/orders/` | `OrdersController` | `OrdersService` |
| `ShipmentsModule` | `modules/shipments/` | `ShipmentsController` | `ShipmentsService` |
| `RatingsModule` | `modules/ratings/` | `RatingsController` | `RatingsService` |
| `DisputesModule` | `modules/disputes/` | `DisputesController` | `DisputesService` |
| `NotificationsModule` | `modules/notifications/` | `NotificationsController` | `NotificationsService` |
| `WatchlistModule` | `modules/watchlist/` | `WatchlistController` | `WatchlistService` |
| `UploadModule` | `modules/upload/` | `UploadController` | `UploadService` |
| `AdminModule` | `modules/admin/` | `AdminController`, `AdminAuthController` | `AdminService` |
| `SystemConfigModule` | `modules/system-config/` | — | `SystemConfigService` |
| `SystemCleanupModule` | `modules/system-cleanup/` | — | `SystemCleanupService` |
| `CommissionsModule` | `modules/commissions/` | — | `CommissionsService` |
| `KycModule` | `modules/kyc/` | — | `KycService` |
| `CfdiModule` | `modules/cfdi/` | — | `CfdiService` |
| `RefundsModule` | `modules/refunds/` | — | `RefundsService` |
| `SeoModule` | `modules/seo/` | — | `SeoService` |
| `CmsModule` | `modules/cms/` | — | `CmsService` |
| `FeatureFlagsModule` | `modules/feature-flags/` | — | `FeatureFlagsService` |

---

## Admin Service (`src/admin/`)

| Module | Purpose |
|---|---|
| `AppModule` | Root module |
| `SharedModule` | `AdminApiClient` + session config |
| `AuditModule` | Audit event viewer |
| `ReportsModule` | Platform reports |
| `NotificationsModule` | Notification campaign management |
| `KycModule` | KYC review |
| `ModerationModule` | Auction content moderation |
| `CfdiModule` | CFDI tax invoice management |
| `OrdersModule` | Order management |
| `PaymentsModule` | Payment management |
| `ReconciliationModule` | Financial reconciliation |
| `SeoModule` | SEO metadata management |
| `CmsModule` | Content management |
| `RefundsModule` | Refund management |
| `DisputesModule` | Dispute management |
| `LotsModule` | Lot (auction item) management |
| `CommissionsModule` | Commission management |
| `ConfigurationModule` | System configuration |
| `UsersModule` | User management |
| `AuctionsAdminModule` | Auction moderation |

**Total admin modules: 19** (including AppModule)

---

## BASE Site (`src/apps/base/`)

| Module | Purpose |
|---|---|
| `AppModule` | Root module — just registers AppController |
| `AppController` | All 13 page routes |

---

## CLIENT Site (`src/apps/client/`)

| Module | Purpose |
|---|---|
| `AppModule` | Root module — registers AppController |
| `AppController` | All 21 page routes (buyer + seller portal) |

---

## @ironloot/core (`src/packages/core/`)

No NestJS modules — pure TypeScript library. Architecture layers:

| Layer | Path | Contents |
|---|---|---|
| Domain | `src/domain/` | State machines, value objects, validation rules |
| Application | `src/application/` | Use cases (CloseAuctionUseCase, PlaceBidUseCase, ProcessPaymentUseCase, ProcessRefundUseCase) |
| Contracts | `src/contracts/` | Repository interfaces for DI |
| Events | `src/events/` | Domain event classes |
| Integrations | `src/integrations/` | External service interfaces |
| Shared | `src/shared/` | DTOs (MoneyDto, PaginationDto) |

> **Completado el 2026-07-30 (PT-198).** Faltaban `ThrottlerRedisModule` y `ThrottlerRedisService`. No
> es un detalle de catálogo: **son los que hacen que el rate limiting sea compartido entre instancias**.
> Un inventario que no los nombra sugiere que la cuota es la de `@nestjs/throttler` por defecto —en
> memoria, por proceso—, que es justo lo que PT-030 corrigió.
>
> Las entradas de terceros (`@nestjs/config`, `@nestjs/bullmq`, `@nestjs/throttler`…) se conservan **a
> propósito**: un inventario de módulos que sólo liste los propios no dice de qué depende el arranque.
> La guarda lo tiene en cuenta y sólo exige cobertura de los **locales**.
