# E — Graphify Architecture & Infrastructure Analysis

Sources: `graphify-out/GRAPH_REPORT.md`, `graphify-out/.graphify_analysis.json`, `graphify-out/graph.json`,
`docker-compose.yml`, `.env.example`, `src/api/.env.example`, `src/admin/.env.example`, `src/nginx/nginx.conf`,
`package.json` (root + per-app), `.github/workflows/ci.yml`, `.husky/pre-commit`, `CHANGELOG.md`.

Graphify snapshot metadata: `graphify-out/graph.json` → `built_at_commit: 5c16af46ddbb0961d3251470a6834188acfadaf1` (graph is a point-in-time snapshot, generated 2026-06-23 per `graphify-out/GRAPH_REPORT.md:1`).

---

## 1. GRAPHIFY ARCHITECTURE

### Counts
- **1307 nodes · 2690 edges · 65 communities (48 shown in report, 17 thin <3 nodes omitted)** — `graphify-out/GRAPH_REPORT.md:7`
- Extraction confidence: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS; 44 INFERRED edges, avg confidence 0.87 — `graphify-out/GRAPH_REPORT.md:8`
- Corpus: 441 files, ~94,749 words — `graphify-out/GRAPH_REPORT.md:4`
- Graph type: **undirected, non-multigraph** — `graphify-out/graph.json` top-level keys `directed: false, multigraph: false`. Graphify's own report/analysis JSON does **not** compute or report dependency cycles (no cycle-detection field exists in `.graphify_analysis.json` or `GRAPH_REPORT.md`); none can be cited because none was found.
- 30 hyperedges (group relationships) recorded in `graphify-out/graph.json` → `graph.hyperedges` and mirrored in `graphify-out/GRAPH_REPORT.md:98-129`.

### Top 10 God Nodes (highest degree)
Source: `graphify-out/.graphify_analysis.json` (`god_nodes`), same list in `graphify-out/GRAPH_REPORT.md:74-84`.

| # | Node | Degree | What it is |
|---|---|---|---|
| 1 | `AdminController` | 80 | `src/admin` — single controller fronting all 18 admin backoffice feature areas (dashboard, KYC, disputes, CFDI, moderation, commissions, queue stats, reconciliation, etc.) |
| 2 | `AdminService` | 72 | `src/admin` — backing service for `AdminController`; same god-object shape |
| 3 | `dependencies` | 46 | `src/api/package.json` — the API's npm `dependencies` block, a structural hub (every dependency edge attaches here) |
| 4 | `devDependencies` | 35 | `src/api/package.json` — API devDependencies block |
| 5 | `compilerOptions` | 31 | `src/api/nest-cli.json`/tsconfig — build-config hub |
| 6 | `Admin Layout (Nunjucks base template)` | 30 | `src/admin/views/layouts/admin.html` — every admin page extends this layout (cross-community bridge, betweenness 0.114 — `graphify-out/GRAPH_REPORT.md:318`) |
| 7 | `UsersController` | 28 | `src/api/src/modules/users` |
| 8 | `AuthController` | 28 | `src/api/src/modules/auth` |
| 9 | `iron-loot-api (NestJS REST API Service)` | 28 | `src/api` package-level concept node |
| 10 | `PaymentsService` | 26 | `src/api/src/modules/payments` |

**Reading**: `AdminController`/`AdminService` (80/72 edges) are by far the most connected nodes in the whole 1307-node graph — more connected than the API's own `AuthController`/`UsersController`. This is Graphify's structural evidence that the admin module is a **god-object**: one controller/service pair absorbing most backoffice responsibilities (KYC, disputes, CFDI, moderation, commissions, reconciliation, queue stats, CMS, SEO) instead of being split across dedicated controllers per admin feature, mirroring the "18 feature modules" claim in `CLAUDE.md` but concentrated behind a thin routing layer.

### Coupling hotspots / cross-community bridges
- `dependencies` (API package.json) — betweenness centrality 0.144, bridges `Auth & Identity (5)` to 7 other communities including `Auction & Bidding`, `Scheduler & Async` — `graphify-out/GRAPH_REPORT.md:316-317`.
- `Admin Layout (Nunjucks base template)` — betweenness 0.114, bridges `Auction & Bidding (6)` to `Payments`, `CFDI & Fiscal`, `Auth & Identity` communities — `graphify-out/GRAPH_REPORT.md:318-319`.
- `Dispute Detail Page` — betweenness 0.108, bridges `Auction & Bidding (2)` to `Auth & Identity (1)` and `Auction & Bidding (6)` — `graphify-out/GRAPH_REPORT.md:320-321`.
- **Surprising cross-app coupling** (flagged by Graphify as unexpected, `graphify-out/.graphify_analysis.json` → `surprising_connections`):
  - `src/admin/views/pages/dispute-detail.html` calls `apiGet()`/`getToken()` defined in `apps/client/src/app.controller.ts` — the **admin** app's dispute-detail page depends on **client** app helper functions, not its own.
  - `src/apps/client/views/pages/seller/auctions.html` shows the same pattern (calling `apps/client/src/app.controller.ts` helpers, which is expected for client, but the cross-listing with admin suggests shared/duplicated client-side helper naming across apps).

