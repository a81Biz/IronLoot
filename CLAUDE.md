# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IronLoot is a full-stack **auction platform** (v1.0.0) with real-time bidding, payment processing (Mercado Pago, PayPal, HeyBanco), and seller/buyer dispute resolution. It is a multi-service monorepo. **All application code lives under `src/`**; documentation lives at `docs/`. The services are four NestJS apps and one shared library:

- **`src/api/`** — REST API + WebSockets backend (port 3000)
- **`src/apps/base/`** — PUBLIC site: home, catalog, auth pages (port 5174, `base.ironloot.local`)
- **`src/apps/client/`** — PRIVATE portal: dashboard, wallet, orders, seller flows (port 5175, `client.ironloot.local`)
- **`src/admin/`** — Admin dashboard with 18 feature modules (port 3001, `admin.ironloot.local`)
- **`src/packages/core/`** — Shared domain library: state machines, validators, value objects (no HTTP, no DB)
- **`src/nginx/`** — Reverse proxy / subdomain routing

> The legacy `web/` SSR frontend (v0.x) was **removed** in the src/ restructure (2026-06-19); traffic had already migrated to BASE/CLIENT. See git history for reference.

## Development Commands

### API (`cd src/api`)

```bash
npm run start:dev        # Dev server with watch
npm run build            # Compile TypeScript
npm run lint             # ESLint with auto-fix
npm run lint:check       # ESLint check only
npm run typecheck        # TypeScript type check
npm test                 # Unit tests (Jest)
npm run test:watch       # Watch mode tests
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests (requires running DB)
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Regenerate Prisma client
npm run db:studio        # Open Prisma Studio UI
npm run db:seed          # Seed the database
```

**Checkpoints de auditoría** (PTSA). Los tres primeros corren solos en CI; los otros dos son
métricas de delta sync porque necesitan una base **con historia** — en CI nace vacía y devolverían
`SIN_DATOS` siempre, que alguien acabaría leyendo como verde (la lección de PT-122):

```bash
npm run audit:schema         # D2 — las migraciones reproducen schema.prisma. CI: job schema-drift
npm run audit:check          # D2 — vulnerabilidades vs security-baseline.json. CI: security-audit
npm run audit:observability  # D3 — catch mudos y traza completa.  CI: job observabilidad
npm run audit:domain         # D1.N1 — 14 reglas de dominio sobre SALIDA REAL. Delta sync
npm run audit:reliability    # D5 — Success/Retry/Failure de los ciclos de pago. Delta sync
```

Los tres de CI van **sin `needs`**: un job roto no debe poder ocultarlos. Es lo que le pasó a
`build` y `docker`, que no se ejecutaron nunca porque colgaban de un job que no podía terminar
(H-015).

**El workflow dispara en `master` y admite ejecución manual** (`workflow_dispatch`). Hasta PT-136
disparaba en `dev/qa/prep/prod` — cuatro ramas que **nunca han existido** en este repositorio— y el
resultado fue que los **ocho** jobs no se ejecutaron **ni una sola vez**: `actions/runs` devolvía
`total_count: 0`. El YAML era válido y GitHub listaba el workflow como `active`, así que nadie vio un
error nunca. Los tres checkpoints de arriba llevaban semanas declarados «vigilados en CI» sin haber
corrido solos jamás. **Declarar en el disparador una rama que no existe deja el pipeline entero sin
ejecutarse y sin protestar** — el mismo principio que H-014, H-015 y H-017: *un mecanismo que no se
ejecuta no avisa de nada.* Lo vigila `ramas-del-disparador-existen.spec.ts`.

Los ocho jobs: `lint` · `security-audit` · `schema-drift` · `test-unit` · `test-integration` ·
`observabilidad` · `build` · `docker`.

**QA por navegador** (Playwright, `tests/qa-browser-suite/`):

```bash
bash run-all.sh                    # suite completa: resetea la BD y ejerce los flujos reales
node 90-validacion-hallazgos.js    # validación dirigida de hallazgos PTSA corregidos
```

`run-all.sh` **trunca la base de datos**. Hacer copia antes si contiene salida real que sostenga
una validación PTSA.

**Y ninguna prueba borra sin filtro** (RULE-23). `orders-flow.e2e-spec.ts` truncaba once tablas en su
`beforeAll`, y como Jest corre las suites en paralelo, borraba los datos de las demás mientras las
demás los usaban: de ahí `404` en suites que no tenían nada roto, y fallos que **cambiaban de sitio
entre corridas**. Peor aún, `TestApp` **imponía** `DATABASE_URL` a `ironloot_db` —la base de
desarrollo, la que sostiene las validaciones PTSA— pisando lo que dijera el entorno (PT-143). Las dos
cosas están corregidas y hay guarda, pero conviene saberlo antes de escribir una limpieza nueva.

**La suite e2e completa no cabe en el contenedor**: sus workers mueren por `SIGKILL` contra el límite
de 1 GB. Se verifica en CI.

### BASE — Sitio público (`cd src/apps/base`)

```bash
npm run start:dev        # Dev server port 5174
npm run build            # Compile TypeScript
npm run lint             # ESLint with auto-fix
```

### CLIENT — Portal privado (`cd src/apps/client`)

```bash
npm run start:dev        # Dev server port 5175
npm run build            # Compile TypeScript
npm run lint             # ESLint with auto-fix
```

### CORE — Librería compartida (`cd src/packages/core`)

```bash
npm run build            # Compile to dist/
npm test                 # 8 suites / 134 tests (no NestJS, no DB)
```

### Running a Single Test

```bash
cd src/api
npx jest --testPathPattern="payments.service" --no-coverage
npx jest --testPathPattern="src/modules/auth" --no-coverage
```

### Full Stack via Docker

```bash
docker-compose up -d
# BASE:        http://base.localhost     (port 5174)
# CLIENT:      http://client.localhost   (port 5175)
# API Swagger: http://localhost:3000/docs
# ADMIN:       http://admin.localhost    (port 3001)
# Mailhog:     http://localhost:8025
```

### Activar dominios ironloot.local

Para probar la conmutación de tráfico, añadir al archivo hosts del SO:

```
127.0.0.1 ironloot.local
127.0.0.1 base.ironloot.local
127.0.0.1 client.ironloot.local
127.0.0.1 admin.ironloot.local
127.0.0.1 api.ironloot.local
```

### Hybrid Local Dev (preferred for active development)

```bash
docker-compose up -d db redis mailhog   # Infrastructure only

# API
cd src/api && npm install && npm run db:generate && npm run db:migrate && npm run start:dev

# BASE / CLIENT (separate terminals)
cd src/apps/base && npm install && npm run start:dev
cd src/apps/client && npm install && npm run start:dev
```

