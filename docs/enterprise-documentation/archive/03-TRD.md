# 03 — Technical Requirements Document (TRD)

**Source:** `src/api/src/main.ts`, `src/api/package.json`, `docker-compose.yml`, `.env.example`

## 1. Runtime Environment

| Requirement | Value | Source |
|---|---|---|
| Node.js | ≥ 20.0.0 | `src/api/package.json:121` |
| npm | ≥ 10.0.0 | `src/api/package.json:122` |
| PostgreSQL | 16 (alpine) | `docker-compose.yml:133` |
| Redis | 7 (alpine) | `docker-compose.yml:162` |
| NestJS | ^11.0.0 | `src/api/package.json:49` |
| Prisma | ^5.8.0 | `src/api/package.json:60` |
| TypeScript | ^5.3.3 | `src/api/package.json:112` |

## 2. API Server NFRs

### 2.1 Performance
- API listens on `API_PORT` (default 3000)
- Memory limit: 1 GB per container (`docker-compose.yml:126`)
- Health check path: `GET /api/v1/health` (`docker-compose.yml:116`)
- Health check interval: 30s, timeout 10s, retries 3

### 2.2 Rate Limiting (global)
- **Global:** 100 req/min per IP (via `@nestjs/throttler`, `ThrottlerGuard` applied globally)
- **Login/Register:** 5 req/min production, 60 req/min development (`auth.controller.ts:35`)
- **Wallet deposit:** 10 req/min (`wallet.controller.ts:84`)
- **Wallet withdraw:** 5 req/min (`wallet.controller.ts:115`)
- **Payment webhooks:** 20 req/min (`payments.controller.ts:47`)

Source: `.env.example:93-100`, `src/api/src/app.module.ts:75-85`

### 2.3 API Versioning
- URI versioning: all routes prefixed `/api/v1/` (`main.ts:89-91, 95`)
- Default version: `1`

### 2.4 Request Validation
- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`
- DTO-level validation via `class-validator` + `class-transformer`

Source: `src/api/src/main.ts:98-107`

## 3. Security NFRs

### 3.1 Secrets (production startup gate)
All of the following must be set and non-placeholder in production — failure causes `process.exit(1)`:
- `ADMIN_API_KEY` — must not be in `PLACEHOLDER_SECRETS` set
- `JWT_SECRET` — min 32 chars, must not be placeholder
- `SESSION_SECRET` — min 32 chars, must not be placeholder
- `ALLOWED_ORIGINS` — must be explicitly set (no allow-all in production)

Source: `src/api/src/main.ts:10-47`

### 3.2 Authentication
- **API:** JWT Bearer tokens (access 15m + refresh 7d). JwtAuthGuard applied globally; `@Public()` opt-out.
- **Admin:** Session-based (express-session) with optional TOTP. Sessions stored server-side (admin service only).
- **BASE/CLIENT BFF:** JWT stored in HttpOnly cookie, injected as `Authorization: Bearer` header on proxy.

### 3.3 CORS
- Origins read from `ALLOWED_ORIGINS` comma-separated list
- `credentials: true` (required for cookie-based auth)
- Production: must be explicit; development: allow-all fallback

Source: `src/api/src/main.ts:72-86`

### 3.4 Security Headers
- All services use `helmet()` middleware
- BASE/CLIENT/ADMIN CSP: `defaultSrc 'self'`, `frameSrc 'none'`, `objectSrc 'none'`, and
  **no `'unsafe-inline'` in any directive** — removed from `script-src` by PT-096 and from
  `style-src` by PT-105. The only external origins are socket.io (CLIENT) and jsDelivr (ADMIN),
  both pinned with SRI. Detail in `09-Security-Architecture.md`
- CSRF: mitigated by JWT Bearer tokens (no cookies sent directly to API); `sameSite: Lax` on auth cookies

Source: `src/apps/base/src/main.ts:41-57`, `src/apps/client/src/main.ts:27-43`

## 4. Database NFRs

- ORM: Prisma 5 (schema: `src/api/prisma/schema.prisma`)
- All IDs: UUID v4 (`@default(uuid()) @db.Uuid`)
- All timestamps: `Timestamptz` (timezone-aware)
- Financial amounts: `Decimal(10,2)` or `Decimal(12,2)` (never `Float`)
- All DB identifiers: `snake_case` via `@map()` annotations
- Cascades: User deletion cascades to Profile and Sessions only; bids/orders preserved
- Migrations: `prisma migrate dev` (dev), `prisma migrate deploy` (production)

Source: `src/api/prisma/schema.prisma`

## 5. Real-Time NFRs

- WebSocket: Socket.io v4 (`src/api/package.json:79`)
- Used for: bid broadcasts, auction state changes
- SSR frontends connect via vanilla JS socket.io client

Source: `CLAUDE.md:178`, `src/api/package.json:79`

## 6. Background Jobs NFRs

- Scheduler: `@nestjs/schedule` (cron-based)
- Critical job (auction close): protected by Redis distributed lock (`DistributedLockService`)
- Lock TTL: 60 seconds (2× max observed execution time)
- Lock key: `lock:auction-close`
- Cron interval: every minute (`CronExpression.EVERY_MINUTE`)

Source: `src/api/src/modules/scheduler/auction-scheduler.service.ts:26-76`

## 7. Queue NFRs (PT-038)

- BullMQ v5 backed by Redis shared connection (`src/api/package.json:63`)
- Configured via `BullModule.forRootAsync` using `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

Source: `src/api/src/app.module.ts:55-65`

## 8. Email NFRs

- Provider: Nodemailer + `@nestjs-modules/mailer` (Handlebars templates)
- Dev: Mailhog at `mailhog:1025` (SMTP), UI at `:8025`
- Env vars: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`

Source: `docker-compose.yml:88-96`, `src/api/package.json:44`

## 9. File Upload NFRs

- Static files served from `/uploads` via `ServeStaticModule`
- Upload path: `process.cwd()/uploads`

Source: `src/api/src/app.module.ts:135-138`

## 10. Observability NFRs

- Structured JSON logging via `StructuredLogger` (custom NestJS logger)
- `traceId` propagated via `AsyncLocalStorage` through `ContextMiddleware`
- Every request logged to `request_logs` table
- Business events logged to `audit_events` table
- Errors logged to `error_events` table
- Diagnostics endpoint (dev only): `/diagnostics`

Source: `src/api/src/common/observability/constants.ts`, `src/api/src/app.module.ts:87-98`

## 11. Integration Contracts

| Integration | Interface | Location |
|---|---|---|
| Payment provider | `IPaymentProvider` | `src/packages/core/src/integrations/payment-provider.interface.ts` |
| CFDI/PAC | `ICfdiPacProvider` | `src/packages/core/src/integrations/cfdi-pac-provider.interface.ts` |
| Email service | `IEmailService` | `src/packages/core/src/integrations/email-service.interface.ts` |
| Storage | `IStorageService` | `src/packages/core/src/integrations/storage-service.interface.ts` |

All integrations defined in `@ironloot/core` — no direct provider SDK imports in domain logic.
