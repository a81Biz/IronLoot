# 06 — Backend Architecture

**Source:** `src/api/src/app.module.ts`, `src/api/src/main.ts`, `src/packages/core/src/`, `src/admin/src/app.module.ts`

## 1. Service Topology

```
src/
├── api/           — Main REST API + WebSocket server (NestJS 11, port 3000)
├── apps/
│   ├── base/      — Public SSR site (NestJS 11, port 5174)
│   └── client/    — Private SSR portal (NestJS 11, port 5175)
├── admin/         — Admin backoffice (NestJS 11, port 3001)
├── packages/
│   └── core/      — Shared domain library (@ironloot/core, no HTTP/DB)
└── nginx/         — Reverse proxy
```

## 2. API Module Graph

```
AppModule
├── Core Infrastructure
│   ├── ConfigModule (global, .env + validation)
│   ├── ThrottlerModule (global rate limiting)
│   ├── ObservabilityModule (logging, errors, metrics, ContextMiddleware)
│   ├── DatabaseModule (Prisma client provider)
│   ├── AuditModule (persists AuditEvent + ErrorEvent + RequestLog)
│   ├── HealthModule (/health, /health/detailed)
│   ├── DiagnosticsModule (/diagnostics — dev only)
│   ├── SchedulerModule (cron: auction lifecycle)
│   ├── EventEmitterModule (domain events bus — PT-013)
│   └── BullModule (BullMQ shared Redis connection — PT-038)
│
└── Feature Modules (27)
    ├── AuthModule          — JWT, 2FA, password flows
    ├── UsersModule         — Profiles, seller onboarding
    ├── AuctionsModule      — Auction CRUD + lifecycle
    ├── BidsModule          — Bid placement + fund locking
    ├── WalletModule        — Balance, ledger, held funds
    ├── PaymentsModule      — Mercado Pago, PayPal, webhooks
    │     ├── PaymentProviderRegistry     — resuelve el adaptador por clave/alias (PT-080)
    │     ├── PaymentCycleService          — ciclo en 3 fases; decide, no acredita (PT-080)
    │     ├── PaymentReconciliationService — via garantizada por consulta (PT-080)
    │     └── PaymentTraceService          — traza completa, punto unico de escritura,
    │                                        con redaccion de credenciales dentro (PT-086)
    ├── OrdersModule        — Post-auction orders
    ├── ShipmentsModule     — Carrier tracking
    ├── RatingsModule       — Reputation scores
    ├── DisputesModule      — Conflict resolution
    ├── NotificationsModule — In-app + email
    ├── WatchlistModule     — Auction watchlist
    ├── UploadModule        — File upload handling
    ├── AdminModule         — Admin REST endpoints
    ├── SystemConfigModule  — Runtime key-value config
    ├── SystemCleanupModule — Scheduled data cleanup
    ├── CommissionsModule   — Platform fee tracking
    ├── KycModule           — Seller identity verification
    ├── CfdiModule          — CFDI tax invoice (stub)
    ├── RefundsModule       — Refund workflow
    ├── SeoModule           — SEO metadata management
    ├── CmsModule           — Content management
    └── FeatureFlagsModule  — Feature toggles
```

Source: `src/api/src/app.module.ts`

## 3. Request Pipeline

```
HTTP Request
    │
    ▼
[ContextMiddleware]         — Establishes AsyncLocalStorage context; generates traceId
    │
    ▼
[ThrottlerGuard]            — Rate limiting (global, per-route overrides)
    │
    ▼
[JwtAuthGuard]              — Validates Bearer token; sets req.user; @Public() bypasses
    │
    ▼
[Controller]                — Route handler; validates DTO via ValidationPipe
    │
    ▼
[Service]                   — Business logic; calls Prisma/other services
    │
    ▼
[AuditedAction decorator]   — Optionally persists AuditEvent post-execution
    │
    ▼
[ResponseInterceptor]       — (Observability) logs request/response to RequestLog table
    │
    ▼
[GlobalExceptionFilter]     — Converts exceptions → structured error response + ErrorEvent
```

Source: `src/api/src/app.module.ts:140-160`, `src/api/src/main.ts:70-107`

## 4. Authentication Architecture

### JWT Flow (API)
```
POST /api/v1/auth/login
  → AuthService.login()
  → bcrypt.compare(password, hash)
  → JwtService.sign({ id, email, state, ... })
  → Returns { accessToken, refreshToken, user }

Routes protected by default (JwtAuthGuard as global APP_GUARD)
Public routes decorated with @Public()
Admin routes decorated with @SkipThrottle() (PT-024)
```