## Architecture

### Request Flow

```
Browser → BASE / CLIENT (NestJS SSR, :5174 / :5175)
            ↓ HTTP proxy (injects Authorization header from HttpOnly cookie)
         API (NestJS, :3000)
            ↓
         PostgreSQL + Redis
```

The SSR sites use the **BFF (Backend for Frontend)** pattern: JWT tokens are stored in HttpOnly cookies, and each site proxies API calls by extracting the token server-side. Client-side JavaScript never has direct access to tokens.

### API Module Structure

The API is organized in `src/api/src/modules/` with 27 feature modules:

| Module | Responsibility |
|---|---|
| `auth` | JWT auth, 2FA (TOTP), password reset, email verification |
| `users` | Profiles, seller onboarding, settings |
| `auctions` | Lifecycle: Draft → Published → Active → Soft-Close → Closed |
| `bids` | Bid placement with wallet fund locking, WebSocket broadcasts |
| `wallet` | Balance, held funds (locked for active bids), ledger |
| `payments` | PayPal & Mercado Pago. **Ciclo de pago en tres fases** (solicitud → confirmación → persistencia) con invariante de usuario/importe/moneda; **vía garantizada** por consulta periódica; **registro de pasarelas** por inyección. Mercado Pago notifica en dos formatos (Webhooks e IPN) y **la validación difiere por formato**. **Traza completa** de cada transacción en `payment_cycle_events`: por dónde pasó y qué datos se enviaron, con credenciales redactadas y marcadas |
| `orders` | Post-auction order creation and management |
| `shipments` | Carrier tracking integration |
| `disputes` | 14-day post-delivery conflict resolution window |
| `ratings` | Buyer/seller reputation after order completion |
| `notifications` | In-app + email notifications |
| `scheduler` | Cron jobs for auction state transitions |
| `audit` | Immutable event log (AuditEvent, ErrorEvent, RequestLog) |
| `health` | `/api/v1/health` and `/api/v1/health/detailed` endpoints |
| `diagnostics` | Dev-only dashboard: logs, metrics, errors |
| `admin` | Admin-only operations and management |
| `cfdi` | Mexican fiscal invoice integration (CFDI/PAC — stub) |
| `cms` | Content management |
| `commissions` | Platform fee and commission tracking |
| `feature-flags` | Feature toggle management |
| `kyc` | Know-Your-Customer identity verification |
| `refunds` | Refund workflow management |
| `seo` | SEO metadata and sitemap |
| `system-cleanup` | Scheduled data cleanup jobs |
| `system-config` | Runtime configuration management |
| `upload` | File upload handling |
| `watchlist` | Auction watchlist for buyers |

### Auction Lifecycle

`Draft → Published → Active → (Soft-Close window: 120s) → Closed`

The `scheduler` module runs cron jobs to advance auction states automatically. During the soft-close window, any new bid extends the auction by `AUCTION_SOFT_CLOSE_WINDOW_SEC`.

### Bid & Wallet Flow

1. User places bid → `BidsService` locks funds: `wallet.held_funds += bid.amount`
2. If outbid → previous held funds released back to `wallet.balance`
3. On auction close → winner's held funds converted to payment, others released
4. Ledger records every balance change immutably

**El monedero se crea de forma perezosa, y esa creación es atómica** (PT-142). Los tres caminos que
lo crean —consultarlo, acreditar un depósito y abonar una venta— pasan por `asegurarMonedero()`, que
usa `createMany({ skipDuplicates })`. Antes eran `findUnique` + `create`, y dos peticiones
simultáneas dejaban una con `P2002`: un usuario sin monedero cuya notificación de depósito llegara
mientras cargaba su panel podía ver fallar **la acreditación**. Dos cosas que hubo que medir y que no
son evidentes: **`upsert` dentro de una transacción interactiva no es atómico** —Prisma hace `SELECT`
y luego `INSERT`— y fuera tampoco lo garantiza. → **RULE-22**

**Y todo camino que mueve saldo lee bloqueando la fila** (`SELECT ... FOR UPDATE`, PT-146). Los siete
—depósito, retiro, retención, liberación, reintegro, liquidación y captura— hacían
*leer-modificar-escribir* sin bloqueo: seis acreditaciones simultáneas dejaban el saldo en **100** en
vez de 600, **con los seis asientos escritos** y ninguno cuadrando. La contabilidad se contradecía a
sí misma y nadie recibía un error. `Payment.reference @unique` no protege de esto: impide acreditar
**el mismo** pago dos veces, no dos pagos distintos a la vez.

`increment` no habría servido —dejaría el saldo bien y el **asiento** mal, porque `balanceBefore` sale
de la lectura previa—. Y cuando la operación toca dos monederos (`captureHeldFunds`), se bloquean en
**orden fijo**: un interbloqueo no aparece en desarrollo, aparece en producción como peticiones
colgadas. → **RULE-24**

### Frontend Structure (`src/apps/base`, `src/apps/client`)

Each SSR site follows the same convention:

- **Controllers** in `src/apps/<site>/src/` handle page routing, call the API, and render Nunjucks templates
- **Templates** in `src/apps/<site>/views/` — `layouts/` holds the root layout
- **Static assets** in `src/apps/<site>/public/` — plain CSS and vanilla JavaScript (no frontend framework)
- Client JS in `src/apps/<site>/public/js/pages/` follows a per-page convention (e.g., `pages-wallet-deposit.js`)

## Key Technical Decisions

- **ORM**: Prisma — schema at `src/api/prisma/schema.prisma`; always run `npm run db:generate` after schema changes
- **Real-time**: Socket.io on the API; the SSR sites connect via vanilla JS
- **Security**: Helmet + strict CSP on all SSR sites (BASE/CLIENT/ADMIN); CSRF mitigated via JWT Bearer + `SameSite` cookies (ADMIN session uses `SameSite=Lax`). Configured in each site's `src/*/src/main.ts`. (Double-submit CSRF tokens are not used — see `docs-v2/transversal/Registro-Maestro-de-ADR.md`.)
- **La CSP no lleva `'unsafe-inline'` en ninguna directiva**: fuera de `script-src` por PT-096, de
  `style-src` por PT-105. Consecuencia práctica: **un `style=` o un manejador `onclick=` nuevo no
  funcionará y el navegador no dirá nada** — sólo se verá mal. Ese silencio ya escondió 24
  manejadores muertos, incluidos los `confirm()` que debían preguntar antes de una acción
  destructiva del panel. Los estilos van al CSS del sitio y el JS a `public/js/`; para mostrar y
  ocultar, `classList`, **nunca** `style.display = ''` (vaciar devuelve el elemento a lo que diga
  el CSS, que ahora puede ser «oculto»). Lo vigilan `plantillas-sin-js-inline.spec.ts` y
  `estilos-fuera-de-plantillas.spec.ts`, ambas con casos de control.
