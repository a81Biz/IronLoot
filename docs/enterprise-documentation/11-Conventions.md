# 11 — Conventions

**The most critical document.** Tells every future agent how to operate on this codebase without breaking it.  
**Source:** Code inspection, CLAUDE.md, schema, package.json files.

---

## 1. Folder Structure Logic

### Monorepo Root
```
c:\DevOps\Desarrollos\IronLoot\
├── src/                    ← ALL application code lives here
│   ├── api/                ← REST API + WebSockets (NestJS)
│   ├── apps/
│   │   ├── base/           ← Public SSR site (NestJS)
│   │   └── client/         ← Private SSR portal (NestJS)
│   ├── admin/              ← Admin backoffice (NestJS)
│   ├── packages/
│   │   └── core/           ← @ironloot/core shared library (no NestJS)
│   └── nginx/              ← Reverse proxy config
├── docs/                   ← Documentation ONLY (no application code)
│   ├── enterprise-documentation/  ← Foundation Protocol output
│   ├── methodology/        ← FDGE, PTSA, FPGE methodology docs
│   └── implementation/     ← FDGE working artifacts (HISTORY.log, HANDOFF.md, etc.)
├── changes/                ← Proposal Packages per PT-ID
├── docker-compose.yml
├── .env.example
└── CLAUDE.md
```

### API Module Structure (`src/api/src/`)
```
src/
├── app.module.ts           ← Root module (imports all feature modules)
├── main.ts                 ← Bootstrap entry point
├── common/
│   ├── config/             ← ConfigModule setup + env validation
│   ├── observability/      ← Logger, metrics, audit, context
│   └── redis/              ← DistributedLockService
├── database/               ← PrismaService (DatabaseModule)
└── modules/
    └── <feature>/          ← One folder per feature module
        ├── <feature>.module.ts
        ├── <feature>.controller.ts
        ├── <feature>.service.ts
        ├── dto/
        │   └── <name>.dto.ts
        └── interfaces/ (optional)
```

### SSR Sites (`src/apps/base/`, `src/apps/client/`)
```
src/
├── app.module.ts
├── app.controller.ts       ← ALL page routes in one controller
├── main.ts                 ← Bootstrap + middleware setup
├── common/
│   ├── guards/             ← ClientAuthGuard, etc.
│   └── filters/            ← NotFoundExceptionFilter (client only)
views/
├── layouts/                ← Root layout templates
└── pages/                  ← One folder per feature area
    └── <feature>/
        └── <page>.html
public/
├── css/
└── js/
    └── pages/
        └── <feature>/
            └── <page>.js   ← Per-page vanilla JS
```

### Admin Structure (`src/admin/src/`)
```
src/
├── app.module.ts           ← Imports SharedModule + 18 feature modules
├── app.controller.ts       ← Auth routes + dashboard
├── app.service.ts          ← All API proxy calls
├── auth/                   ← AdminAuthGuard
├── shared/
│   ├── shared.module.ts
│   └── admin-api-client.service.ts  ← All HTTP calls to API
└── modules/
    └── <feature>/          ← 18 admin feature modules
views/
└── pages/
    └── <feature>/
```

---

## 2. Naming Conventions

### Files
| Type | Pattern | Example |
|---|---|---|
| NestJS module | `<name>.module.ts` | `auctions.module.ts` |
| Controller | `<name>.controller.ts` | `auctions.controller.ts` |
| Service | `<name>.service.ts` | `auctions.service.ts` |
| DTO | `<action>-<name>.dto.ts` | `create-auction.dto.ts` |
| Guard | `<name>.guard.ts` | `jwt-auth.guard.ts` |
| Spec file | `<name>.spec.ts` | `auctions.service.spec.ts` |
| Integration test | `<name>.integration.spec.ts` | `scheduler-lock.integration.spec.ts` |
| Nunjucks template | `<name>.html` | `detail.html` |
| Per-page JS | `<page>.js` under `pages/<feature>/` | `deposit.js` |

### Classes
| Type | Pattern | Example |
|---|---|---|
| Module | `<Feature>Module` | `AuctionsModule` |
| Controller | `<Feature>Controller` | `AuctionsController` |
| Service | `<Feature>Service` | `AuctionsService` |
| DTO | `<Action><Feature>Dto` | `CreateAuctionDto` |
| Guard | `<Name>Guard` | `JwtAuthGuard` |
| Event | `<Name>Event` | `AuctionClosedEvent` |
| Use case | `<Action><Feature>UseCase` | `CloseAuctionUseCase` |

### Database (Prisma)
| Element | Convention | Example |
|---|---|---|
| Table name | `snake_case` via `@@map()` | `@@map("auctions")` |
| Column name | `snake_case` via `@map()` | `@map("seller_id")` |
| Model name (Prisma) | `PascalCase` | `model Auction` |
| Model field | `camelCase` | `sellerId`, `createdAt` |
| Enum name | `PascalCase` | `AuctionStatus` |
| Enum value | `SCREAMING_SNAKE_CASE` | `PENDING_PAYMENT` |
| Index name | `idx_<table>_<column>` | `idx_auctions_status` |

### TypeScript
| Element | Convention |
|---|---|
| Interfaces | `I<Name>` (domain contracts only) or plain name |
| Enums | `PascalCase` with `SCREAMING_SNAKE_CASE` values |
| Constants | `SCREAMING_SNAKE_CASE` |
| Private class members | No prefix (underscore not used) |

---

## 3. Architectural Patterns

### Pattern 1: Global JWT Guard + @Public() Opt-Out
All API routes are protected by default. Public routes use `@Public()` decorator.

```typescript
// ✅ CORRECT — public route
@Post('login')
@Public()
async login() { ... }

// ✅ CORRECT — protected route (no decorator needed)
@Get('me')
async getMe() { ... }

// ❌ WRONG — explicitly adding JwtAuthGuard when it's already global
@UseGuards(JwtAuthGuard)  // redundant
@Get('me')
async getMe() { ... }
```

Source: `src/api/src/app.module.ts:147-151`

### Pattern 2: AuditedAction Decorator for Business Events
Significant business actions use `@AuditedAction()` to automatically persist to `audit_events`.

```typescript
// ✅ CORRECT
@AuditedAction(AuditEventType.BID_PLACED, EntityType.BID, (args) => args[1].auctionId)
async placeBid(@CurrentUser() user, @Body() dto: PlaceBidDto) { ... }
```

Source: `src/api/src/common/observability/decorators`

### Pattern 3: BFF Cookie Injection (BASE only)
BASE injects the JWT from HttpOnly cookie as Authorization header when proxying to API.