### Admin Session Flow
```
POST /login (admin site)
  → Proxies to API POST /api/v1/admin/auth/login
  → On success: req.session.isAdmin = true; req.session.adminUser = username
  → AdminAuthGuard checks session on every admin route
  → Optional TOTP: ADMIN_TOTP_SECRET env var
```

Source: `src/api/src/modules/auth/auth.controller.ts`, `src/admin/src/app.controller.ts:36-74`

## 5. Domain Events Bus

Events emitted via `EventEmitter2` (NestJS EventEmitter):
- `AuctionClosedEvent` — emitted by scheduler after auction close
- `BidPlacedEvent` — emitted on successful bid
- `OrderCreatedEvent` — emitted on order creation
- `PaymentCompletedEvent` — emitted on payment confirmation (**emitido desde PT-080**; antes estaba definido en CORE y nunca se emitia)
- `RefundProcessedEvent` — emitted on refund completion

Event type definitions in `@ironloot/core`: `src/packages/core/src/events/`

Source: `src/api/src/app.module.ts:52-53`, `src/api/src/modules/scheduler/auction-scheduler.service.ts:11`

## 6. Distributed Lock (Redis)

Purpose: Prevent race conditions when multiple API instances run concurrently (auction close cron).

```typescript
// Lock acquisition pattern:
const lock = await distributedLockService.acquireLock('lock:auction-close', 60);
if (!lock) return; // Another instance holds the lock

try {
  await closeExpiredAuctions();
} finally {
  await distributedLockService.releaseLock('lock:auction-close', lock);
}
```

Source: `src/api/src/modules/scheduler/auction-scheduler.service.ts:44-76`

## 7. @ironloot/core — Shared Domain Library

Architecture layers within core:

```
src/packages/core/src/
├── domain/          — Pure domain logic (no I/O)
│   ├── auction/     — AuctionStateMachine, AuctionStatus enum
│   ├── bid/         — BidValidation (amount, ownership checks)
│   ├── dispute/     — DisputeStateMachine
│   ├── money/       — Money value object (MXN)
│   ├── order/       — OrderStateMachine
│   ├── payment/     — WebhookSignatureValidator, IpnValidator (@deprecated desde PT-076)
│   ├── integrations/— IPaymentProvider: puerto de pasarela. Revivido y evolucionado en
│   │                  PT-080 con validacion ASINCRONA, identidad/alias e importe normalizado.
│   └── wallet/      — WalletCalculation
├── application/     — Use cases (orchestrate domain + repos)
│   ├── auctions/    — CloseAuctionUseCase
│   ├── bids/        — PlaceBidUseCase
│   └── (application/) — NO EXISTE. La capa de use-cases fue documentada pero nunca
│                       se cableo, y su fuente no esta en el repositorio: lo unico que
│                       quedaba era un `dist/` de un checkout anterior, ignorado por git.
│                       PT-084 decide NO adoptarla: el flujo de pago de orden ya funciona
│                       en `wallet.service.ts` y `auction-scheduler.service.ts`, y
│                       cablearla reescribiria una ruta de dinero sin ganancia. Ver ADR-033.
├── contracts/       — Repository interfaces (DI contracts)
├── events/          — Domain event classes
├── integrations/    — External service interfaces
└── shared/          — DTOs (MoneyDto, PaginationDto)
```

**Hard constraint:** Never import NestJS, Prisma, Express, or Redis in `@ironloot/core`.

Source: `src/packages/core/src/index.ts:4`, glob of `src/packages/core/src/**/*.ts`

## 8. Admin Backoffice Architecture

Admin is a **standalone NestJS SSR** app that proxies all data operations to the API via `AdminApiClient`:

```
Admin module → AdminApiClient.call(method, path, body)
  → fetch(`${ADMIN_API_URL}${path}`, { headers: { 'x-api-key': ADMIN_API_KEY } })
  → API validates ADMIN_API_KEY on admin-scoped routes
```

Admin has 18 feature modules, each managing one domain slice.

Source: `src/admin/src/app.service.ts:13`, `src/admin/src/app.module.ts`

## 9. Observability Stack

```
StructuredLogger        — JSON log output (log level configurable)
RequestContextService   — AsyncLocalStorage for traceId propagation
ContextMiddleware       — Injects context at request entry
MetricsService          — In-memory metrics
AuditService           — Persists to audit_events table
ErrorEventHandler      — Persists to error_events table
RequestLogInterceptor  — Persists to request_logs table
```

`traceId` format: UUID v4, generated per-request, flows through all log entries.

Source: `src/api/src/common/observability/constants.ts:263-273`