- **El orden de los `<script>` es un contrato**: si uno usa un global que define otro, el que lo
  define va antes y **ambos llevan `defer`**. Sacar el JS inline de una plantilla sin respetarlo
  dejó la puja en vivo apagada varios días, en silencio, con la suite entera en verde (F-34). Lo
  vigila `orden-de-scripts.spec.ts`.
- **Cerrar una deuda técnica son dos escrituras**: el código y `10-Technical-Debt.md`, y el estado
  nuevo **cita qué leer** para comprobarlo. Sólo la primera la obliga el compilador; el registro
  llegó a mentir dos veces (PT-090, y otra vez tres PT después: F-33). Lo vigila
  `coherencia-deuda-tecnica.spec.ts`.
- **La documentación que cita fichero:línea es verificable, y por eso puede mentir con aval.** El
  TRD declaraba `NestJS ^10.3.0` citando `package.json:36`; esa línea decía `},`. **Las cinco citas
  de su tabla de stack apuntaban a la línea equivocada** — se desplazaron al crecer el fichero y
  nadie las siguió (H-016). Un documento sin citas se lee con desconfianza; uno con citas rotas se
  lee con confianza y es falso. Lo vigila `coherencia-documentacion-codigo.spec.ts`, que comprueba
  **dos cosas por fila**: que la línea citada contenga el paquete que dice, y que la versión
  coincida. Corolario: **lo que no se cita, no se protege.**
- **El esquema se aplica por migración, y si falla el arranque falla.** `db push` no escribe
  `_prisma_migrations`: durante meses las 23 migraciones **no se ejecutaron nunca** y producían un
  esquema distinto —sin la unicidad de `payments.reference`, que es la garantía contra el asiento
  duplicado— (H-014). PT-037 ya lo arregló una vez y volvió en cuatro días, porque la prevención se
  quedó en una nota. Ahora lo vigila `npm run audit:schema` en CI, **sin `needs`**. Editar
  `schema.prisma` exige generar migración; ese atajo es el que produjo el hallazgo.
- **`npm` no se ejecuta en el host: se ejecuta en el contenedor.** Un `npm install` en Windows
  regenera `package-lock.json` con el árbol de **esa** plataforma y se lleva los binarios nativos de
  Linux. El contenedor instala entonces menos de lo que necesita y **no falla al instalar: falla al
  arrancar**, en otra máquina, días después — con el volumen anónimo de `node_modules` tapándolo
  mientras nadie lo recree. Pasó entre PT-126 y PT-135, y costó **cinco contenedores caídos**: con el
  API `unhealthy`, nginx, admin, base y client no arrancan nunca. Era la **tercera** vez (PT-129 en
  `musl`, PT-135 en `gnu`); las dos anteriores se cerraron con un parche en un Dockerfile, y un parche
  no impide la cuarta. Para regenerar un lock: **`npm run lock:api`** (o `lock:admin` / `lock:root`),
  que envuelve `docker compose run` con las tres cosas que nadie adivina — borrar el lock antes (si
  no, npm dice «up to date» y no toca nada), enmascarar `node_modules` (npm deriva el árbol del
  **real**, y el del host es de Windows) y `--ignore-scripts` (husky sin git sale con 127 dejando el
  lock a medio escribir). Lo impide `scripts/solo-en-contenedor.js` como `preinstall`, **sin puerta de
  escape por variable de entorno**; lo caza `lock-declara-plataformas.spec.ts`. Los tres locks (raíz,
  `src/api`, `src/admin`) **se siguen por git**: `.gitignore` ya no los ignora (ADR-048). Excepción
  declarada: `tests/qa-browser-suite/` instala en el host porque Playwright conduce un navegador real,
  y es segura porque su lock tiene **cero** paquetes divididos por plataforma — hay una prueba que
  vigila que siga siendo cero.
- **Toda ruta del API que un SSR invoca tiene que existir en el API.** El CLIENT pedía
  `/api/v1/users/settings`, que no existe: caía en el comodín `@Get(':id')`, el `ParseUUIDPipe`
  rechazaba la cadena y devolvía **400 «uuid inválido»**. La página «Configuración» no cargaba para
  nadie, y el error mandaba a mirar el identificador (H-020). Lo vigila
  `rutas-que-el-client-invoca.spec.ts`, que cubre el SSR **y el JavaScript de navegador** — ahí vive
  la otra mitad del contrato.
- **«No enviado» no es «enviado vacío».** Con `transform: true` en el `ValidationPipe`, a un
  servicio no le llega un objeto plano sino una **instancia con todas las propiedades declaradas**,
  las ausentes con `undefined`. Un `deepMerge` que recorra `Object.keys()` borra las ramas que el
  cliente no mandó: un `PATCH {language}` se llevaba por delante las preferencias de notificación,
  en silencio y con 200 (H-019). Se descartan los `undefined`, **nunca los falsy** — `false` tiene
  que poder aplicarse.
- **Un endpoint sin llamantes se retira, no se pule.** `POST /wallet/deposit` acreditaba dinero a
  partir de un `referenceId` elegido por el cliente y **no lo invocaba nadie**: quedó huérfano
  cuando el ciclo de pago (PT-080/PT-087) sustituyó ese flujo. Corregirle el manejo de errores
  habría sido arreglar una puerta que sobra (ADR-047). Antes de tocar un endpoint, **buscar sus
  llamantes en todo `src/`, incluido el JS de navegador**.
- **Un control que nadie ha visto fallar no es un control.** Toda guarda de este repositorio se
  prueba en los dos sentidos y lleva casos de control. No es celo: el checkpoint D3 delató dos
  `catch` mudos recién escritos, y tres guardas se acusaron a sí mismas leyendo sus propios
  comentarios antes de servir para nada.
- **Rate limiting**: Global 100 req/min; stricter on auth endpoints (5–30 req/min) via `@nestjs/throttler`
- **Currency**: Standardized to MXN globally
- **Payments**: los webhooks validan firma **según el formato**. Mercado Pago emite Webhooks
  (firma HMAC validable) e IPN (firma **no** validable por diseño de MP): en IPN la confirmación
  contra la API de la pasarela es obligatoria y su respuesta es la única fuente de verdad. El
  identificador canónico de un pago —la clave de deduplicación— lo resuelve cada adaptador.
  Ningún pago cobrado queda sin acreditar: si la notificación no llega, la vía garantizada lo
  encuentra por consulta; a las `PAYMENT_EXPIRATION_HOURS` (72) sin resolver, expira.