```typescript
// ✅ CORRECT pattern (BASE proxy)
proxyReq.setHeader('Authorization', `Bearer ${req.cookies['access_token']}`);

// ❌ WRONG — CLIENT must NOT implement a similar proxy; it calls API directly from controller
```

Source: `src/apps/base/src/main.ts:84-86`

### Pattern 4: Direct API calls in CLIENT controllers
CLIENT controllers call the API directly via `fetch()` server-side (not from browser JS).

```typescript
// ✅ CORRECT — server-side fetch in NestJS controller
async dashboard(@Req() req: Request) {
  const token = req.cookies?.['access_token'];
  const profile = await fetch(`${API_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json());
  return { profile };
}
```

Source: `src/apps/client/src/app.controller.ts:9-19`

### Pattern 5: @ironloot/core is framework-free
**Never** import NestJS, Prisma, Express, or Redis inside `src/packages/core/`.

```typescript
// ❌ WRONG — importing NestJS in @ironloot/core
import { Injectable } from '@nestjs/common';

// ✅ CORRECT — plain TypeScript classes and interfaces only
export class AuctionStateMachine { ... }
```

Source: `src/packages/core/src/index.ts:4`

### Pattern 6: Financial amounts always Decimal, never Float
```typescript
// ✅ CORRECT (Prisma schema)
amount Decimal @db.Decimal(10, 2)

