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