- **Trazabilidad de pagos**: `PaymentTraceService` es el punto **único** de escritura de la traza,
  y la redacción de credenciales vive dentro — ningún llamante puede saltársela. Nunca lanza: un
  apunte de trazabilidad no puede costarle el depósito al usuario. Consulta:
  `GET /admin/payments/trace/:reference`.
- **Las garantías de un pago son del registro, no de un proveedor (PT-087)**: traza, vía
  garantizada y rechazo con 401 se exigen a **todo adaptador registrado**, y hay una prueba
  (`provider-guarantees.spec`) que lo comprueba para cada uno. `findPayment(ctx)` es **opcional a
  propósito** en el contrato: Mercado Pago busca por *nuestra* referencia, PayPal **debe** ir por
  el id de orden porque su API no ofrece búsqueda por `custom_id`. Un proveedor sin vía
  garantizada lo declara así, en vez de esconderlo tras un `null`.
- **En PayPal Orders v2 aprobar NO mueve el dinero**: una orden `APPROVED` está autorizada pero
  sin cobrar. La vía garantizada de PayPal **captura**, no solo consulta.
- **Un ciclo solo está cerrado cuando el dinero llegó al monedero (PT-087)**: si la acreditación
  falla tras la confirmación, el ciclo **se reabre** para reintento. El asiento contable es
  idempotente por referencia (`Payment.reference` es única) para que ese reintento no lo duplique.
- **URLs públicas: una sola fuente (PT-088)**. `PUBLIC_SCHEME` + `PUBLIC_DOMAIN` en el `.env`
  raíz; `docker-compose` deriva `BASE_URL`, `CLIENT_URL` y `COOKIE_DOMAIN`. Los adaptadores de
  pago **no construyen URLs**: llaman a `depositReturnUrl()`, con una ruta canónica única
  `/wallet/deposit/return` para todas las pasarelas. Nunca escribir un `localhost:<puerto>` en
  una URL que salga del sistema.
- **El dominio de desarrollo es `ironloot.local`, no `localhost`**: los navegadores rechazan
  `Domain=.localhost` (dominio de uso especial) y la sesión dejaría de cruzar de BASE a CLIENT.
  Requiere entradas en el fichero hosts. Si el puerto 80 está ocupado, la salida es
  `NGINX_HTTP_PORT=8081` + `PUBLIC_DOMAIN=ironloot.local:8081`, **conservando los subdominios**.
- **El `status` de la URL de retorno no es fuente de verdad**: lo escribe el navegador. La página
  pregunta a `GET /payments/status/:reference`, que solo responde al dueño y trata un depósito
  ajeno **como inexistente**. Un ciclo abierto se informa `pending`, **jamás** `failed`: efectivo
  y SPEI tardan horas, y decir «falló» provoca un segundo pago.

## Environment Variables

Copy `.env.example` to `.env`. Critical variables:

```
DATABASE_URL          # PostgreSQL connection string
REDIS_URL             # Única fuente para Redis — sin ella el proceso NO arranca, a propósito
JWT_SECRET            # Min 32 chars — must be set for auth to work
SESSION_SECRET        # CSRF / session signing
MERCADO_PAGO_ACCESS_TOKEN
PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET
```

**`REDIS_URL` es el único contrato de Redis** (PT-137). Lo usan las colas, el rate limiting, el
cerrojo distribuido y las sesiones de ADMIN. Antes había **tres formas** conviviendo: dos clientes
leían `REDIS_HOST`/`REDIS_PORT` con reserva `localhost` mientras el compose declaraba sólo la URL,
así que lo que hacía funcionar el sistema era `REDIS_HOST=redis` dentro de `src/api/.env` — **un
fichero que no está en git**.

**La reserva era el problema, no la variable**: un valor por defecto convierte «mal configurado» en
«configurado hacia ninguna parte», y el proceso arranca. En la imagen de producción eso daba *«Nest
application successfully started»* seguido de un 500 sobre `maxRetriesPerRequest`, un mensaje que **no
menciona Redis**. Ninguna variable de conexión lleva valor por defecto; si falta, se aborta
nombrándola. → **RULE-17**

`AUCTION_SOFT_CLOSE_WINDOW_SEC`, `PAYMENT_EXPIRATION_HOURS`, and `DISPUTE_WINDOW_DAYS` control core business rules.

---

# Part 2 — Foundation Protocol: Reverse-Engineering Prerequisite

Foundation Protocol is the **mandatory prerequisite** for the full methodology suite. It reverse-engineers
the repository into verified documentation (`docs/enterprise-documentation/`) so that FDGE, PTSA and FPGE
have architecture, conventions and domain context to operate on instead of assumptions.

## Authority

The canonical method lives in `docs/methodology/Foundation-Protocol.md`.
The operational process (phases, templates, citation rules) lives in `docs/methodology/Foundation-Implementation.md`.
This section is the binding ruleset (rules in force). When detail is missing here, those documents prevail.

## Trigger Rule

**ONLY** activate Foundation Protocol mode when the user explicitly invokes:

* `[START FOUNDATION]` — full reverse-engineering run. Optionally followed by a scope:
  `[START FOUNDATION] scope: src/ + docker-compose.yml + migrations/`

Otherwise, operate as a normal assistant. Foundation Protocol never self-activates.

## What it does

When triggered, the agent:

1. Reads the repository (Phase 0 — Reconnaissance) before writing a single line.
   Reading order: README → CLAUDE.md → package.json/go.mod/requirements.txt → docker-compose.yml →
   .env.example → migrations/schema → entry points → full folder structure → routes → tests.
2. Generates `docs/enterprise-documentation/` with the following documents:

   **Always:**
   01-Platform-Overview.md · 02-PRD.md · 03-TRD.md · 04-App-Flow.md · 06-Backend-Architecture.md ·
   09-Security-Architecture.md · 10-Technical-Debt.md · 11-Conventions.md

   **Conditional:**
   05-UIUX-Brief.md (if frontend exists) · 07-Database-Architecture.md (if database exists) ·
   08-API-Catalog.md (if HTTP API exists)

   **Inventory (always):**
   `inventory/routes.md` · `inventory/endpoints.md` · `inventory/entities.md` ·
   `inventory/components.md` · `inventory/services.md` · `inventory/integrations.md`

   **README:** `docs/enterprise-documentation/README.md` — index with generation date and scope.

3. Stops and waits for human validation.

## Core Rule: Nothing is invented