### Knowledge gaps (Graphify-reported)
- **350 isolated nodes** (≤1 connection) — `express-session`, `@types/express-session`, `href`, `$schema`, `collection`, +345 more — `graphify-out/GRAPH_REPORT.md:309`. These are largely config/package-manifest leaves (tsconfig keys, npm dependency leaves) rather than missing architectural links.
- 17 communities are "thin" (<3 nodes) and omitted from the human-readable report; enumerated in `.graphify_analysis.json` → `communities` (e.g. community 60 = `api_scripts_diagnose_sh` alone, community 64 = `api_security` alone) — `graphify-out/.graphify_analysis.json:722-751`.
- Several communities score very low cohesion (0.05): `Auth & Identity (1)`, `Auction & Bidding (1)`, `Auth & Identity (2)`, `Auction & Bidding (3)/(4)`, `System Config (1)` — Graphify's own suggestion is these may warrant splitting into more focused modules (`graphify-out/GRAPH_REPORT.md:324-329`). Low cohesion in this dataset largely reflects test-file/mock clustering (e.g. Community 0 mixes `mockAuctionsService`, `AuctionsService`, `draftAuction`, `mockLogger` — test doubles graphed alongside production code), not necessarily a real coupling defect.

### Communities — full list with members (per `graphify-out/GRAPH_REPORT.md:132-306` and sizes from `.graphify_analysis.json`)

| # | Label | Size | Sample members |
|---|---|---|---|
| 0 | Auth & Identity (1) | 108 (59 shown) | mockAuctionsService, AuctionsService, draftAuction, mockAuction, mockLogger (test/mock-heavy cluster) |
| 1 | Auction & Bidding (1) | 84 (65 shown) | AuctionStateMachine, SCHEDULER_BLOCKED, TransitionMap, VALID_TRANSITIONS, AuctionStatus, CloseAuctionUseCase |
| 2 | Auth & Identity (2) | 73 (51 shown) | DiagnosticsModule, AdminApiKeyGuard, AdminDualAuthGuard, AdminJwtGuard, metrics/mock services |
| 3 | Auction & Bidding (2) | 71 (38 shown) | API endpoints (auctions POST/PUT, disputes POST, enable-seller, wallet deposit/withdraw), Auction DRAFT guard, Bid Winning State |
| 4 | Auction & Bidding (3) | 70 (34 shown) | AdminModule, AuctionsGateway, AuctionsAdminModule, AuctionsModule, AuditModule, AuthModule |
| 5 | Auth & Identity (3) | 60 (33 shown) | otplib, AuthController, AuthService, mockAuthService/mockTwoFactorAuthService (2FA test cluster) |
| 6 | System Config (1) | 54 (49 shown) | nest-cli.json / tsconfig compilerOptions keys (build config) |
| 7 | Auction & Bidding (4) | 51 (31 shown) | class-validator, EnvironmentVariables, validateEnv(), CreateAuctionDto, date-constraint validators |
| 8 | (unlabeled in report, size 44) | 44 | AdminController + all its endpoint methods (getAllCms, getAllSeo, reconcile, reconcileExport, …) |
| 9 | Payments (1) | 41 (18 shown) | ProcessPaymentDto, PaymentLink, PaymentStatus, PaymentProvider, notification queue producer/worker |
| 10 | Auth & Identity (4) | 33 | devDependencies: eslint, husky, @nestjs/cli, @nestjs/schematics, @types/express-session |
| 11 | Auth & Identity (5) | 32 | dependencies: bullmq, class-transformer, handlebars, helmet, @ironloot/core, mercadopago |
| 12 | Auth & Identity (6) | 7 | AuditController, AdminAuthGuard, CmsController, ConfigurationModule, ModerationModule/Service, SeoController |
| 13 | Auction & Bidding (6) | 28 | Admin CSS/JS, Admin Layout, Admin Sidebar Nav, /api/v1/admin/cms endpoint, Auction Status Machine, Audit Event Types, Chart.js CDN |
| 14 | Auth & Identity (7) | 6 | AuthHelper, TestUser, TestApp, updateData, auctionDto, Request (E2E test helpers) |
| 15 | Auth & Identity (8) | 24 | jest-e2e.json, nest-cli.json, iron-loot-api pkg, bcrypt, ioredis, @nestjs/swagger, @nestjs/throttler, passport-jwt |
| 16 | Tests | 23 | npm scripts: build, db:generate, db:migrate(:deploy), db:push, db:seed, db:studio |
| 17 | Disputes & Refunds | 7 | AuditService, CmsService, RefundsController/Module/Service, SeoService, AdminApiClient |
| 18 | Observability & Audit (1) | 3 | incremental, MetricsService, MetricType |
| 19 | Auth & Identity (9) | 21 | Admin/Base nest-cli.json+tsconfig.json, ironloot-admin pkg, connect-redis, @ironloot/base, csrf-csrf, http-proxy-middleware |
| 20 | @ironloot/core Domain (1) | 21 (7 shown) | CurrencyMismatchError, InsufficientFundsError, Money value object |
| 21 | Payments (2) | 20 | Admin Orders Page, users/profile+settings endpoints, Client Layout, 404/Dashboard/Payments/Profile pages (client app) |
| 22 | Auth & Identity (10) | 19 | Auth endpoints (forgot-password, login, register, verify-email), Auction Detail/List pages (base app), Login/Recovery pages |
| 23 | Auth & Identity (11) | 10 | DepositDto, TransactionDto, TransactionHistoryDto, WalletBalanceDto, WithdrawDto, AuthenticatedRequest |
| 24 | Observability & Audit (2) | 15 | ActorType, AuditEventInput, AuditResult, ERROR_CODE_HTTP_STATUS, ErrorCode, ErrorSeverity |
| 25 | Auth & Identity (12) | 16 | Admin User Detail/Users Page, AuditModule, AuthModule, Base 404 Page, base.css, Base Home Page, base.html layout |
| 27 | Users & Profiles (1) | 16 (3 shown) | KycController, KycModule, KycService |
| 28 | Observability & Audit (3) | 16 (5 shown) | AuditMetadata, EntityMetadata, LogMetadata, AuditPersistFn, RequestLogPersistFn |
| 31 | Auth & Identity (13) | 14 (13 shown) | package.json meta keys: author, description, engines/node/npm, license, lint-staged, *.ts |
| 32 | CFDI & Fiscal (1) | 14 (3 shown) | generate(), CfdiController, CfdiService |
| 34 | Auth & Identity (14) | 13 | API Changelog/README, BFF Pattern concept, JWT Auth, Mailhog, NestJS Framework, @Log/@AuditedAction decorators, Rate Limiting |
| 35 | Auction & Bidding (8) | 12 | Admin /api/v1/admin endpoint, Reconciliation/Refunds/Reports/SEO Config pages, CFDI integration, CSV export, Payment Reconciliation |
| 37 | Auction & Bidding (9) | 10 (3 shown) | LotsController, LotsModule, LotsService |
| 38 | Auth & Identity (15) | 9 (7 shown) | NotFoundException, AUTH_TOKEN_ENDPOINTS, bootstrap(), COOKIE_OPTIONS, cookieParser, PLACEHOLDER_SECRETS, validateStartupConfig() |
| 39 | Health & Diagnostics | 9 (5 shown) | HealthController, HealthModule, DependencyStatus, HealthService, HealthStatus |
| 41 | Payments (3) | 7 | Admin Payments/Platform Config/Settings Page, Payment Providers (MercadoPago/PayPal), Payment Status Lifecycle, SMTP Config, Storage Providers |
| 42 | ReportsController | 7 (3 shown) | ReportsController, ReportsModule, ReportsService |
| 43 | Users & Profiles (3) | 7 (6 shown) | fetchCharts(), initDashboard(), refreshKpis(), renderRevenueChart(), renderUsersChart(), setKpi() — admin dashboard JS |
| 44 | Wallet & Finance | 7 (3 shown) | after1, after2, WalletCalculation |
| 46 | CMS & SEO | 6 (5 shown) | APP_MODULE_PATH, content, controllerPath, modulePath, WEB_VIEWS_DIR — legacy `web/` deprecation test artifacts |
| 47 | Auction & Bidding (10) | 4 | Terms and Conditions Page, Binding Bid Rule, 14-Day Dispute Window, Platform Commission on Sales |
| 48 | CFDI & Fiscal (2) | 4 | CFDI Status Machine, PAC Configuration, CFDI List Page, CFDI Config Page |
| 49 | System Config (3) | 4 | @ironloot/core package, Core tsconfig.json/tsconfig.build.json, tsconfig.base.json |
| 50 | CFDI & Fiscal (3) | 4 | CfdiData, ICfdiPacProvider, StampedCfdi |
| 51 | API Contributing Guide | 3 | API Contributing Guide, ESLint, Prettier |