// ❌ WRONG — Float loses precision for currency
amount Float
```

Source: `src/api/prisma/schema.prisma:204, 628`

### Pattern 7: Ledger entries are immutable
Never UPDATE or DELETE from the `ledger` table. Corrections use an `ADJUSTMENT` entry.

---

## 4. HARD RULES

### RULE-01: Never skip the Proposal Gate before modifying source code
**What:** Never create a git branch or modify any file in `src/` before a Proposal Package is approved.  
**Why:** Ensures all changes are traceable to a PT-ID and have documented acceptance criteria.  
**How:** Write `changes/PT-XXX-slug/tasks.md` first; get human ACK; then branch and code.

### RULE-02: Never import NestJS/Prisma/Express/Redis inside @ironloot/core
**What:** `src/packages/core/` must remain framework-free.  
**Why:** Core is shared domain logic — it must be testable without infrastructure, usable in any context.  
**Correct:** Pure TypeScript classes, interfaces, enums, and functions only.  
**Incorrect:**
```typescript
// In src/packages/core/src/domain/auction/auction-state-machine.ts
import { Injectable } from '@nestjs/common';  // ❌ FORBIDDEN
import { PrismaClient } from '@prisma/client'; // ❌ FORBIDDEN
```

### RULE-03: Never write financial amounts as Float
**What:** All monetary amounts in DB schema and TypeScript must use `Decimal(10,2)` or `Decimal(12,2)`.  
**Why:** Float arithmetic loses precision for currency (e.g., 0.1 + 0.2 ≠ 0.3).  
**Correct:**
```typescript
// Prisma schema
amount Decimal @db.Decimal(10, 2)
// TypeScript (Prisma returns Decimal objects, convert carefully)
const total = Number(payment.amount); // OK for display
```
**Incorrect:**
```typescript
amount Float // ❌ in schema
const amount = 9.99 + 0.01; // ❌ float arithmetic on money
```

### RULE-04: Never trust unvalidated webhook payloads
**What:** All payment webhooks must be HMAC-validated before processing.  
**Why:** An attacker can POST fake webhook events to credit wallets or complete orders.  
**Correct:** Validate signature in `PaymentsService.handleWebhook()` first, then process.  
**Incorrect:** Processing payload fields before signature validation.

### RULE-05: Ledger table is insert-only
**What:** Never write UPDATE or DELETE statements on the `ledger` table.  
**Why:** Ledger is the financial audit trail. Modifications destroy the immutable record.  
**Correct:** Create a new Ledger entry with type `ADJUSTMENT` to correct errors.  
**Incorrect:**
```typescript
await prisma.ledger.update({ where: { id }, data: { amount: newAmount } }); // ❌ FORBIDDEN
await prisma.ledger.delete({ where: { id } }); // ❌ FORBIDDEN
```

### RULE-06: Write tests (RED) before implementation code (GREEN)
**What:** No implementation code may be written before a failing test exists for it.  
**Why:** FDGE State 4 mandate — "Tests-first is not optional."  
**Correct:** Write `spec.ts` → run and confirm RED → write implementation → confirm GREEN.  
**Incorrect:** Writing implementation then writing tests to match.

### RULE-07: A dependency between scripts is declared, not inherited from file order
**What:** If a browser script uses a global defined by another script, the template must load the
definer **first** and give **both** `defer`. And a `try/catch` around a product feature must log
something.
**Why:** F-34. `pages-auction-detail.js` called `io('/auctions')` before socket.io defined it,
because PT-096 moved its `<script>` ahead of the CDN when extracting inline JS. The `ReferenceError`
was swallowed by a `catch` labelled *"live feed is optional"*. **Live bidding — the product's
flagship feature — was off for days with no console error, no failing test, and 168/168 green.**
A failure nobody can observe is not a tolerated failure: it is a hidden one.
**Correct:**
```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js" defer integrity="…" crossorigin="anonymous"></script>
<script src="/js/pages/pages-auction-detail.js" defer></script>
```
```js
if (typeof io !== 'function') { console.error('Puja en vivo no disponible: …'); }
```
**Incorrect:** the page script first, no `defer`, and `catch (e) { /* optional */ }`.
**Enforced by:** `src/apps/client/test/orden-de-scripts.spec.ts` (static) and
`tests/qa-browser-suite/32-puja-en-vivo.cjs` (two real browsers).

### RULE-08: Closing a technical debt is TWO writes, not one
**What:** The code **and** `10-Technical-Debt.md`. The new status must **cite what can be read** to
verify it — "closed by PT-XXX" with no citation is another unbacked claim, which is what was there
before.
**Why:** F-33. Four debts (TD-003, TD-005, TD-010, TD-012) said `Open` while being closed in code.
The compiler forces the first write; nothing forced the second. **It was the second time** — PT-090
existed precisely to fix the registry contradicting the code, and three PTs later it lied again.
Discipline without a mechanism expires. A stale debt registry produces no error; it produces wrong
priorities, and FPGE reads these files to order the work.
**Correct:** `**Status:** ✅ CERRADA 2026-07-27 por PT-092. Se comprueba leyendo
account-verification.service.ts y withdrawals.service.ts:50.`
**Incorrect:** leaving `**Status:** Open` after the code closed it — or writing "closed" for a debt
only **partly** closed. TD-005 was closed for `script-src` but not `style-src`; the remainder became
TD-014 instead of hiding behind a blanket claim.
**Enforced by:** `src/api/test/unit/documentacion/coherencia-deuda-tecnica.spec.ts` — which skips
itself when `docs/` is absent (it is gitignored), so it protects whoever holds the documents.

### RULE-09: A style lives in the CSS, not in the markup
**What:** No `style="…"` in a template. Use classes. To show/hide from JavaScript use `classList`,
never `style.display = ''`.
**Why:** TD-014. Since PT-105 the CSP of all three sites has no `'unsafe-inline'` in `style-src`, so
a new `style=` attribute **would not apply** — the browser blocks it silently and the element just
looks wrong, with nothing to see in the console. Same silence as F-34, different directive.
The `classList` half is not style advice: `style.display = ''` means "fall back to whatever the CSS
says", and the CSS now says *hidden*. Four ADMIN tab pages broke exactly there during PT-105.
**Correct:** `<div class="oculto">` · `panel.classList.remove('oculto')`
**Incorrect:** `<div style="display:none">` · `panel.style.display = ''`
**Note:** `el.style.display = 'block'` (an explicit value) is fine — CSSOM is not covered by CSP and
the inline style beats the class.
**Enforced by:** `src/apps/client/test/estilos-fuera-de-plantillas.spec.ts`.

---

### RULE-10: A schema change is a migration, never a `db push`
**What:** Editing `schema.prisma` requires generating a migration (`npm run db:migrate`). The
container applies the schema with `prisma migrate deploy`, and if it fails **the container does not
start**.
**Why:** H-014. `db push` does not write `_prisma_migrations`, so for months the 23 migrations
**had never been executed**. Applied to a clean database they produced a *different* schema: the
Prisma client failed on 3 of 4 probes, and `payments.reference` lost its UNIQUE index — the very
guarantee that stops a retried credit from duplicating the ledger entry.
PT-037 fixed this once, on 23-jul, and the drift came back **in four days** because the prevention
was left as a documentation note. A rule that only lives in a document is not a control.
**Correct:** edit `schema.prisma` → `npm run db:migrate` → commit the migration with the change.
**Incorrect:** edit `schema.prisma` → restart the container and assume it applied.
**Enforced by:** `npm run audit:schema` (`scripts/schema-drift-check.ts`), CI job `schema-drift`,
**without `needs`** — a broken job must not be able to hide it.

---

### RULE-11: Every API route an SSR site calls must exist in the API
**What:** Before pointing a site at `/api/v1/…`, check the route is declared. This covers the SSR
controllers **and the browser JavaScript** — half the contract lives there.
**Why:** H-020. The CLIENT asked for `/api/v1/users/settings`; the API exposes `me/settings`. The
request fell through to the `@Get(':id')` wildcard, `ParseUUIDPipe` rejected the literal string and
returned **400 "uuid is expected"**. The «Configuración» page — in the portal's main menu — did not
load for any user, and the error pointed at the identifier, which was not the problem.
A 404 would have told the truth. The wildcard turned an honest error into a misleading one.
**Correct:** `apiGet(token, "/api/v1/users/me/settings")`
**Incorrect:** `apiGet(token, "/api/v1/users/settings")`
**Enforced by:** `src/api/test/unit/web-views/rutas-que-el-client-invoca.spec.ts`. A literal route
requires a literal destination: matching only through a wildcard **is** the defect.

---

### RULE-12: "Not sent" is not "sent empty"
**What:** When merging a DTO into stored JSON, skip keys whose value is `undefined` — **never** the
falsy ones.
**Why:** H-019. `main.ts` configures the `ValidationPipe` with `transform: true`, so a service does
not receive a plain object but a **class instance carrying every declared property**, the absent
ones as `undefined`. A `deepMerge` walking `Object.keys()` overwrites the branches the client never
sent: `PATCH {"language":"en"}` wiped the user's notification preferences — silently, returning 200.
`false` must still apply, or nobody could ever turn a notification off.
**Correct:** `if (source[key] === undefined) return;`
**Incorrect:** `if (!source[key]) return;`
**Enforced by:** `src/api/test/unit/users/ajustes-parciales.spec.ts`, which exercises the merge with
a real `plainToInstance` instance — the exact shape `transform: true` produces.

---

### RULE-13: An endpoint with no callers is retired, not polished
**What:** Before fixing an endpoint, search for its callers across all of `src/` — **including the
browser JavaScript**. If there are none, the question is not how to fix it but why it still exists.
**Why:** H-018 / ADR-047. `POST /wallet/deposit` credited money from a `referenceId` chosen by the
client, and **nobody called it**: it was orphaned when the payment cycle (PT-080/PT-087) replaced
that flow. Fixing its error handling would have been repairing a door nobody uses, while leaving
money-moving surface unmaintained and uncovered.
**Correct:** retire the handler, remove the service methods left without callers, record the
decision in an ADR, and mark the route in the API catalogue.
**Incorrect:** improve the error mapping of a route no client reaches.
**Enforced by:** `src/api/test/unit/payments/endpoints-legados-retirados.spec.ts`, which pins both
the retirements **and the survivals** — `WalletService.deposit()` stays, because that is what
`creditWallet` uses on the real path.

---

### RULE-14: A guard nobody has seen fail is not a guard
**What:** Every guard ships with control cases and is proven in both directions: it must fail
against the broken state and pass against the fixed one.
**Why:** it is not zeal. During this very session the D3 checkpoint caught two silent `catch`
blocks written minutes earlier, and **three guards accused themselves** by reading their own
comments before they were any use. A guard with false positives gets deleted, and with it whatever
it did protect (the lesson of PT-103).
**Correct:** break the thing on purpose, watch the guard go red, revert, watch it go green, and keep
that run as evidence.
**Incorrect:** write the guard after the fix and ship it green, never having seen it fail.
**Enforced by:** convention. Every `*.spec.ts` guard in this repository carries a `casos de control`
block.

### RULE-15: npm runs in the container, never on the host
**What:** every npm operation — installing, and above all regenerating a `package-lock.json` — runs
inside a Linux container. To refresh a lock: `npm run lock:api` (or `lock:admin` / `lock:root`).
**Why:** `npm install` on Windows rewrites the lock with **that platform's** installed tree and drops
the Linux native binaries. The container then installs less than it needs and **does not fail while
installing: it fails while starting**, on another machine, days later — with the anonymous
`node_modules` volume hiding it until something recreates it. It happened in PT-126 and surfaced in
PT-135 as five containers down: with the API `unhealthy`, nginx, admin, base and client never start.
It was the **third** time this repository met the same defect (PT-129 in `musl`, PT-135 in `gnu`); the
first two were closed with a patch in a Dockerfile, and a patch does not prevent the fourth.
**Correct:** `npm run lock:api` — it deletes the lock first (otherwise npm answers `up to date` and
changes nothing), masks `node_modules` (npm derives the tree from the **real** one, and the host's is
Windows'), and passes `--ignore-scripts` (`husky` without git exits 127 leaving the lock half
written). All three were measured the hard way.
**Incorrect:** `npm install` anywhere outside a container — including "just to add one dependency".
**Enforced by:** `scripts/solo-en-contenedor.js` as `preinstall` in the three install roots, with no
environment-variable escape hatch: an invariant with a `--force` is a habit again, and this rule
exists because a habit was not enough. `lock-declara-plataformas.spec.ts` catches the symptom in CI;
the `preinstall` prevents producing it.
**Declared exception:** `tests/qa-browser-suite/` installs on the host on purpose — Playwright drives
a real browser and there is none inside the API container. It is safe because its lock has **zero**
platform-split packages, and a test keeps checking that it stays zero.

### RULE-16: Every branch named in a workflow trigger must exist on the remote
**What:** any branch listed under `on: push: branches:` or `on: pull_request: branches:` has to be a
branch that actually exists. Prefer `workflow_dispatch` alongside it, so the pipeline can be
interrogated instead of only reacting to pushes.
**Why:** `.github/workflows/ci.yml` triggered on `[dev, qa, prep, prod]`. The only branch this
repository has ever had is `master`. The YAML is valid and GitHub lists the workflow as `active`, so
**nothing ever reported an error** — and the eight jobs never ran once in the project's entire
history (`gh api .../actions/runs → total_count: 0`, PT-136). Three audit checkpoints
(`schema-drift`, `security-audit`, `observabilidad`) were documented as CI-enforced, deliberately
without `needs` so a broken job could not hide them, and **not one of them had ever executed**.
This is the same principle as H-014 (`db push` instead of migrations), H-015 (the job that could not
finish) and H-017 (the healthcheck nobody had seen pass): *a mechanism that does not run warns about
nothing*. The difference is one of degree — here it was not a control that failed, but the platform
where every control lives.
**Correct:** `branches: [master]` plus `workflow_dispatch:`. If an environment-branch flow is ever
wanted, it arrives with its own ADR **and the branches created**.
**Incorrect:** keeping `dev/qa/prep/prod` "in case we adopt them one day" — declaring branches nobody
has created is precisely what caused this.
**Enforced by:** `ramas-del-disparador-existen.spec.ts`. It resolves branches from the clone's
`refs/remotes/origin` without touching the network, and only asks the remote about ones it cannot
find locally. A network failure does **not** absolve: an unconfirmable branch is reported, never
approved.

### RULE-22: A row with a unique constraint is never created with `findX` + `create`
**What:** to create a row that may not exist, use `createMany({ skipDuplicates: true })` followed by a
read, or `upsert`. Never `findUnique`/`findFirst` + `if (!found) create`.
**Why:** another process fits between the read and the write. This repository had **nine** such sites
and **three were on the money path**: the lazy wallet creation in `getWallet()`, inside a deposit's
ledger transaction, and in the seller credit when an auction closes (PT-142). The first CI run this
project ever executed caught it — `Unique constraint failed on the fields: (key)` — and nobody had
seen it before because it needs two conditions at once that development never provides: **real
concurrency** (one instance, one browser) and **a database without the row already created** (the dev
database has history, so the `create` branch never runs). It is the PT-122 lesson inverted: *a
database with history hides what an empty one exposes.*
**Two escapes that do NOT work**, both measured rather than assumed:
1. **`upsert` inside an interactive transaction is not atomic.** Prisma does not compile it to
   `INSERT ... ON CONFLICT` there; it issues `SELECT` then `INSERT`, and still raised `P2002`.
   Being inside a transaction gives atomicity over what you write, **not exclusion over a row that
   does not yet exist** — Prisma runs *read committed*.
2. **`upsert` outside the transaction did not guarantee it either.** An 8-call concurrent test passing
   with `upsert` was luck, not correctness. That is why there is a concurrency test and not a reading
   of the code.
**Correct:** `createMany({ data: [...], skipDuplicates: true })` — it compiles to
`INSERT ... ON CONFLICT DO NOTHING`, never throws, and lets the unique index settle the race — then
read the row.
**Incorrect:** `findUnique(...) ?? create(...)`, even inside `$transaction`.
**Declared exception:** `create` with explicit `P2002` handling **and its reason written down**, when
rejecting the duplicate is the useful answer (a business guard returning 400).
**Enforced by:** `creacion-perezosa-atomica.spec.ts`, which flags the pattern only when the read and
the create target the **same model** — reading an order and creating a shipment is normal and has no
race. Its exception list requires a PT reference and fails if an exception is no longer needed.

### RULE-23: No test deletes without a filter
**What:** test cleanup deletes only the rows that test created — filtered by ids resolved from its
own fixtures, in dependency order. `deleteMany()` and `deleteMany({})` are forbidden; they are the
same truncation, one of them wearing two braces as a disguise.
**Why:** `orders-flow.e2e-spec.ts` truncated **eleven tables** in its `beforeAll`, and Jest runs
suites in parallel: while `ratings.e2e` was setting up its order, `orders-flow` deleted it. Hence
`expected 201, got 404` in a suite that had nothing wrong with it, a violated
`auctions_seller_id_fkey` in `auth-helper`, and — the real tell — **failures that moved between runs**
(PT-143).
The second reason is worse than parallelism: **an unfiltered `deleteMany()` deletes against whatever
`DATABASE_URL` points at**. `auth-helper` had written that fear down — *"Be careful not to delete real
users if running on dev db. Ideally we run on test db"* — without knowing that `TestApp` assigned
`process.env.DATABASE_URL` to the **development** database, the one that holds PTSA validation data.
A comment where a mechanism was needed.
**Correct:** resolve your fixtures' ids, delete their dependents leaf-to-root, then them.
**Incorrect:** `deleteMany()`, `deleteMany({})`, and `--runInBand` as a "fix" — serialising hides that
the suite cannot run in parallel, and this repository has paid for green-that-hides-things enough
times.
**Enforced by:** `limpieza-de-tests-acotada.spec.ts`, with six control cases. It excludes itself: its
control cases must contain the forbidden pattern to prove it can detect it.

### RULE-24: Reading a balance, computing on it and writing an absolute requires locking the row
**What:** every money-moving method reads the wallet with `SELECT ... FOR UPDATE` inside its
transaction. When an operation touches two wallets, it locks them in a **fixed order** (ascending
`userId`).
**Why:** seven `WalletService` methods read, computed in memory and wrote an absolute. Six concurrent
deposits of 100 left the balance at **100** — five of six lost — and every caller got a 200 (PT-146).
The balance is not the worst part: **the losers' ledger entries were written**, each with a
`balanceAfter` that did not match the row. The accounting contradicted itself by 500 MXN and nothing
raised an error. `Payment.reference @unique` does not protect here: it prevents crediting *the same*
payment twice, not two different payments arriving at once — a webhook and the cron's guaranteed path,
for instance.
**Why not `increment`:** `data: { balance: { increment } }` would leave the balance right and **the
ledger entry wrong**, because `balanceBefore` comes from the stale read. Trading a wrong balance for
wrong accounting is not a fix — the ledger is the audit record, and it is what gets read when someone
disputes a charge.
**Correct:** `bloquearMonedero(tx, userId)`; `bloquearDosMonederos(tx, a, b)` when two are involved.
**Incorrect:** `tx.wallet.findUnique(...)` followed by arithmetic and an absolute write. Also
incorrect: locking two wallets in call order — that is a deadlock waiting to happen, and a deadlock
does not show up in development, it shows up in production as hung requests.
**Enforced by:** `saldo-concurrente.e2e-spec.ts` — the concurrent burst, the ledger-equals-balance
invariant, the crossed-capture deadlock case, and **BLQ-02**, which checks that two *different*
wallets do not wait on each other. That last one matters: a global lock would also make the burst
pass, and would be the expensive cure.

### RULE-25: A partial invariant that does not fit in an index is serialised by locking the row that delimits it
**What:** when the rule is *"at most one X in state A or B per Y"* — a **partial** uniqueness — do not
try to express it as a constraint. Open a transaction, take `SELECT ... FOR UPDATE` on **the row that
delimits the invariant's scope** (the payment method, the auction, the order), and check-and-create
inside it.
**Why:** in PostgreSQL that would be a unique index with `WHERE`, and **Prisma cannot declare it in
the schema**. Writing it raw inside a migration would diverge from `schema.prisma` and turn
`audit:schema` red — the very checkpoint PT-127 built to prevent that divergence. The compromise
constraints are worse than useless: `@@unique([paymentMethodId, status])` would allow one `PENDING`
**and** one `SENT` at once — two verifications in flight, two SMS — and `@@unique([paymentMethodId])`
would forbid ever verifying the same method twice, which breaks the product.
**Relation to RULE-24:** it is the same technique applied to a *check* instead of to a *balance*. They
are separate rules because the trigger differs: RULE-24 fires on "read → compute → write an absolute";
RULE-25 fires on "the invariant is partial and no index can hold it".
incorrect: a lock that is released before the `create` — the gap between them is exactly where the
duplicate is born. Check and write share one transaction or the lock is decoration (the first PT-145
attempt did precisely this).
**Enforced by:** `creacion-perezosa-atomica.spec.ts`, which accepts `FOR UPDATE` as a declared way out
alongside a caught `P2002`. That second exit was added when the guard accused PT-145's own locked
code: **teaching the guard the legitimate exception beats listing the file as an exception** — an
exception excuses one file, a rule serves the next one.

### RULE-26: A workflow does not cite files that do not exist
**What:** every `file:` / `context:` a CI workflow names must exist in the repository, and every
`npm run` it invokes must exist in the corresponding `package.json`.
**Why:** the `docker` job cited a `Dockerfile` that had never existed. It did not fail — it was
**skipped**, because it hung off a `needs:` that could not finish, and a skipped job reports success
to the branch. Nothing was built for months and the pipeline was green (PT-147, H-015). This is the
repository's most repeated pattern, and it deserves reading twice: **a mechanism that does not run
warns about nothing.** It has appeared four times — the pipeline that never ran (PT-136), the skipped
job that counted as success (PT-147), `SIN_DATOS` exiting 0 (PT-138), and the `observabilidad` job
that approved without a database to measure (PT-137).
**Enforced by:** `dockerfiles-citados-existen.spec.ts`.

### RULE-27: Every `RULE-NN` the code cites exists in this document
**What:** a `RULE-NN` named in a comment, a service or a guard must have its own section here. New
rules are written **into the contract**, not only into the code that obeys them.
**Why:** ADR-049 narrows `enterprise-documentation/` to the agent contract — these rules, the
`TD-XXX` register and the inventories. Raising a document to sole contract requires checking that it
says what the code believes it says, and it did not: **RULE-25 and RULE-26 were cited in production
code, in guards and in evidence, and neither existed here.** An agent following the citation to the
contract would have found nothing — which is worse than not citing at all. It is H-016's family
(*a precise citation that leads nowhere is read with confidence and is false*) applied to the
document that governs whoever touches this repository.
**Direction:** code → document only. A rule may live in the contract without any comment naming it
(RULE-01..RULE-06 are like that), and demanding the reverse would scatter references through the code
to satisfy a test. The useful direction is the one where the citation lies.
**Numbering gaps are legitimate:** RULE-18 and RULE-21 were reserved in proposal packages (`b361970`)
and their rules ended up folded into others. They do not exist and **must not** be invented — filling
a number to please a checker is writing for the linter.
**Enforced by:** `reglas-citadas-existen.spec.ts`, whose control block builds counter-examples naming
rules that do not exist. The guard accused itself on its first run for exactly that; it was taught
that a control block constructs rather than cites — **an exception excuses one file, a rule serves the
next one.**

### RULE-32: Every pattern in `test:guardas` must match at least one suite
**What:** the `--testPathPattern` list in `test:guardas` names guard suites. Every pattern must match
a real file.
**Why:** PT-148 renamed `rutas-que-el-client-invoca.spec.ts` and the pattern `rutas-que-el-client`
**stopped matching anything**. The script stayed green — Jest does not complain when a pattern finds
no files, the others pass and the summary says OK. The SSR↔API contract guard silently dropped out of
the guard script **four hours after being widened**.
**The failure mode is the bad one:** it does not break, it **shrinks**. A rename empties it without a
trace, and what stops being watched does not show up anywhere. RULE-26 applied to the script that
does the watching.
**Enforced by:** `patrones-de-guardas-casan.spec.ts`.

### RULE-31: Evidence a document cites must be tracked by git
**What:** if a `.md` under `docs/implementation/`, `PTSA/` or `changes/` cites a file in
`evidence/`, that file is in the repository. Working artefacts (DB dumps) are excluded, **declared**
in `.gitignore`.
**Why:** `.gitignore` tracked only `.md` files under `evidence/`, on the reasoning *"the .md is the
reasoning, the rest are dumps"*. That sounds right and is backwards: **the evidence IS the dump.**
FDGE says it plainly — *code is not evidence, execution is evidence* — so suite output, before/after
screenshots and verification JSON are not by-products, they are the proof.
Measured 2026-07-29: **81 of 189 files untracked**, up from 79 of 162 when F-136-A was registered —
the ratio was getting worse with every PT. `PENDING_TASKS` once told a reader to consult a
`regresion.txt` that is not in git.
**What it does not demand:** that everything be cited (there is legitimate evidence no document
names, and forcing citations produces documents written for the linter), nor that everything be
tracked (the `.sql` backups are the copy taken *before* running something, not its result).

**Widened by PT-170 — a citation to a FOLDER is checked too.** This rule's control case AC-02 used to
declare that *"a folder without a file is not a checkable citation"*. That was **true for "is tracked by
git"** — git does not track directories — and **false for "exists"**. The cost of the distinction,
measured 2026-07-29: **`H-023` cited `evidence/PT-162/`, which does not exist** (the group's evidence
lives in `evidence/PT-160/`), and **`H-001` cited `evidence/PT-026/`, which never existed**. Both are
**closed** findings: anyone following the citation to verify the closure found nothing. H-016 inside the
findings themselves, with the guard green in front of both.
AC-02 was **corrected, not deleted** — retiring a control case without saying why weakens the guard in
silence.
**Citing is not commenting:** blockquote lines (`>`) are skipped, because a document explaining that a
citation is broken must be able to write the broken path. The alternative — detecting negations in prose
— teaches writing for the linter, which is worse than the gap. Exclusions are **declared with a
reason** (`HISTORY.log` is append-only; `DISCOVERY.md`/`PLAN_ACTUAL.md`/`self-review.md` exist to quote
what is broken), and a control case asserts every exclusion carries one, so it cannot become an escape
hatch.
**Enforced by:** `evidencia-citada-esta-en-git.spec.ts`, which checks both directions — tracked *and*
present on disk.

### RULE-30: Every `data-accion` a template declares has a handler registered
**What:** ADMIN dispatches actions through a bridge — the template writes `data-accion="conciliar"`,
`ui-behaviours.js` looks that key up in `window.accionesAdmin`, and the page's script registers it.
If you declare the attribute, register the handler.
**Why:** **none of the three actions in all of ADMIN was registered.** The «Rechazar» button in
moderation opened nothing; «Conciliar» queried nothing. In the panel that approves and rejects
auctions.
**Why it was invisible:** `ui-behaviours.js` checks `typeof accion === 'function'` before calling and
**stays silent** if it finds nothing. That is right — it stops one missing handler from breaking the
page — and it is exactly what leaves no trace: no exception, no log, nothing in the console. Just a
button that does not respond.
**The root cause, which is the part worth remembering:** PT-096 moved JavaScript out of templates so
`'unsafe-inline'` could leave the CSP, and moved it **"as-is"** — correctly refusing to mix a move
with a behaviour change. But "as-is" left behind the `onclick=` attributes that wired those
functions, because they lived in the HTML, not in the `<script>` block. **A move that is faithful to
the code can still lose the wiring.**
PT-139 found two dead controls from the same cause and fixed them **without writing the mechanism**,
so three more sat waiting. Same family as F-34 (24 dead handlers, including the `confirm()` calls
that were supposed to ask before a destructive action) and RULE-19.
**Enforced by:** `acciones-declaradas-tienen-manejador.spec.ts`, verified by removing a real
registration and watching it accuse.

### RULE-28: The document that declares what gets audited may not cite what does not exist
**What:** every file path `PTSA/audit-scope.yaml` names must exist. Same for the facts its comments
assert about the repository (migration counts, and the like).
**Why:** it declared five documents and **four had been archived the day before** by PT-141 under
ADR-049 — which followed the citations in `CLAUDE.md` and the TRD guard, and missed this one. And a
comment still read *"23 migrations — none has ever run"*; there are **2** and **both are applied**.
An audit that claims to cover four non-existent documents is claiming coverage it does not have, and
`[A8]` makes declared coverage a requirement of the score. H-016's family, aimed at the file that
says *what is audited*.
incorrect: fixing the paths and moving on. The first attempt at this fix corrected the `docs:` block
and left **a second list** with the same three archived paths a few lines above — the file kept lying
somewhere else, and the guard is what caught it. A datum in two places with no declared owner drifts
(PT-140, in miniature).
**Enforced by:** `alcance-de-auditoria-existe.spec.ts`. It skips globs on purpose: `src/**/*.ts` is a
pattern, not a citation, and demanding literal existence would guarantee a false positive.

### RULE-29: The nine documents archived by ADR-049 do not come back
**What:** none of `01-Platform-Overview` … `09-Security-Architecture` may reappear at the root of
`docs/enterprise-documentation/`. They must stay in `archive/`, and the agent contract
(`10-Technical-Debt.md`, `11-Conventions.md`, `inventory/`) must stay at the root.
**Why:** ADR-049 archived them, and its only protection was **three prose warnings**. A
`[START FOUNDATION]` run that re-emitted them would undo the decision **with no error at all**: nine
files would appear and everything would stay green. A control that exists only as text is not a
control (RULE-14).
**Both directions matter:** the guard also checks the nine are still *in* `archive/`. Deleting them
would satisfy "none at the root" while destroying what `[A6]` protects — PTSA cites them in closed
evidence, and `03-TRD.md` is still verified there by `coherencia-documentacion-codigo.spec.ts`.
**If you genuinely want them back:** retire ADR-049 first. That is the point of the rule — not to
forbid the change, but to stop it happening by accident.
**Enforced by:** `alcance-de-auditoria-existe.spec.ts`.

### RULE-17: No connection variable has a default, and everything the code reads is declared
**What:** `REDIS_URL` is the single Redis contract — queues, rate limiting, the distributed lock and
ADMIN's session store all read it. Connection variables have **no fallback**: if one is missing the
process refuses to start, naming it. And every variable the code reads appears in a `.env.example`,
commented if optional.
**Why:** four clients had three ways of configuring themselves — two read `REDIS_HOST`/`REDIS_PORT`
with a `localhost` fallback, one read `REDIS_URL`, and ADMIN read `REDIS_URL` with a
`redis://redis:6379` fallback. `docker-compose.yml` declared **only** `REDIS_URL`, so what actually
made the dev container work was `REDIS_HOST=redis` inside `src/api/.env` — **a file not in git**
(F-135-A, PT-137).
**The fallback was the problem, not the variable.** `config.get('REDIS_HOST', 'localhost')` turns
"misconfigured" into "configured toward nowhere", and the process starts. In the production image
that produced `Nest application successfully started` followed by a 500 saying
`Reached the max retries per request limit` — a message that **never mentions Redis**. PT-147 showed
the same thing from the other side: ADMIN's image retried against `redis://redis:6379`, a hostname
written for the compose network, and never reached `healthy`.
Twenty-five further variables — mail, HeyBanco, CFDI, reCAPTCHA, Stripe, JWT expiries, withdrawal
limit — were read and declared **nowhere**.
**Correct:** a function that throws, naming the variable, as PT-126 established for `JWT_SECRET`.
Where a client needs host and port separately (BullMQ does), **derive them from the same URL** — the
URL stays the contract.
**Incorrect:** any `get('X', 'default')` on a connection setting, and a hostname fallback borrowed
from one environment's network.
**Enforced by:** `variables-de-entorno-declaradas.spec.ts`. A commented declaration counts — that is
how "optional" is written, and demanding an active value would mean inventing third-party
credentials. Its exception list requires a written reason per entry, and it strips comments before
scanning: it accused its own explanation of the defect the first time it ran.