Every fact in the generated documents must be traceable to its source (file path + line number).
If a fact cannot be cited, it is not documented — it is registered as "Not determined" in `10-Technical-Debt.md`.

## Re-execution (overwrite, no merge)

If `docs/enterprise-documentation/` already exists, a new run **overwrites** all documents completely.
Re-execution is a fresh snapshot. It is required when: the main architecture changes (new service, new DB,
new pattern), a major module is added, or more than 3 months of active development pass without re-execution.

## Human ACK requirement

Foundation Protocol is complete only after the developer validates with:

```
[FOUNDATION VALIDATED]
PRD reviewed: ✓ / ✗ [notes]
TRD reviewed: ✓ / ✗ [notes]
Conventions reviewed: ✓ / ✗ [notes]
Discrepancies found: [list or "none"]
```

**FDGE may not start its first session until `[FOUNDATION VALIDATED]` is issued.**
Discrepancies become candidates for `10-Technical-Debt.md`.

## Document 11 — Conventions (critical)

`11-Conventions.md` is the most critical output. It tells every future agent how to operate on this
codebase without breaking it. It must contain at minimum:

* Folder structure logic and rules
* Naming conventions (files, classes, functions, DB tables/columns, test files) — with real examples
* Architectural patterns in use — with real code examples and the rule the agent must follow
* At least 3 Hard Rules in `RULE-NN` format (what NOT to do, why, correct/incorrect code examples)
* Files requiring extra care before modification
* Delta Log (for incremental additions between full re-runs)

---

# Part 3 — FDGE: Framework de Desarrollo Gobernado por Evidencia

FDGE is the binding **development framework** for this repository. All implementation, bug fixing,
refactoring, investigation, planning, documentation, and validation activities must follow FDGE.
No alternative workflow may bypass FDGE states.

## Authority

The canonical method lives in `docs/methodology/Framework-FDGE.md`.
The operational implementation (artifacts, templates, folder structure, git workflow) lives in
`docs/methodology/FDGE-Implementation.md`. This section is the binding ruleset (rules in force).
When detail is missing here, those documents prevail.

When uncertainty exists:

1. Consult `docs/methodology/Framework-FDGE.md`.
2. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions).
3. Consult Graphify.
4. Consult `docs/implementation/HISTORY.log`.
5. Consult `docs/implementation/HANDOFF.md`.

Documentation is authoritative. Assumptions are not.

## Core Principle

The agent must never optimize for speed at the expense of understanding.

Primary objective: **Understanding → Strategy → Execution → Evidence → Validation**

Not: Request → Code

## Complexity Classification

Every request must be classified before planning.

### TRIVIAL
Examples: typo correction, label update, text replacement, simple CSS adjustment.
Requirements: State 1 (any variant, abbreviated), Implementation, Evidence, History/Handoff.
Strategy and atomization may be condensed. Use STATE 1-EXPRESS path (see `docs/methodology/instrucctions.md`).

### STANDARD
Examples: typical bug fixes, CRUD modifications, business rule changes, validation changes.
Requirements: Full FDGE workflow.

### MAJOR
Examples: new modules, new workflows, architectural changes, new services, DB redesign.
Requirements: Full FDGE workflow + mandatory risk analysis + mandatory regression analysis + Proposal Package.

## Request Type — State 1 Variants

Every request enters STATE 1 through one of three variants depending on its type:

| Type | State 1 Variant | Primary Artifact | Core Questions |
|:---|:---|:---|:---|
| **BUG** | **STATE 1-B** — Discovery & Architecture | `DISCOVERY.md` | What / Where / When / How / Why |
| **FEATURE** | **STATE 1-E** — Enrichment & Architecture | `ENRICHMENT.md` | Criteria / Scenarios / NFRs / Out-of-scope |
| **REFACTOR** | **STATE 1-R** — Scope & Architecture | `REFACTOR_SCOPE.md` | Scope / Quality bar / Regression risk |

Classifying the request as INVESTIGATION uses STATE 1-B (Discovery, investigation mode).

## Cognitive State Pipeline

The following states are sequential. No state may be skipped.
Condensing (TRIVIAL) is permitted; collapsing (skipping) is never permitted.

### STATE 1-B — Discovery & Architecture (BUG / INVESTIGATION)

Artifacts: `docs/implementation/DISCOVERY.md`, `docs/implementation/CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Expand the request: What / Where / When / How / Why (if known).
4. Document reproduction steps, expected behavior, actual behavior.
5. Identify affected users, business impact.
6. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
7. Identify: Components / Services / Dependencies / Data flows / Risks / Constraints.
8. Record Root Cause Confidence (%), Architecture Confidence (%), Solution Confidence (%).

Output: Append entries to `docs/implementation/DISCOVERY.md`, `docs/implementation/CONTEXT_ANALYSIS.md`.

STOP. Wait for explicit human ACK.
Forbidden: Solution design, code modification, task execution.

#### Investigation Gate
If any condition exists: root cause unknown · architecture impact unknown · dependencies unknown ·
confidence below 70% — classify as INVESTIGATION immediately. Implementation planning is forbidden
until investigation completes.

### STATE 1-E — Enrichment & Architecture (FEATURE)

Artifacts: `docs/implementation/ENRICHMENT.md`, `docs/implementation/CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Enrich the request:
   - Acceptance Criteria: measurable, verifiable list.
   - Test Scenarios: concrete cases (happy path + edge cases + failure cases).
   - NFRs: performance, security, accessibility constraints.
   - Out-of-scope: explicit list of what this feature does NOT cover.
4. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
5. Identify: affected components, integration points, data model impact, risks.
6. Document Architecture Confidence (%), Implementation Confidence (%).

A FEATURE without acceptance criteria, test scenarios, and out-of-scope is not a specification.
Implementing it without enriching first produces the most expensive rework in the cycle.

Output: Create or overwrite `docs/implementation/ENRICHMENT.md`.

STOP. Wait for explicit human ACK.
Forbidden: Proposal design, code modification, task execution.

### STATE 1-R — Scope & Architecture (REFACTOR)