(Remaining low-numbered/thin communities 26, 29, 30, 33, 36, 40, 45, 52–64 are omitted from the human report as thin (<3 nodes); their raw membership lists are visible in `graphify-out/.graphify_analysis.json` → `communities` if deeper drill-down is needed, e.g. community 52 = `admin_public_js_admin_js`, `js_admin_href`, `js_admin_showtoast`.)

### Hyperedges (group relationships) — selected, full list at `graphify-out/GRAPH_REPORT.md:98-129`
- **IronLoot NestJS Monorepo Services** — admin, api, base, client, core packages [EXTRACTED 1.00]
- **SSR + BFF Pattern** — base + client + http-proxy-middleware + api [INFERRED 0.85]
- **API Authentication Stack** — api + passport-jwt + bcrypt + otplib [EXTRACTED 1.00]
- **API Payment Integrations (MercadoPago + Stripe)** — api + mercadopago_sdk + stripe_sdk [EXTRACTED 1.00] — **note**: Graphify's hyperedge label says "Stripe", but no Stripe SDK or `STRIPE_` env var was found anywhere in `src/api` (see §5); this looks like a stale/mislabeled hyperedge or leftover from an earlier provider set. The actual third provider present in code is **HeyBanco** (`src/api/src/modules/payments/providers/heybanco.provider.ts`), not documented in `CLAUDE.md`'s payments list either.
- **API Async/Queue Stack** — api + bullmq + ioredis + event_emitter + socket.io [EXTRACTED 1.00]
- **Shared Nunjucks Templating** — admin + base + client [EXTRACTED 1.00]
- **Shared Security Headers Pattern** — base + client + api + helmet [EXTRACTED 1.00]
- **SSR CSRF Protection** — base + client + csrf-csrf [EXTRACTED 1.00]

---

