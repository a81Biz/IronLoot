# Inventory — Integrations

All external services and third-party integrations.  
**Source:** `src/api/package.json`, `docker-compose.yml`, `.env.example`, `src/packages/core/src/integrations/`

---

## Payment Providers

### Mercado Pago (Primary)
- **Status:** Implemented and active
- **SDK:** `mercadopago: ^2.11.0` (`src/api/package.json:59`)
- **Config:** `MERCADO_PAGO_ACCESS_TOKEN` env var (`.env.example` — not in visible portion; referenced in CLAUDE.md)
- **Features:** Checkout sessions, webhook notifications, payment method listing
- **Webhook:** `POST /api/v1/payments/webhook/mercado_pago` — HMAC validated
- **Interface:** `IPaymentProvider` (`src/packages/core/src/integrations/payment-provider.interface.ts`)

### PayPal
- **Status:** Implemented (schema + service)
- **SDK:** Possibly `paypal-rest-sdk` or direct HTTP — not confirmed in visible package.json
- **Config:** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (CLAUDE.md:192)
- **Webhook:** `POST /api/v1/payments/webhook/paypal`

### Stripe
- **Status:** SDK installed, integration status UNKNOWN
- **SDK:** `stripe: ^20.1.2` (`src/api/package.json:68`)
- **Config:** Not confirmed in `.env.example`
- **Note:** In `PaymentProvider` enum but not confirmed as an active provider

### Hey Banco
- **Status:** Enum only — no confirmed implementation
- **Note:** Listed in `PaymentProvider` enum, no SDK found

---

## Email

### Nodemailer + @nestjs-modules/mailer
- **Status:** Configured and operational (dev: Mailhog; prod: real SMTP)
- **SDK:** `nodemailer: ^7.0.12`, `@nestjs-modules/mailer: ^2.0.2` (`src/api/package.json:42, 34`)
- **Template engine:** Handlebars (`handlebars: ^4.7.8`)
- **Dev SMTP:** Mailhog at `mailhog:1025` (Docker service)
- **Dev UI:** `http://localhost:8025`
- **Config:** `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`
- **Interface:** `IEmailService` (`src/packages/core/src/integrations/email-service.interface.ts`)

---

## Databases / Data Stores

### PostgreSQL 16
- **Status:** Active, production-grade
- **Image:** `postgres:16-alpine`
- **Container:** `ironloot-db` (port 5432)
- **ORM:** Prisma 5.8
- **Config:** `DATABASE_URL` (Prisma), `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Init script:** `src/api/scripts/init-db.sql` (mounted at startup)
- **Memory limit:** 512 MB

### Redis 7
- **Status:** Active — used for rate limiting, distributed locks, BullMQ queues
- **Image:** `redis:7-alpine`
- **Container:** `ironloot-redis` (port 6379)
- **Persistence:** `--appendonly yes`
- **Config:** `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` (optional: `REDIS_PASSWORD`)
- **Memory limit:** 256 MB
- **Uses:**
  - `ThrottlerModule` (rate limiting — storage backend TBD, see TD-002)
  - `DistributedLockService` (auction close cron)
  - `BullModule` (BullMQ async job queues — PT-038)

---

## Authentication

### TOTP (2FA)
- **Status:** Implemented (optional user feature; optional admin feature)
- **SDK:** `otplib: ^12.0.1` (`src/api/package.json:63`)
- **QR Code:** `qrcode: ^1.5.4` (`src/api/package.json:64`)
- **User 2FA:** Stored in `users.two_factor_secret`; enabled via `/auth/2fa/enable`
- **Admin 2FA:** Controlled by `ADMIN_TOTP_SECRET` env var

### Bcrypt
- **Status:** Active
- **SDK:** `bcrypt: ^5.1.1` (`src/api/package.json:44`)
- **Config:** `BCRYPT_SALT_ROUNDS` (default 12)

### JWT
- **Status:** Active
- **SDK:** `@nestjs/jwt: ^10.2.0`, `passport-jwt: ^4.0.1`
- **Config:** `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`

---

## Queue / Background Jobs

### BullMQ
- **Status:** Configured (PT-038)
- **SDK:** `bullmq: ^5.79.0`, `@nestjs/bullmq: ^11.0.4`
- **Backend:** Redis (shared connection)
- **Config:** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **Queue names/processors:** Not inventoried (see ND-006 in Technical Debt)

---

## File Storage

### Local Storage
- **Status:** Active (dev)
- **Provider:** Local filesystem (`uploads/` directory)
- **Interface:** `IStorageService` (`src/packages/core/src/integrations/storage-service.interface.ts`)
- **Served at:** `/uploads` (via `ServeStaticModule`)
- **Production:** Cloud storage implementation expected (S3-compatible); not confirmed

---

## CFDI (Mexican Tax Invoicing)

### PAC Provider (stub)
- **Status:** STUB — no real PAC integration
- **Interface:** `ICfdiPacProvider` (`src/packages/core/src/integrations/cfdi-pac-provider.interface.ts`)
- **Schema:** `cfdi_records` table exists and is fully defined
- **Risk:** Fiscal invoicing non-functional (see TD-001 in Technical Debt)

---

## Nginx (Reverse Proxy)

- **Status:** Active
- **Image:** Custom build (`src/nginx/Dockerfile`)
- **Config:** `src/nginx/nginx.conf`
- **Responsibilities:** Subdomain routing, WebSocket proxy (`Upgrade` headers), traffic cutover (`ironloot.local` redirects for PT-025)

---

## Development Tools

### Mailhog
- **Status:** Dev only
- **Purpose:** Local email capture (no real emails sent in dev)
- **UI:** `http://localhost:8025`
- **SMTP:** `localhost:1025`

### pgAdmin
- **Status:** Optional (Docker profile: `tools`)
- **Image:** `dpage/pgadmin4:latest`
- **Port:** 5050 (configurable)
- **Config:** `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`

### Prisma Studio
- **Status:** Dev only
- **Command:** `npm run db:studio` (in `src/api/`)
- **Purpose:** Visual DB browser