Artifacts: `docs/implementation/REFACTOR_SCOPE.md`, `docs/implementation/CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Define scope:
   - What changes and what does NOT change (explicit boundary).
   - Quality bar: the measurable threshold that proves the refactor is complete.
   - Regression risk: which behaviors must be preserved exactly.
4. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
5. Identify: coupling, test coverage gaps, breaking change risk, rollback strategy.

Output: Create or overwrite `docs/implementation/REFACTOR_SCOPE.md`.

STOP. Wait for explicit human ACK.
Forbidden: Solution design, code modification, task execution.

### STATE 2 — Classification & Strategy

Artifact: `docs/implementation/PLAN_ACTUAL.md`

Design the strategy. Required sections: Objective · Proposed solution · Alternatives considered ·
Alternatives rejected · Dependencies · Risks · Constraints · Success criteria.

Mandatory Regression Analysis: explicitly identify what may break, affected workflows, services, APIs,
UI flows, data integrity risks.

Output: Overwrite `docs/implementation/PLAN_ACTUAL.md`.

STOP. Wait for explicit human ACK.
Forbidden: Code modification, task execution.

### STATE 3 — Atomic Planning & Proposal Package

For STANDARD/MAJOR: generate a **Proposal Package** at `changes/[PT-ID]-[slug]/`:
* `design.md` — architecture decisions and rationale
* `tasks.md` — atomic task list with PT-ID.N identifiers
* `spec-changes.md` — specification changes required
* `test-scenarios.md` — test cases that verify acceptance criteria
* `out-of-scope.md` — explicit exclusions for this PT

Each task must contain: Objective, Inputs, Outputs, Validation method, Status.

Output: `changes/[PT-ID]-[slug]/` (full package) + update `docs/implementation/PENDING_TASKS.md`.

**PROPOSAL GATE — STOP. Wait for explicit human ACK before opening any git branch.**
The agent may not create a branch, modify source code, or begin implementation until the human
approves the Proposal Package. This is an absolute gate with no exceptions.

For TRIVIAL: `docs/implementation/PLAN_ACTUAL.md` is sufficient; Proposal Package is not required.

### STATE 4 — Implementation (git workflow)

Execute only after Proposal Gate ACK. Execute only approved tasks. No undocumented modifications.

**Git workflow (ordered):**
1. Create branch: `feature/PT-XXX-slug` · `fix/PT-XXX-slug` · `refactor/PT-XXX-slug`
2. Write tests first (RED) — tests must fail before writing any implementation code.
3. Update documentation (in-code docs, README, architecture docs if applicable).
4. Write implementation code until tests go GREEN.
5. Run testing report: all tests pass, no regressions.
6. Update Proposal Package (`tasks.md` status, `design.md` if decisions changed).
7. Commit atomically: `feat: PT-XXX description` · `fix: PT-XXX description` ·
   `refactor: PT-XXX description` · `test: PT-XXX description` · `docs: PT-XXX description`

**Tests-first is not optional.** Writing code before writing a failing test is a violation.
**Atomic commits are not optional.** One logical change per commit, named and traceable to PT-XXX.

Rule: Before this state, 0 lines of source code may be modified.

### STATE 5 — Evidence Generation & Self-Review

Artifact: `docs/implementation/evidence/PT-XXX/`

**Code is not evidence. Execution is evidence.** Every implementation must generate evidence:
* Technical: test results, coverage reports, build logs, DB verification, API response logs.
* Functional: screenshots (before/after), workflow completion, UI verification.

**Self-Review checklist** (complete before presenting to human):
- [ ] All acceptance criteria from ENRICHMENT.md verified?
- [ ] All test scenarios from Proposal Package passing?
- [ ] No unintended side effects in related components?
- [ ] `11-Conventions.md` rules respected (naming, patterns, hard rules)?
- [ ] Commits atomic, named with convention, traceable to PT-XXX?
- [ ] No debugging artifacts, console.log, commented-out code left?
- [ ] Documentation updated if public API changed?

Record Self-Review result in `docs/implementation/evidence/PT-XXX/self-review.md`.

### STATE 6 — Validation Gate

#### BUG
Required status: `VALIDATION_PENDING`. The agent may not close bugs. Human confirmation mandatory.
Flow: Implementation → Evidence → VALIDATION_PENDING → Human Validation → CLOSED.

#### FEATURE
May be marked `DONE` only if: tests pass, evidence exists, acceptance criteria verified.

#### REFACTOR
May be marked `DONE` only if: existing behavior preserved (verified by tests), evidence exists.

#### INVESTIGATION
May be marked `CLOSED` after findings are documented in `docs/implementation/DISCOVERY.md`.

### STATE 7 — History & Handoff

Artifacts: `docs/implementation/HISTORY.log`, `docs/implementation/HANDOFF.md`

Append to `HISTORY.log`:
```
## PT-XXX — [Type]: [Title]
Date: YYYY-MM-DD
Status: [DONE / VALIDATION_PENDING / CLOSED]
Branch: [feature/fix/refactor/PT-XXX-slug]
Objective: [one line]
Root cause: [if BUG]
Solution: [what was done]
Modified files: [list]
Evidence: docs/implementation/evidence/PT-XXX/
Delta (real vs planned): [what changed from the Proposal Package and why]
PTSA reference: [H-XXX if this PT closes a finding — else omit]
```

Update `HANDOFF.md` (current state only — overwrite):
Active branch · Current system state · Open bugs (VALIDATION_PENDING) · Pending validations ·
Active investigations · Risks · Recommended next actions.

Rules: `HISTORY.log` is append-only. Never rewrite history. `HANDOFF.md` represents current state only.

## Allowed Status Values

`PENDING` · `IN_PROGRESS` · `BLOCKED` · `DONE` · `VALIDATION_PENDING` · `CLOSED`

## Mandatory Knowledge Sources

Before strategy or implementation, consult all relevant sources:

* `docs/enterprise-documentation/` (Platform Overview, PRD, TRD, Conventions, Backend Architecture)
* Graphify (`graphify-out/`)
* `docs/implementation/HISTORY.log`
* `docs/implementation/HANDOFF.md`
* Active `docs/implementation/ENRICHMENT.md` / `DISCOVERY.md` / `REFACTOR_SCOPE.md`
* `changes/[PT-ID]-[slug]/` (if work in progress)

The agent must never design solutions without first consulting the architecture and conventions.

## Absolute Constraints

### No Foundation Skip
If `docs/enterprise-documentation/` does not exist, issue `[START FOUNDATION]` before any FDGE work.
FDGE State 2 (Architecture) requires verified documentation — not assumptions.

### No Solution First
Never design before understanding.

### No Architecture Blindness
Never modify code before consulting architecture documentation, Conventions (11-Conventions.md), Graphify.

### No Phase Collapse
Never skip FDGE states. Condensing (TRIVIAL) is not collapsing. Every state still happens and is recorded.
Skipping discovery, enrichment, evidence, self-review, validation, or History/Handoff is always forbidden.

### No Proposal Gate Skip
Never create a git branch or modify source code before the Proposal Package ACK.
The Proposal Gate is absolute — no exceptions for urgency, TRIVIAL requests, or familiarity with the code.
Exception: TRIVIAL requests may omit the full Proposal Package but still require a brief ACK on `PLAN_ACTUAL.md`.

### No Tests After Code
Tests must be written and failing (RED) before implementation code is written.

### No Memory-Driven Development
Never act from memory. Always verify from artifacts and documentation.

### No Bug Auto-Close
Bugs require human validation. The agent has no authority to close bugs.

### No Missing Evidence
Every implementation must generate evidence. No exceptions.

### No Dirty Commits
No "WIP", "fix", "changes" commit messages. No commit mixing multiple logical changes.
Every commit must be atomic, named with convention (`feat/fix/refactor/test/docs: PT-XXX description`),
and traceable to its PT.

### No Request Waste
A FEATURE without acceptance criteria, test scenarios, and explicit out-of-scope is not a specification.
Implementing it without enriching first (STATE 1-E) is forbidden.

### No Hidden Reasoning
Strategic reasoning must be materialized in project artifacts. Important decisions must not exist only in chat.

## Framework Compliance Rule

If any FDGE phase is incomplete: STOP. Report the blocking condition. Do not continue until the required
phase is completed or the human explicitly authorizes continuation.

---

# Part 4 — PTSA V3: Continuous Audit & Certification Framework

PTSA is the binding **audit & certification framework** for this repository. It is independent from FDGE:
FDGE governs how code is *built*; PTSA governs how generated *products* are *audited and certified*.
PTSA never bypasses FDGE and FDGE never bypasses PTSA.

## Authority

The canonical, normative specification lives in `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md`
(the exhaustive standard — definitions, schemas, algorithms, templates).
The operational agent manual lives in `PTSA/Motor-PTSA.md`; the working protocol in `PTSA/PTSA.md`.
This section is the binding ruleset (rules in force). When detail is missing here, the official specification prevails.

## Trigger Rule

**ONLY** activate PTSA mode when the user explicitly invokes one of:

* `[START PTSA]` — start audit from F-1.
* `resume PTSA` / `continue PTSA` — resume / run Delta Sync.
* `status PTSA` — report status without modifying artifacts.
* `audit PTSA` — a discrete audit operation (e.g. close a finding).

Otherwise, operate as a normal assistant. PTSA never self-activates.

## Purpose

PTSA does not verify that code runs without errors. It proves, with evidence, that the products the
system generates are **legally, operationally and semantically valid** for the business domain declared in
F-1, and computes a System Health Score based exclusively on evidence. The unit of audit is the **product**,
not the component. If technical execution passes but domain requirements fail, register a D1 finding.

## Core Principles

* **Evidence over opinion (A1)** — Unsupported claims become findings, never conclusions. No "probably / should / seems".
* **Product over implementation (A2)** — Audit products, not isolated folders/modules.
* **Inverse traceability (A3)** — Always start at the product: `Product ← Transformation ← Service ← Rule ← Data Source ← User Action`.
* **Domain supremacy / Potable-Water Rule (A4)** — Technical correctness never compensates a domain failure. If `D1 < 60`, Health is capped at D1.
* **Autonomous audit (A5)** — If you have shell/DB/log access, gather evidence yourself; never ask the user to run diagnostics for you.
* **Auditable immutability (A6)** — Findings are closed, never deleted; evidence is replaced by revisions, never overwritten.
* **Continuous certification (A7)** — Audit is permanent; every score expires (freshness).
* **Declared coverage (A8)** — No score is valid without declared coverage and freshness.

## Quality Model (5 dimensions)

Every finding belongs to **exactly one** dimension.

| Dim | Evaluates | Phase | Weight |
|:--:|:--|:--:|:--|
| **D1 — Domain Alignment** | Business rules, product quality, rubric compliance | F6 | 30% + global cap |
| **D2 — Architectural Integrity** | Code, security, tech debt, DB integrity | F5 | 30% |
| **D3 — Observability & Recovery** | Logs, traceability, fallbacks, recovery | F8 | 30% |
| **D4 — Documentary Fidelity** | Docs ↔ reality coherence | F7 | 10% |
| **D5 — Operational Reliability** | Stability, drift, reproducibility (Success/Retry/Failure/Hallucination/Drift) | F8 | modulator |

The phase indicates *when* a finding was detected; the dimension indicates *which* score it penalizes.
D5 imputes its findings to D2/D3 and feeds Risk + Confidence.

## Scoring (exact formulas)

```
Score_Dn   = max(0, 100 − Σ penalty(active Dn findings))      # penalty: 30/15/5/1 = CRITICA/ALTA/MEDIA/BAJA
Health     = (D1×0.30)+(D2×0.30)+(D3×0.30)+(D4×0.10)
             IF D1 < 60: Health = min(Health, D1)              # Potable-Water Rule — state it explicitly