## 2. REAL MODULE MAP (Graphify) vs CLAUDE.md's 27 API modules

Directory listing `src/api/src/modules/` (27 entries, confirmed via `ls`):
`admin, auctions, audit, auth, bids, cfdi, cms, commissions, diagnostics, disputes, feature-flags, health, kyc, notifications, orders, payments, ratings, refunds, scheduler, seo, shipments, system-cleanup, system-config, upload, users, wallet, watchlist`

This is an **exact 27/27 match** with the module table in `CLAUDE.md` (Architecture → API Module Structure). No extra or missing module directories.

Graphify's graph structure corroborates the module map but reveals internal shape issues CLAUDE.md's flat table doesn't show:
- **`admin` is disproportionately large in the graph** — `AdminController` (80 edges) + `AdminService` (72 edges) dominate, and Community 8 (44 nodes, unlabeled) is essentially "AdminController and all its endpoint methods" (`getAllCms`, `getAllSeo`, `reconcile`, `reconcileExport`, `updateGlobalRate`, `updateSellerRate`, `logAdminAction`, `requestDisputeEvidence`, `resolveDisputeFavorBuyer`, `resolveDisputeFavorSeller`, …) — one controller fronting CMS, SEO, reconciliation, commissions, dispute resolution, and admin action logging simultaneously (`graphify-out/.graphify_analysis.json` community 8 and community 30 samples).
- **`src/admin` (the separate NestJS Admin app, port 3001)** is a distinct service from the API's `admin` module — Graphify treats them as separate: `ironloot-admin (NestJS Admin Service)` package node vs. `api_src_modules_admin_*` nodes. The admin **app** has its own sub-modules mirroring API concerns: `src/admin/src/modules/configuration`, `moderation`, `reconciliation`, `lots` (per community 12/30/37 samples) — these are admin-app-side controllers, not part of the API's 27-module count, and are not separately enumerated in `CLAUDE.md`.
- **`lots` and `reports` appear as first-class Graphify communities** (`LotsController/Module/Service` — community 37; `ReportsController/Module/Service` — community 42) but are **not** in the API's 27-module list nor in CLAUDE.md's module table — worth checking whether these live inside `src/admin/src/modules/` (admin app) rather than `src/api/src/modules/`. Confirmed: `admin_src_modules_lots_lots_service_ts` (community 37 sample) is prefixed `admin_`, so **Lots and Reports are Admin-app modules**, not API modules — CLAUDE.md's 27-module table is API-only and is accurate for the API; it does not claim to enumerate Admin's internal modules, so this is not a contradiction, just a scope note.
- **`configuration` and `moderation`** likewise appear as Admin-app-only modules (`admin_src_modules_configuration_configuration_controller_ts`, `admin_src_modules_moderation_moderation_controller_ts` — community 12), separate from the API's `system-config` module.

**Conclusion**: the API module map matches CLAUDE.md exactly (27/27). The discrepancy area is that CLAUDE.md doesn't document the Admin app's own internal module list (configuration, moderation, reconciliation, lots, reports, kyc-view, cfdi-view, commissions-view) — those are real per Graphify but out of scope of the "27 API modules" table since they belong to `src/admin`, a separate NestJS service.

---

## 3. DOCKER / DEPLOYMENT

Source: `docker-compose.yml` (all line refs below are to this file).

### Services table

| Service | Image / Build | Ports (host:container) | depends_on | Healthcheck | Volumes | Networks |
|---|---|---|---|---|---|---|
| `nginx` | build `./src/nginx` (Dockerfile) — L11-13 | `80:80` — L15-16 | `api` (healthy), `admin`/`base`/`client` (started) — L17-25 | none defined | none | ironloot-network |
| `admin` | build `./src/admin` (Dockerfile.dev) — L34-36 | `${ADMIN_PORT:-3001}:3001` — L38-39 | `api` (healthy) — L56-58 | `GET /` on :3001, 30s interval/10s timeout/3 retries/60s start — L59-64 | src, views, public, package.json, tsconfig.json, nest-cli.json bind-mounts + anon `/app/node_modules` — L48-55 | ironloot-network |
| `api` | build `./src/api` (Dockerfile.dev) — L77-79 | `${API_PORT:-3000}:3000` — L81-82 | `db` (healthy), `redis` (healthy) — L112-116 | `GET /api/v1/health` on :3000, 30s/10s/3/60s start — L117-122 | src, prisma, test, package.json, tsconfig.json, nest-cli.json + `./src/packages/core:/packages/core` (workspace symlink) + anon node_modules — L101-111 | ironloot-network |
| `db` | `postgres:16-alpine` — L135 | `${DB_PORT:-5432}:5432` — L137-138 | — | `pg_isready -U ... -d ...`, 5s/5s/5 retries — L148-152 | `postgres_data` volume + `init-db.sql` seed script (ro) — L143-145 | ironloot-network |
| `redis` | `redis:7-alpine` — L163 | `${REDIS_PORT:-6379}:6379` — L165-166 | — | `redis-cli ping`, 10s/5s/3/10s start — L172-177 | `redis_data` volume, `--appendonly yes` — L167-171 | ironloot-network |
| `mailhog` | `mailhog/mailhog` — L188 | `1025:1025` (SMTP), `8025:8025` (Web UI) — L190-192 | — | none | none | ironloot-network |
| `pgadmin` | `dpage/pgadmin4:latest` — L205 | `${PGADMIN_PORT:-5050}:80` — L207-208 | `db` — L217-218 | none | `pgadmin_data` volume | ironloot-network; **profile: `tools`** (opt-in only, L219-220) |
| `base` | build `./src/apps/base` (Dockerfile.dev) — L228-230 | `${BASE_PORT:-5174}:5174` — L232-233 | `api` (healthy) — L249-251 | `GET /` on :5174, 30s/10s/3/60s start — L252-257 | src, views, public, package.json, tsconfig.json, nest-cli.json + anon node_modules — L241-248 | ironloot-network |
| `client` | build `./src/apps/client` (Dockerfile.dev) — L271-273 | `${CLIENT_PORT:-5175}:5175` — L275-276 | `api` (healthy) — L293-295 | `GET /` on :5175, 30s/10s/3/60s start — L296-301 | src, views, public, package.json, tsconfig.json, nest-cli.json + anon node_modules — L285-292 | ironloot-network |