### RULE-19: Every `{% block %}` must exist in its layout, and no library attribute without the library
**What:** a template may only use blocks its layout (or the layout's own parents) declares. And no
`data-bs-*` — or any other library's attributes — unless that library is actually loaded on that site.
**Why:** Nunjucks **silently discards** the contents of a block the parent does not declare. No error,
no console warning, no failing test. `reconciliation.html` put its `<script>` inside
`{% block title %}`, and `layouts/admin.html` declares only `head`, `content` and `scripts` — so
`pages-reconciliation.js` existed since PT-096 and **never loaded**. The "Conciliar" button did
nothing for two months (PT-139).
Four ADMIN templates had the dead block, not one. Where it came from: BASE and CLIENT **do** declare
`{% block title %}`, so someone copied a correct idiom into a layout that does not support it.
The other half: `refunds.html` opened its modal with `data-bs-toggle` and ADMIN has **no Bootstrap
anywhere**. Inert attributes; the button opened nothing. Refunds move money.
Both failures are the signature of F-34 — the live bidding that stayed off for days with the whole
suite green. **They fail silently, and the silence is what makes them last.**
**Correct:** put scripts in `{% block scripts %}`; reuse the site's existing idiom — ADMIN already had
`.modal-backdrop.oculto` wrapping `.modal`, used by `moderation.html`, with its CSS written. Show and
hide with `classList`, never `style.display` (see `admin.css:597`: `style.display = ''` returns the
element to whatever the CSS says, and the CSS now says hidden).
**Incorrect:** inventing a third modal structure when the panel already has one; and citing a
library's attributes as documentation of intent.
**Enforced by:** `bloques-de-plantilla-existen-en-su-layout.spec.ts` and
`atributos-bootstrap-sin-bootstrap.spec.ts`. Both strip comments before scanning — they each accused
their own explanation of the defect on first run.

### RULE-20: Each class of pending work has one register that rules
**What:** closing something is written in the register that owns it. The others are derived and are
not edited by hand. `HISTORY.log` is **append-only**: what is missing gets added at the end with its
real date noted.
**Why:** this repository reached **twelve** places where a pending item could live and **one** of them
had an automated guard. The result, measured on 2026-07-28: `PENDING_TASKS.md` marked `PENDING` things
that were done, declared `BLOCKED` **forty-four task rows** for four PTs already merged, asked to
"push master" when master was already pushed, and — worst — **PT-129 and PT-130 had no entry in
`HISTORY.log`** despite having evidence folders, merged commits and closed PTSA findings (PT-140).
None of those rows was undone work. All of them were **done work that no register picked up**.
PT-090 had already rebuilt that file once, and F-33 found it lying again **three PTs later**. A
register fixed by hand drifts again; one with a guard does not.
**Correct:** the ownership table in `CLAUDE.md` § "Dónde vive un pendiente". Add missing history at
the end, dated.
**Incorrect:** reordering `HISTORY.log` so entries land chronologically — that falsifies the record
this rule exists to make trustworthy.
**Enforced by:** `coherencia-de-registros.spec.ts`, three deterministic checks only. It does **not**
read prose: a guard that forces a particular wording teaches people to write for the linter, and then
the document stops telling the truth. Its parser understands grouped headers (`## PT-090 … PT-104`)
because a noisy guard gets disabled, and a disabled guard also stops catching what it did detect.

### RULE-35: An `ND-XXX` asserting an absence is checked like a `TD-XXX`
**What:** `10-Technical-Debt.md` also holds a `NOT DETERMINED` section. An `ND` entry that asserts
something is absent, or cites a path, is verified: the fact that closed it must still hold, and the
document must declare it closed. Both directions.
**Why:** measured 2026-07-29, two of seven contradicted the code. **`ND-002`** gave as evidence *"no
`ThrottlerStorageRedisService` referenced"* citing `app.module.ts:75-85` — it has been there **since
PT-030**, the PT that closed **H-002**. So two official registers stated opposite things about the same
fact, and the lying one governs debt. **`ND-003`** said the email templates were "not found"; they sit
exactly where `ND-003` says to look.
**An absence claim ages the worst way:** the day someone adds what was declared missing, the sentence is
still there and is now false, with nothing changing colour. H-016 applied to debt.
`coherencia-deuda-tecnica.spec.ts` only reads `TD-XXX`; the `ND-XXX` live in the same file and weigh the
same for a reader.
**Correct:** declare the *fact* in the guard, not the wording — a guard that demands particular prose
teaches writing for the linter, and then the document stops telling the truth. Adding a row is what it
costs to close an `ND` with a citation: deliberate, and the difference between closing it and calling it
closed.
**Still legitimately open:** `ND-004` — there is no `coverageThreshold`. Left alone.
**Enforced by:** `deuda-no-determinada-vigente.spec.ts`.

### RULE-34: The work trail has no gaps — in both directions
**What:** (a) every PT the history still leaves awaiting validation appears in `PENDING_TASKS.md`;
(b) every **group** in `HISTORY.log` has an evidence folder, measured against a declared baseline that
may only shrink.
**Why:** RULE-20 watched two directions and was missing the symmetric ones. Both failed on 2026-07-29:
**PT-167 existed only in its commit message** — no `HISTORY.log` entry, which STATE 7 makes mandatory —
and **PT-166 sat at `VALIDATION_PENDING` outside the pending register**, because its entry landed *after*
the blanket VoBo that enumerated PT-148…165, while `PENDING_TASKS.md` claimed *"nothing else is
pending"*. Meanwhile C1 **passed vacuously**: with no pending rows there is nothing to compare. A guard
that passes on an empty set does not say everything is fine — it says it did not look.
**Count by GROUP, not by PT.** `HISTORY.log` uses grouped headers (`## PT-159 / PT-160 / PT-162`) with
one evidence folder per group. Counting per PT produced **seven false positives**, and chasing them
would have created seven folders to satisfy a badly defined metric (F-167-E, corrected before acting).
**Chronology, not a cutoff.** Three historical VoBos are **totality statements** (*"toda la validación
pendiente"*, *"dalos a todos por validados"*), not enumerations. Treating them as enumerations accused
**thirty** already-validated PTs. The trail is walked in order — what an append-only log both permits
and demands — instead of applying an arbitrary "from PT-140 onwards", which would be a silent cap
dressed as a threshold.
**The baseline is declared, never silent.** Of 131 groups, **34** have no evidence, spread across the
whole history. Fabricating it from a PT's description would be **inventing execution**, and FDGE says
the evidence *is* the execution. So they are declared in `evidence-baseline.json` on the same terms as
`security-baseline.json`: the list only goes down. Its own checks watch that it does not grow, does not
get used to cover today's gap, and does not age into declaring already-closed holes.
**Enforced by:** `rastro-de-trabajo-completo.spec.ts`.

### RULE-33: A PTSA derived file never contradicts the `H-XXX` it derives from
**What:** `PTSA/Hallazgos/H-XXX.md` **rules** for audit findings. `ESTADO_ACTUAL.md`, `RESUMEN.md` and
`PENDIENTES.md` are derived: none of them may **table** a finding as active when its frontmatter says
`CERRADA`/`CLOSED`, and the count `ESTADO_ACTUAL.md` announces must be the number it lists.
**Why:** measured 2026-07-29, all three declared **four** findings active (H-021, H-022, H-023, H-024)
that were `CERRADA` with human VoBo the same day, their fixes verified by execution. `PENDIENTES.md`
was the worst case: its own header declares it *state, not log*, and that it gets pruned — it was
rewritten in S-003 for having stacked seven unpruned blocks and **re-accumulated in a single day**, the
very day the work it called pending was closed (PT-168).
**A register that grows while the work closes is the symptom that opened PT-140.** And in PTSA it is not
cosmetic: `[A8]` makes declared coverage an input to the score, and freshness caps the classification.
A false derived file is a false input to the calculation.
**Correct:** derive from the frontmatter; keep historical attribution in **prose**, where it belongs.
**Incorrect:** naming a closed finding in a column that means "penalises today"; or writing a
recomputed Health — that is a PTSA *emission*, and **PTSA never self-activates** (`resume PTSA` is the
human's trigger). Asserting a score no instrument emitted is H-021 all over again.
**Enforced by:** `estado-de-hallazgos-coherente.spec.ts`. It reads **table rows, not prose**: an
actives section legitimately states the closed count and explains where a score came from, and a false
positive kills a control just as dead as a blind spot (AC-07 pins exactly that).

---

## 5. Files Requiring Extra Care Before Modification

| File | Risk | Why |
|---|---|---|
| `src/api/prisma/schema.prisma` | HIGH | Any change requires `npm run db:generate` and a migration; breaking changes destroy data |
| `src/api/src/main.ts` | HIGH | Startup gate, CORS, versioning — breaking this prevents all API routes from working |
| `src/apps/base/src/main.ts` | HIGH | BFF proxy logic — breaking this breaks token auth for all BASE pages |
| `src/api/src/app.module.ts` | MEDIUM | Global guards and middleware — removing ThrottlerGuard or JwtAuthGuard exposes all routes |
| `src/api/src/common/observability/constants.ts` | MEDIUM | Error codes and audit event types — renaming breaks existing audit log queries |
| `src/packages/core/src/index.ts` | MEDIUM | Public API of @ironloot/core — adding/removing exports is a breaking change for the API |
| `.env.example` | MEDIUM | Adding a required env var must also be added to `validateEnv` and docker-compose |
| `docker-compose.yml` | MEDIUM | Service startup order and health checks — misconfiguring causes containers to not start |
| `src/nginx/nginx.conf` | MEDIUM | Traffic routing — misconfiguring routes traffic to wrong service |

---

## 6. Module Registration Rule

New feature modules must be registered in `src/api/src/app.module.ts` imports array.  
New admin modules must be registered in `src/admin/src/app.module.ts` imports array.

---

## 7. Environment Variable Rule

When adding a new required environment variable:
1. Add to `.env.example` with a comment explaining the value
2. Add to `src/api/src/common/config/env.validation.ts` (if using Joi/class-validator)
3. Add to `docker-compose.yml` environment section for affected services
4. If critical for security: add validation to `validateStartupConfig()` in `src/api/src/main.ts`

---

## 8. Delta Log

*(Incremental changes between Foundation Protocol runs — append-only)*

| Date | Change | PT-ID |
|---|---|---|
| 2026-06-23 | Initial Foundation Protocol run | — |
| 2026-07-27 | RULE-07 — script dependency order + no silent catch (from F-34) | PT-102 |
| 2026-07-27 | RULE-08 — closing a debt is two writes, with citation (from F-33) | PT-103 |
| 2026-07-27 | RULE-09 — styles live in CSS; classList, not style.display (from TD-014) | PT-105 |
| 2026-07-28 | RULE-10 — a schema change is a migration, never a `db push` (from H-014) | PT-127 |
| 2026-07-28 | RULE-11 — every API route an SSR calls must exist (from H-020) | PT-132 |
| 2026-07-28 | RULE-12 — "not sent" is not "sent empty" (from H-019) | PT-132 |
| 2026-07-28 | RULE-13 — an endpoint with no callers is retired, not polished (from H-018) | PT-133 |
| 2026-07-28 | RULE-14 — a guard nobody has seen fail is not a guard | PT-127…PT-133 |
| 2026-07-29 | RULE-33 — a PTSA derived file never contradicts the `H-XXX` (from F-167-A/B) | PT-168 |
| 2026-07-29 | RULE-34 — the work trail has no gaps, both directions (from F-167-C/E/F) | PT-169 |
| 2026-07-29 | RULE-31 widened — a citation to a folder is checked too (from F-167-D) | PT-170 |
| 2026-07-29 | RULE-35 — an `ND-XXX` asserting an absence is checked (from F-167-G) | PT-171 |