Risk_Score = min(100, Risk_bruto × 4)                          # Risk_bruto = Σ (Impact×Probability), each 1–16
Confidence = coverage×0.40 + freshness×0.25 + evidence_validity×0.20 + autonomy×0.15
```

Classification: **A** Health ≥ 90 · **B** 75–89 · **C** 60–74 · **F** < 60.
`freshness = UNKNOWN` caps at C; D5-red (`health_unstable`) caps at B.
Full matrices, thresholds and worked examples: Part III of the official specification.

## Phases (15)

```
F-1 Declaración de Valor → F0 Inventario → F1 Mapa del Sistema → F2 Alcance →
F3 Productos → F3.5 Criticidad → F4 Trazabilidad (CENTRAL MILESTONE) →
{ F5 Técnica · F6 Domain Acid Test · F7 Documental · F8 Observabilidad } →
F9 Consolidación → F10 Matriz Ejecutiva → F11 Certificación Continua → F12 Gobernanza de Dominio
```

* **F4 is the central milestone** — F5/F6/F7/F8 cannot start until F4 is 100% complete for every identified product.
* **F3** must create `PTSA/Productos/P-XXX.md` (BORRADOR) per product, or F3 cannot close.
* **F5** verifies the REAL DB schema via shell (not migrations) + ERD. **F8** reads live logs (never assumes logging works).
* **F6 (Domain Acid Test)** evaluates the REAL semantic output of each product against F-1 rules/rubric — not unit tests.
  Levels: (1) business rules, (2) taxonomy/rubric → `rubric_compliance_score`, (3) inter-product coherence,
  (4) AI guardrails (only if it uses an LLM).
* **F11/F12** govern freshness, `audit_due`, delta sync (`audit-scope.yaml`), CI checkpoints (D2/D3/D5),
  and versioned evolution of domain rules (Domain Rules as Code).

## Operating Rules (binding)

* **Autonomy is real** — with shell/DB/log access, run diagnostics yourself; capture output; continue.
* **Materialize reasoning** — every conclusion lives in a `PTSA/` artifact, not only in chat.
* **Evidence before conclusion** — capture `E-XXX.md` (with origin, lines, structural fingerprint) first.
* **Verify in the real source** — derive states/scores from direct observation (DB/output/logs), never inference or memory.
* **Never auto-close BUG/DOMAIN findings** — take them to CORREGIDA/VERIFICADA/VALIDATION_PENDING and stop; human validates and closes.
* **Never overwrite** findings or evidence (use revisions/append); **never duplicate rows** in RESUMEN.md.
* **A product reaches VALIDADO** only with post-fix evidence observed in the real source (e.g. `validacion_estado='aprobado'` in DB), never by inference.

## State management of audit files

`RESUMEN.md` and `ESTADO_ACTUAL.md` → overwrite fully on each phase/sync close.
`AUDIT_LOG.md` → append-only.
`Fases/F*.md` → delta-append `## Update U-XXX` + timestamp.
`Hallazgos/H-XXX.md` → frontmatter updatable, body append (`## Revisión`).
`Productos/P-XXX.md` → frontmatter overwritable on state change, body append.
`RELACIONES.md` → cache, rebuilt by overwrite (individual files prevail).
`score-history.json` → append one record per emission.