### Resource limits
All app/DB services declare `deploy.resources.limits.memory` (L67-70, 125-128, 153-156, 178-181, 195-198, 260-263, 304-307): `api` 1G, all others (admin/db/redis/mailhog/base/client) 512M or 256M (redis/mailhog: 256M).

### Networks / Volumes
- Single bridge network `ironloot-network` (L310-312) shared by all services.
- Named volumes: `postgres_data`→`ironloot_postgres_data`, `redis_data`→`ironloot_redis_data`, `pgadmin_data`→`ironloot_pgadmin_data` (L314-321).

### Subdomain routing (`src/nginx/nginx.conf`)
- `localhost` and `base.localhost`/`base.ironloot.local` → `base:5174` (proxy, WS upgrade headers, 503 JSON fallback via `@base_unavailable`) — nginx.conf L9-25, 60-84.
- `api.localhost`/`api.ironloot.local` → `api:3000` (10M body limit for uploads) — L27-42.
- `admin.localhost`/`admin.ironloot.local` → `admin:3001` — L44-58.
- `client.localhost`/`client.ironloot.local` → `client:5175` (WS upgrade, 503 JSON fallback via `@client_unavailable`) — L86-110.
- **`ironloot.local` (bare, no subdomain)** is a traffic-switch/redirect host (PT-025 Fase 7, L112-140): `/auctions*` → 301 to BASE; private routes (`/dashboard|wallet|orders|my-bids|seller|auction/|profile|settings|payments|notifications|disputes|reputation|watchlist`) → 301 to CLIENT; `/auth*` → 301 to BASE; everything else → 301 to BASE.
- A commented-out block (L142-157) shows the same redirect logic was staged for plain `localhost` but is disabled pending go-live confirmation.
- `resolver 127.0.0.11` (Docker's embedded DNS) used for dynamic upstream resolution — L7.

---

## 4. ENVIRONMENT VARIABLES CATALOG

Three `.env.example` files exist: root (`./.env.example`), `src/api/.env.example`, `src/admin/.env.example`. Root and API examples are near-duplicates; API's adds payment-provider and multi-service URL vars. Additional runtime-configurable vars (with DB-seeded defaults, not just process.env) are defined in `src/api/src/modules/system-config/system-config.service.ts` (`SEEDED_KEYS`, L4-177) — these are **DB-overridable at runtime via Admin > Platform Config**, seeded from env on first boot.

### Database
| Var | Purpose | Critical? | Default/example |
|---|---|---|---|
| `DATABASE_URL` | Full Postgres connection string (constructed in docker-compose L85, or set directly) | **Critical** | `postgresql://ironloot:ironloot_dev@db:5432/ironloot_db` |
| `DB_HOST` | Postgres host | Critical (compose) | `db` |
| `DB_PORT` | Postgres port | Critical | `5432` |
| `DB_NAME` | Database name | Critical | `ironloot_db` |
| `DB_USER` | Postgres user | Critical | `ironloot` |
| `DB_PASSWORD` | Postgres password | **Secret** | `ironloot_dev` (dev only) |

### Redis
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `REDIS_URL` | Full Redis connection string; used by `distributed-lock.service.ts:12` | Critical | `redis://redis:6379` |
| `REDIS_HOST` / `REDIS_PORT` | Redis host/port (used by API and Admin) | Critical | `redis` / `6379` |
| `REDIS_PASSWORD` | Redis auth (optional, commented out) | Optional/Secret | unset |

### Auth / JWT / Session
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `JWT_SECRET` | Signs/verifies JWTs (`configuration.ts:39`, `env.validation.ts:58`) | **Critical, Secret** — min 32 chars per CLAUDE.md | `change_this_to_a_secure_random_string_in_production_min_32_chars` |
| `JWT_ACCESS_EXPIRY` | Access token TTL | Important | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL | Important | `7d` |
| `JWT_EXPIRATION` / `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRATION` | Alternate/legacy names accepted by `env.validation.ts:62-78` and `configuration.ts:42-46` (multiple aliases resolved with fallback chains) | Compat | — |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost | Important | `12` |
| `SESSION_SECRET` | Cookie/session signing (`configuration.ts:47`) | **Secret** | `another_secure_random_string_here` |
| `ADMIN_SESSION_SECRET` | Admin app session cookie signing (min 32 chars in prod) | **Secret** | `admin-dev-secret-change-me` / `change-me-admin-session-secret-min-32-chars` |
| `ADMIN_SESSION_TTL_MS` | Admin session TTL | Minor | `28800000` (8h) |
| `ADMIN_API_KEY` | Shared secret between Admin app and API's `AdminAuthGuard`/`AdminApiKeyGuard` | **Critical, Secret** | `dev-admin-key` / `change-me-admin-api-key` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin app basic-auth-style login (docker-compose L45-46) | Secret | `admin` / `admin` |
| `COOKIE_DOMAIN` | Cross-subdomain SSO cookie scope; must use a real dotted domain (`.localhost` rejected by Chrome per RFC 6265, `.env.example:72-73`) | Important | `.ironloot.local` |
| `COOKIE_SAMESITE` | Cookie SameSite policy | Important | `Lax` |
| `COOKIE_SECURE` | HTTPS-only cookie flag | **Critical in prod** (must be `true`) | `false` |
| `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX` | Global throttling window/count (`configuration.ts:52-53`) | Security | `60` / `100` (root) or `200` (API's own example — inconsistent between the two `.env.example` files) |

### Payments (PayPal / Mercado Pago / HeyBanco)
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | MP Checkout Pro auth (`mercadopago.provider.ts:18,24`) | **Critical, Secret** | `YOUR_MP_ACCESS_TOKEN` |
| `MERCADO_PAGO_WEBHOOK_SECRET` | HMAC validation of MP webhooks (`mercadopago.provider.ts:137`) | **Critical, Secret** | `YOUR_MP_WEBHOOK_SECRET` |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | PayPal API auth (`paypal.provider.ts:17`) | **Critical, Secret** | empty |
| `PAYPAL_BUSINESS_EMAIL` | PayPal WPS merchant email (`paypal.provider.ts:30`) | Important | `merchant@example.com` |
| `PAYPAL_MODE` | `sandbox`/`live` (`paypal.provider.ts:31,82`) | Important | `sandbox` |
| `HEY_BANCO_API_URL` / `HEY_BANCO_CLIENT_ID` / `HEY_BANCO_CLIENT_SECRET` / `HEY_BANCO_WEBHOOK_SECRET` | HeyBanco payment provider (`heybanco.provider.ts:23-26`) — **undocumented in CLAUDE.md and absent from all three `.env.example` files** (not a discovery gap: values simply aren't in the example templates) | **Critical, Secret** if enabled | not in any `.env.example` |
| `API_BASE_URL` | Base API URL used to build payment return/webhook URLs (`paypal.provider.ts:39`, `heybanco.provider.ts:69`) | Important | `http://localhost:3000` |

### Business-rule tuning (env-seeded, DB-overridable via `system-config.service.ts`)
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `AUCTION_SOFT_CLOSE_WINDOW_SEC` | Seconds an auction extends on a late bid (`configuration.ts:65`, seeded `system-config.service.ts:14-20`) | Business-critical | `120` |
| `PAYMENT_EXPIRATION_HOURS` | Hours before an unpaid order expires (`configuration.ts:68`) | Business-critical | `72` |
| `DISPUTE_WINDOW_DAYS` | Post-delivery dispute window (`configuration.ts:71`) | Business-critical | `14` |
| `REQUIRE_AUCTION_MODERATION` | Gate: admin approval required before publishing (`system-config.service.ts:21-28`) | Business-critical | `false` |
| `AUCTION_MIN_INCREMENT_AMOUNT` | Minimum bid increment, MXN (`system-config.service.ts:29-36`) | Business-critical | `10` |
| `AUCTION_MIN_DURATION_HOURS` / `AUCTION_MAX_DURATION_HOURS` | Auction duration bounds (`system-config.service.ts:37-52`) | Business-critical | `1` / `720` |
| `REQUIRE_EMAIL_VERIFICATION` | Gate: verified email required to activate account (`system-config.service.ts:54-61`) | Business-critical | `true` |
| `REQUIRE_KYC_FOR_SELLERS` | Gate: approved KYC required to sell (`system-config.service.ts:62-69`) | Business-critical | `true` |

### Email / SMTP
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASSWORD` / `MAIL_FROM` | Nodemailer transport config, wired via `ConfigService` in `notifications.module.ts:19-33`; only set in `docker-compose.yml` env block (L91-95), **not present in any `.env.example`** | Important | `mailhog:1025`, user/pass `test`, from `"Iron Loot <noreply@ironloot.com>"` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | Parallel/duplicate SMTP config set, DB-seeded via `system-config.service.ts:71-110` (category `smtp`) — **two independent SMTP config paths exist (`MAIL_*` used directly by NotificationsModule vs `SMTP_*` seeded into SystemConfig)**, worth flagging as a possible config duplication/drift risk | Important, `SMTP_PASSWORD` is Secret | `localhost:1025`, from `noreply@ironloot.com` |

### Storage / File Upload
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `STORAGE_PROVIDER` | `LOCAL`\|`S3`\|`MINIO` (`system-config.service.ts:113-118`) | Important | `LOCAL` |
| `STORAGE_BUCKET` / `STORAGE_REGION` | Bucket name/region for S3/MinIO | Important if not LOCAL | empty |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Cloud storage credentials — flagged `isSecret: true` | **Secret** | empty |

### CFDI (Mexican fiscal invoicing)
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `CFDI_RFC_EMISOR` | Issuer's tax ID (`system-config.service.ts:153-160`) | Important for CFDI feature | empty |
| `CFDI_PAC_URL` | PAC (certification authority) stamping endpoint | Important | empty |
| `CFDI_PAC_API_KEY` | PAC API key — flagged `isSecret: true` | **Secret** | empty |

### Multi-service URLs / CORS
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `BASE_URL` | Public BASE URL, used by EmailService for auth links | Important | `http://localhost:5174` (root) |
| `CLIENT_URL` | CLIENT app URL, used by payment providers to build redirect URLs | Important | `http://client.localhost` |
| `ADMIN_URL` | Admin app URL | Minor | `http://admin.localhost` |
| `API_URL` | API URL as seen by other services | Important | `http://api.localhost` / `http://api:3000` (compose) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist; **empty in production fails startup** (`.env.example:64-65`) | **Critical in prod** | dev list of localhost/subdomain origins |
| `BASE_ENABLED` / `CLIENT_ENABLED` / `ADMIN_ENABLED` | Feature flags gating multi-service routing (API's `.env.example:123-125`) | Minor | `true` |

### Logging / Diagnostics
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `LOG_LEVEL` | debug/info/warn/error (`configuration.ts:58`) | Operational | `debug` (dev) / `info` (admin) |
| `TRACE_ENABLED` | trace_id propagation toggle (`configuration.ts:59`) | Operational | `true` |

### pgAdmin (dev tool only)
| Var | Purpose | Critical? | Default |
|---|---|---|---|
| `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` / `PGADMIN_PORT` | pgAdmin container login/port (opt-in `tools` profile) | Dev-only | `admin@ironloot.local` / `admin` / `5050` |

---

## 5. INTEGRATIONS

| Integration | Where configured | Notes |
|---|---|---|
| **PayPal (WPS)** | `src/api/src/modules/payments/providers/paypal.provider.ts` | Env: `PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_BUSINESS_EMAIL`, `PAYPAL_MODE`. CHANGELOG `[0.5.1]` confirms "Full integration of PayPal (WPS)". |
| **Mercado Pago (Checkout Pro)** | `src/api/src/modules/payments/providers/mercadopago.provider.ts` | Env: `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET` (HMAC-validated per `CLAUDE.md`). |
| **HeyBanco** | `src/api/src/modules/payments/providers/heybanco.provider.ts` | Third payment provider present in code but **not mentioned in CLAUDE.md's payments description** ("PayPal + Mercado Pago" only) — a documentation gap. Env: `HEY_BANCO_API_URL/CLIENT_ID/CLIENT_SECRET/WEBHOOK_SECRET`, none of which appear in any `.env.example`. |
| **Email (dev: Mailhog, prod: SMTP)** | `src/api/src/modules/notifications/notifications.module.ts:19-35` (nodemailer transport via `MAIL_*`); Mailhog container in `docker-compose.yml:187-199` (SMTP :1025, Web UI :8025) | Two config paths exist for SMTP settings (`MAIL_*` directly consumed vs `SMTP_*` seeded in SystemConfig) — see §4 note. |
| **Carrier / shipment tracking** | `src/api/src/modules/shipments/` (`shipments.service.ts`, `shipments.controller.ts:37`, `dto/create-shipment.dto.ts:24-30`) | **No external carrier API integration found** — `carrier` and `trackingNumber` are plain manually-entered DTO fields (seller/admin types them in); CLAUDE.md's "Carrier tracking integration" description overstates what's implemented — it is data capture, not a live tracking integration. |
| **CFDI / PAC (Mexican fiscal invoice)** | `src/api/src/modules/cfdi/` (`cfdi.service.ts`, `cfdi.controller.ts`); interface contract at `src/packages/core/src/integrations/cfdi-pac-provider.interface.ts` (`ICfdiPacProvider`, `CfdiData`, `StampedCfdi`) | Config via `CFDI_RFC_EMISOR`, `CFDI_PAC_URL`, `CFDI_PAC_API_KEY` (system-config). CLAUDE.md itself calls this a "stub" — consistent with the interface-only shape found (`ICfdiPacProvider` defined in core but no concrete PAC provider implementation located under `src/api/src/modules/cfdi`). |
| **KYC** | `src/api/src/modules/kyc/` (`kyc.service.ts`, `kyc.controller.ts`) | No external KYC provider env vars found (no `process.env.*` in the module) — gate driven by `REQUIRE_KYC_FOR_SELLERS` system-config flag and admin manual review, not a third-party identity-verification API. |
| **Storage (uploads)** | `src/api/src/modules/upload/`; interface at `src/packages/core/src/integrations/storage-service.interface.ts` (`IStorageService`) | Provider selectable via `STORAGE_PROVIDER` (`LOCAL`\|`S3`\|`MINIO`) + `STORAGE_BUCKET/REGION/ACCESS_KEY/SECRET_KEY`. |
| **Redis** | `docker-compose.yml` (service `redis`, `redis:7-alpine`), consumed by API (`distributed-lock.service.ts`), Admin (session store per `src/admin/.env.example:22-29`, with in-memory fallback if Redis is down) | Also backs BullMQ queues (notifications, webhook retries — Community 9 in Graphify). |
| **Socket.io (real-time)** | `src/api/src/modules/notifications/events.gateway.ts`, `src/api/src/modules/auctions/auctions.gateway.ts` | Both gate CORS via `process.env.ALLOWED_ORIGINS`. |

---

## 6. NPM SCRIPTS REFERENCE PER APP

### Root (`package.json`)
```json
{ "name": "ironloot-monorepo", "version": "1.0.0", "private": true,
  "workspaces": ["src/apps/*", "src/packages/*"] }
```
No root-level scripts defined — workspaces cover only `apps/*` and `packages/*` (not `src/api` or `src/admin`, which are standalone, not npm workspaces).

### API (`src/api/package.json`, name `iron-loot-api`, v0.5.1)
`build`, `format`, `start`, `start:dev` (watch), `start:debug`, `start:prod`, `lint` (`eslint --fix`), `lint:check`, `test` (jest), `test:watch`, `test:cov`, `test:debug`, `test:e2e` (`jest --config ./test/jest-e2e.json`), `typecheck` (`tsc --noEmit`), `prepare` (`cd ../.. && husky install`), `db:migrate`, `db:migrate:deploy`, `db:generate`, `db:push`, `db:studio`, `db:seed`, `setup` (copy `.env.example`→`.env` if absent, `npm install`, `prisma generate`).

### BASE (`src/apps/base/package.json`, name `@ironloot/base`, v0.1.0)
`build`, `start`, `start:dev` (watch), `start:prod`, `lint` (`eslint src --ext .ts`). No test script defined.

### CLIENT (`src/apps/client/package.json`, name `@ironloot/client`, v0.1.0)
`build`, `start`, `start:dev` (**note**: runs `nest build && nest start --watch`, unlike BASE which only does `nest start --watch` — an inconsistency between the two sibling SSR apps), `start:prod`, `lint`. No test script defined.

### ADMIN (`src/admin/package.json`, name `ironloot-admin`, v1.0.0)
`build`, `start` (`node dist/main` — no separate `start:prod`), `start:dev` (watch), `lint`. No test or db scripts.

### CORE (`src/packages/core/package.json`, name `@ironloot/core`, v0.1.0)
`build` (`tsc -p tsconfig.build.json`), `build:watch`, `test` (jest — CLAUDE.md states 12 suites/157 tests, no NestJS/DB dependency), `test:watch`, `test:cov`.

---

## 7. CI/CD & GIT HOOKS

### CI (`.github/workflows/ci.yml`)
Single workflow `CI`, triggers on push/PR to `dev`, `qa`, `prep`, `prod` branches (L3-7). Node 20 (L10). Jobs, sequential via `needs`:
1. **lint** — `npm install` → `npm run lint:check` → `npm run typecheck` (L16-37).
2. **test-unit** (needs `lint`) — `npm run test -- --coverage --passWithNoTests`, uploads coverage to Codecov (`fail_ci_if_error: false`) (L42-68).
3. **test-integration** (needs `lint`) — spins up ephemeral `postgres:16-alpine` + `redis:7-alpine` service containers (L78-101), runs `npm run test:e2e -- --passWithNoTests` against them (L104-121).
4. **build** (needs `test-unit`, `test-integration`) — `npm run build`, uploads `dist/` artifact, 7-day retention (L126-152).
5. **docker** (needs `build`, **only runs on `prod`/`prep` branch refs**, L157-161) — Buildx build of root `./Dockerfile` (not pushed, `push: false`, GHA cache) (L163-178).

Caveat: all jobs run `npm install`/`npm run <script>` at the **repo root**, but the root `package.json` (§6) defines no `lint`/`typecheck`/`test`/`test:e2e`/`build` scripts of its own — these presumably resolve through npm workspaces to `src/apps/*`/`src/packages/*` only, meaning **`src/api` and `src/admin` scripts are not directly reachable from the root CI scripts as written** (they aren't declared workspaces). This is a plausible CI/tooling gap worth validating against actual CI run logs — not confirmed further here since only static config was reviewed.

### Git hooks (`.husky/`)
- `.husky/pre-commit` (L1-13): sourced via `husky.sh`, then `cd src/api` and runs `npx lint-staged` followed by `npm run typecheck` — **hook only lints/typechecks the API**; BASE/CLIENT/Admin/Core changes are not covered by this pre-commit hook.
- `lint-staged` config lives in `src/api/package.json:137-142`: for staged `*.ts` files, runs `eslint --fix` then `prettier --write`.
- `src/api/package.json` `prepare` script (`cd ../.. && husky install`) installs the hook on `npm install` at the repo root context.

### Versioning / CHANGELOG
`CHANGELOG.md` (Keep a Changelog + SemVer format) documents API history from `[0.1.0]` (2025-12-25, initial release: Auth/Users/Auctions/Bids + Prisma + Redis) through `[0.5.1]` (2026-01-12: full PayPal + Mercado Pago integration, HMAC webhook validation, MXN currency standardization, removal of payment mocks). Root monorepo is versioned separately at `1.0.0` (`package.json:3`); `src/admin` is also at `1.0.0`; `src/api`/BASE/CLIENT/CORE remain at pre-1.0 versions (`0.5.1`/`0.1.0`/`0.1.0`/`0.1.0`) — version numbers are **not unified across the monorepo**.