## Halt conditions

Stop and report a blocking state ONLY if: (1) the environment explicitly denies shell/execution permissions;
(2) access credentials/parameters cannot be resolved from local files; (3) the user issued an explicit manual breakpoint.
On halt: record blockers in `PENDIENTES.md`, set `BLOQUEADA`, append to `AUDIT_LOG.md`, show a hard-stop report.

For the full operating manual (loop, per-phase mandates, official prompts) see `PTSA/Motor-PTSA.md`.
For the complete normative standard see `docs/methodology/PTSA/PTSA-V3-Especificacion-Oficial.md`.

---

# Part 5 — FPGE: Priorización Gobernada por Evidencia

FPGE is the binding **prioritization framework** that closes the loop
`FDGE (build) → PTSA (audit) → FPGE (prioritize) → FDGE (build next)`.
It answers the question the other two leave ungoverned: **what should we build next, and why?**
It does not decide *how* to build (FDGE) or *whether* a product is valid (PTSA) — it decides which work,
justified by evidence, enters the next development cycle.

## Authority

The canonical method lives in `docs/methodology/Framework-FPGE.md`.
The operational implementation lives in `docs/methodology/FPGE-Implementation.md`.
This section is the binding ruleset (rules in force). When detail is missing here, those documents prevail.

## Trigger Rule

**ONLY** activate FPGE mode when the user explicitly invokes one of:

* `[START FPGE]` / `roadmap FPGE` / `prioritize FPGE` — full run: read evidence, synthesize, prioritize,
  emit `ROADMAP.md`, then stop.
* `promote FPGE R-XXX` — promote an approved roadmap item to FDGE STATE 1 with a new PT-XXX.
* `status FPGE` — report the current roadmap without recomputing.

Otherwise, operate as a normal assistant. FPGE never self-activates.

## Core Principles

* **Evidence-governed prioritization** — every proposed item must cite its origin evidence (`H-XXX`, a
  `HISTORY.log` entry, a `HANDOFF.md` recommendation, a `score-history.json` trend). No evidence → not a candidate.
* **Framework independence (no merge)** — FPGE is **read-only** over FDGE and PTSA artifacts; it writes
  only its own `ROADMAP.md` and `ROADMAP_HISTORY.log`. It never modifies FDGE or PTSA files.
* **Inherited domain supremacy** — D1 (domain) items outrank D2/D3/D4 at equal priority
  (Potable-Water Rule, via a 1.5× domain multiplier).
* **Human gate** — FPGE *proposes*; the human *disposes*. It never starts FDGE itself nor auto-converts
  findings to tasks. Promotion of `R-XXX → PT-XXX` is a human decision.
* **Reproducibility** — same evidence ⇒ same priority order (deterministic algorithm).
* **Freshness gate** — if PTSA `score_freshness` is STALE/UNKNOWN, recommend a PTSA delta sync *before*
  trusting the order.

## Inputs (read-only)

**From PTSA:** `RESUMEN.md` · active `Hallazgos/H-XXX.md` · `Productos/P-XXX.md` ·
`PENDIENTES.md` · `score-history.json`.

**From FDGE:** `docs/implementation/HISTORY.log` · `docs/implementation/HANDOFF.md` ·
`docs/implementation/ENRICHMENT.md` (features specified but not yet implemented) ·
`docs/implementation/REFACTOR_SCOPE.md` (refactors scoped but pending) ·
in-flight `docs/implementation/PLAN_ACTUAL.md` / `PENDING_TASKS.md` · `changes/[PT-ID]-[slug]/` (existing Proposal Packages).

**Optional:** graphify, git history.

**Output (writes):** only `docs/implementation/ROADMAP.md` (overwritten each run) and
`docs/implementation/ROADMAP_HISTORY.log` (append-only).

## Prioritization (reproducible)

```
Priority(item) = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort
```

* `EvidenceWeight` — originating finding's PTSA risk (Impact×Probability, 1–16).
* `ScoreImpact` — expected Health gain (penalty removed × dimension weight).
* `Urgency` — 1.0 base; +0.5 if `audit_due` overdue; +0.5 if dimension STALE or regressing.
* `DomainMultiplier` — 1.5 for D1 else 1.0.
* `Effort` — 1 (S) / 2 (M) / 4 (L).

Tie-breakers: higher Priority → D1 before D2/D3/D4 → higher risk-of-not-doing → lower id.

The roadmap must surface the **Top-3 by impact** and the **Top-3 quick wins**.

## Closing the loop

A full run ends by emitting `docs/implementation/ROADMAP.md` (all items `PROPUESTO`) and **stopping**.
The human marks items `APROBADO` / `DIFERIDO` / `DESCARTADO`.
Each `APROBADO` is promoted (`promote FPGE R-XXX`) to a new `PT-XXX` handed to **FDGE STATE 1**,
with item type determining the STATE 1 variant:

* `BUG` → STATE 1-B (Discovery) — origin evidence as initial context.
* `FEATURE` → STATE 1-E (Enrichment) — item rational as starting point; FDGE expands criteria.
* `REFACTOR` → STATE 1-R (Scope Definition) — technical motivation as initial context.
* `INVESTIGATION` → STATE 1-B (Discovery, investigation mode).

FDGE runs its normal cycle. PTSA re-audits the result on its next delta sync.
The next FPGE run sees the new state and re-orders. **The loop closes.**

For the full method, algorithm detail, schema, and three-way contract see `docs/methodology/Framework-FPGE.md`.
