# A — Documentation Inventory, Classification & Knowledge Map

**Audit phase:** Phase 1 (Inventory & Classification) + Phase 2 (Knowledge Map)
**Scope:** All documentation artifacts under `docs/`, `PTSA/`, `changes/`, and repo-root docs.
**Generated:** 2026-07-23
**Method:** Every claim cited as `path:line` or `path (section)`. No source-code analysis performed (that is other agents' job). "not determined" used where date/status is unclear.

Classification vocabulary (exactly one per row):
`Oficial` (authoritative reference-of-record) · `Trabajo` (in-flight working artifact) · `Auditoria` (audit output) · `Temporal` (transient/current-state, overwritten) · `Historico` (append-only history) · `Obsoleto` · `Duplicado` · `Reemplazado` · `Evidencia` · `Referencia` (process/methodology/meta).

---

## 1. INVENTORY TABLE

### 1.1 Repo-root docs

| Path | Purpose | Classification | Last-meaningful-date | Notes |
|---|---|---|---|---|
| `README.md` | Operator/QA guide: what IronLoot is, 5-service arch, setup, URLs, page map, QA business rules | Oficial | 2026-06-19 (git) | User-facing onboarding. Overlaps 01-Platform-Overview + inventory/routes (see §3). |
| `CHANGELOG.md` | Keep-a-Changelog history v0.1.0→0.5.1 | Historico | 2026-01-12 (git; last entry 0.5.1) | Stops at 0.5.1 (Jan 2026); does NOT cover v1.0.0 or PT-026..PT-035 work. Stale relative to current state — see §4 gap. Describes legacy `web/` frontend (removed 2026-06-19). |
| `CLAUDE.md` | Project instructions + full methodology ruleset (Foundation/FDGE/PTSA/FPGE) | Referencia | 2026-06-23 (git) | Governance/process. Also asserts some architecture facts (CSRF double-submit, module counts) that conflict with enterprise docs — see §3. |

### 1.2 `docs/enterprise-documentation/` — Foundation Protocol output (the authoritative system docs)

All generated 2026-06-23 (`README.md:3`), Foundation Protocol v1.0 first run, VALIDATED (`HISTORY.log:66-77`). These files are untracked in git (no git dates); dates are from content frontmatter.

| Path | Purpose | Classification | Last-meaningful-date | Notes |
|---|---|---|---|---|
| `docs/enterprise-documentation/README.md` | Index + re-execution criteria | Oficial | 2026-06-23 | Next re-run recommended 2026-09-23. |
| `01-Platform-Overview.md` | What IronLoot is, actors, service map, key business rules table | Oficial | 2026-06-23 | Business-rule table lines 91-99. |
| `02-PRD.md` | Product requirements, acceptance criteria, business rules, out-of-scope | Oficial | 2026-06-23 | AC-3.2 was corrected by PT-032 (`HISTORY.log:45-53`); file is gitignored so correction is disk-only. |
| `03-TRD.md` | NFRs, runtime, security, DB, integration contracts | Oficial | 2026-06-23 | |
| `04-App-Flow.md` | End-to-end flows: register, bid, close, payment, order, dispute, moderation, KYC | Oficial | 2026-06-23 | |
| `05-UIUX-Brief.md` | Frontend arch, BASE/CLIENT/ADMIN page inventories, CSP | Oficial | 2026-06-23 | Page inventories duplicate inventory/routes.md — see §3. |
| `06-Backend-Architecture.md` | Service topology, module graph, request pipeline, events bus, distributed lock, core lib | Oficial | 2026-06-23 | Says "Feature Modules (27)" but graph lists 23 — see §3/§4. |
| `07-Database-Architecture.md` | ERD, all tables/columns, enums, indexes, wallet/ledger invariants | Oficial | 2026-06-23 | Enum lists duplicate inventory/entities.md — see §3. |
| `08-API-Catalog.md` | All REST endpoints, auth, rate limits, WebSocket events | Oficial | 2026-06-23 | Duplicates inventory/endpoints.md (endpoints.md adds audit-event column) — see §3. |
| `09-Security-Architecture.md` | Auth model, CORS, CSP, Helmet, rate limiting, webhook validation, secrets, CSRF | Oficial | 2026-06-23 | §6 CSRF conflicts with CLAUDE.md + CHANGELOG — see §3. |
| `10-Technical-Debt.md` | Confirmed stubs (TD-001..005), Not-Determined (ND-001..007), tradeoffs (TT-001..004) | Oficial | 2026-06-23 | Some items resolved since (ND-002 throttler by PT-030, TD-003 by PT-029) but doc not updated — see §4. |
| `11-Conventions.md` | Folder/naming conventions, architectural patterns, 6 HARD RULES, files-needing-care, delta log | Oficial | 2026-06-23 | "The most critical document" (line 3). Delta log line 328 only has initial run. |
| `inventory/routes.md` | All frontend routes BASE+CLIENT+ADMIN + nginx routing | Oficial | 2026-06-23 | Duplicates 05-UIUX-Brief §4-6. |
| `inventory/endpoints.md` | All API REST endpoints + audit events | Oficial | 2026-06-23 | Duplicates 08-API-Catalog. |
| `inventory/entities.md` | All Prisma models (27) + enums (20) | Oficial | 2026-06-23 | Duplicates 07-Database enum/model lists. |
| `inventory/components.md` | All NestJS modules per service | Oficial | 2026-06-23 | "Total admin modules: 19"; API "Feature Modules (27 total)" but lists 23 — see §3. |
| `inventory/services.md` | All injectable services + core use-cases/domain classes | Oficial | 2026-06-23 | |
| `inventory/integrations.md` | External integrations (payments, email, Redis, PG, TOTP, BullMQ, storage, CFDI, nginx) | Oficial | 2026-06-23 | References TD-002 for throttler but text says "storage backend TBD" (line 68) — stale post PT-030. |

### 1.3 `docs/implementation/` — FDGE working artifacts

| Path | Purpose | Classification | Last-meaningful-date | Notes |
|---|---|---|---|---|
| `HISTORY.log` | Append-only PT/audit history (PT-026..035, PTSA S-001, FPGE, Foundation) | Historico | 2026-06-24 (last entry PT-034) | Authoritative event log. Append-only per CLAUDE.md. |
| `HANDOFF.md` | Current system state, active branch, open findings, next actions | Temporal | 2026-06-23 | Overwrite-on-update (current-state only). PTSA Health 95.2 Clase A. |
| `DISCOVERY.md` | STATE 1-B discovery records for BUG/INVESTIGATION PTs (026,028,029,033,034) | Trabajo | 2026-06-23 | Append-only. PT-033/034 marked DISCOVERY_PENDING though HISTORY marks them CLOSED — status skew (see §4). |
| `ENRICHMENT.md` | STATE 1-E enrichment for PT-035 design system (only) | Trabajo | 2026-06-23 | Overwritten per PT; currently holds PT-035. State ENRICHMENT_PENDING. |
| `REFACTOR_SCOPE.md` | STATE 1-R scope for PT-030 throttler (only) | Trabajo | 2026-06-23 | PT-030 already DONE — this is stale/superseded working doc. |
| `PLAN_ACTUAL.md` | STATE 2 strategy for PT-035 | Trabajo | 2026-06-23 | State STRATEGY_PENDING_ACK. |
| `CONTEXT_ANALYSIS.md` | Architectural context per PT session (026-032, 033, 034, 035) | Trabajo | 2026-06-23 | Append-by-session. |
| `PENDING_TASKS.md` | Atomic task tracking per PT | Trabajo | 2026-06-23 | Shows PT-026/029/030 tasks as PENDING in one section but DONE in "Completados" — internal skew (see §4). |
| `ROADMAP.md` | FPGE prioritized roadmap R-001..R-007 | Trabajo | 2026-06-23 | All items APROBADO/promoted. |
| `ROADMAP_HISTORY.log` | Append-only FPGE run history | Historico | 2026-06-23 | |

### 1.4 `docs/implementation/evidence/` — FDGE evidence

| Path | Purpose | Classification | Date | Notes |
|---|---|---|---|---|
| `evidence/PT-029/self-review.md`, `test-results.md` | PT-029 withdraw validation evidence | Evidencia | 2026-06-23 | |
| `evidence/PT-033/build-base.md`, `git-log.md`, `self-review.md`, `test-results.md` | PT-033 auth-email-links evidence | Evidencia | 2026-06-23 | |
| `evidence/PT-034/config-verification.md`, `self-review.md`, `test-results.md` | PT-034 cookie-domain evidence | Evidencia | 2026-06-24 | |
| `evidence/PT-035/build-results.md`, `self-review.md` | PT-035 design-system build evidence | Evidencia | 2026-06-23 | No test-results (visual PT, VALIDATION_PENDING). |

### 1.5 `docs/methodology/` — process/framework specs (META)

| Path | Purpose | Classification | Notes |
|---|---|---|---|
| `README.md` | Suite manual: 4 components + cycle | Referencia | Meta. |
| `Foundation-Protocol.md` | Foundation Protocol canonical method | Referencia | Meta. |
| `Foundation-Implementation.md` | Foundation operational process | Referencia | Meta. |
| `Framework-FDGE.md` | FDGE canonical method (855 lines) | Referencia | Meta. |
| `FDGE-Implementation.md` | FDGE operational implementation (1063 lines) | Referencia | Meta. |
| `Framework-FPGE.md` | FPGE canonical method | Referencia | Meta. |
| `FPGE-Implementation.md` | FPGE operational implementation | Referencia | Meta. |
| `PTSA/PTSA-V3-Especificacion-Oficial.md` | PTSA V3 normative spec (2208 lines) | Referencia | Meta — largest doc. |
| `Suite-CLAUDE-Template.md` | Template for CLAUDE.md suite | Referencia | Meta. |
| `instrucctions.md` | Cross-cutting instructions (sic: misspelled filename) | Referencia | Meta. Filename typo "instrucctions". |

### 1.6 `docs/design/` — brand/design system

| Path | Purpose | Classification | Notes |
|---|---|---|---|
| `Modo_Luz.md` | Light-mode brand: concept, palette, typography, manifesto | Oficial | Source of truth for PT-035 (`ENRICHMENT.md:9`). Palette #F6F6F6/#151515/#31363F/#C89B3C. |
| `Modo_Oscuro.md` | Dark-mode brand + design brief + logo construction | Oficial | Same palette; symbol described as I+candado+bóveda vs Modo_Luz's I+bóveda+protection (minor variance, §3). |
| `Index.png`, `list.png`, `Modo_Luz.png`, `Modo_Oscuro.png`, `logos.png`, `logos3d.png` | Mockups + logo sprite sheets | Referencia | Binary assets (not read). Consumed by PT-035. |

### 1.7 `PTSA/` — audit framework artifacts (session S-001 + DS-001..003, 2026-06-23)

| Path | Purpose | Classification | Notes |
|---|---|---|---|
| `RESUMEN.md` | Audit summary: scores, findings, FDGE state | Auditoria | Overwrite-on-close. Health 95.2 Clase A. |
| `ESTADO_ACTUAL.md` | Current audit state | Temporal | Overwrite. Mirrors RESUMEN (duplication, §3). |
| `AUDIT_LOG.md` | Append-only audit operations log | Historico | Not read in full; append-only per PTSA rules. |
| `PENDIENTES.md` | Audit blockers/pending | Temporal | Not read in full. |
| `RELACIONES.md` | Product↔finding relations cache | Auditoria | Rebuilt-by-overwrite cache. |
| `audit-scope.yaml` | Declared coverage/freshness for delta sync | Auditoria | Not read in full. |
| `score-history.json` | Append-only score emission records | Historico | S-001+DS-001..003. |
| `Fases/F-1_Declaracion_Valor.md` | Domain declaration, 12 products, 15 domain rules CR-001..015, rubrics | Auditoria | Defines CR catalog. CR numbering CONFLICTS with F6 — see §3. |
| `Fases/F0_Inventario.md` | Inventory phase | Auditoria | Not read in full. |
| `Fases/F1_Mapa_Sistema.md` | System map | Auditoria | Not read in full. |
| `Fases/F2_Alcance.md` | Scope | Auditoria | Not read in full. |
| `Fases/F3_Productos.md` | Product identification | Auditoria | Not read in full. |
| `Fases/F3_5_Criticidad.md` | Product criticality | Auditoria | Not read in full. |
| `Fases/F4_Trazabilidad.md` | Traceability (central milestone) | Auditoria | Not read in full (227 lines). |
| `Fases/F5_Tecnica.md` | Technical/D2 audit | Auditoria | Not read in full. |
| `Fases/F6_Funcional.md` | Domain Acid Test: CR-001..015 verification | Auditoria | 13/15 CRs verified; H-001, H-005 violations. CR numbering differs from F-1 (§3). |
| `Fases/F7_Documental.md` | Documentary fidelity/D4 | Auditoria | Not read in full. |
| `Fases/F8_Observabilidad.md` | Observability/D3 | Auditoria | Not read in full. |
| `Fases/F9_Consolidacion.md` | Consolidation | Auditoria | Not read in full. |
| `Fases/F10_Matriz_Maestra.md` | Executive matrix | Auditoria | Not read in full. |
| `Fases/F11_Certificacion_Continua.md` | Continuous certification | Auditoria | Not read in full. |
| `Fases/F12_Gobernanza_Dominio.md` | Domain governance | Auditoria | Not read in full. |
| `Hallazgos/H-001.md`..`H-007.md` (7) | Individual findings | Auditoria | H-005 (CFDI) sampled: producto_id P-009 conflicts with F-1's P-009=Ledger/P-012=CFDI (§3). Frontmatter-updatable, body-append. |
| `Productos/P-001_Bid.md`..`P-012_CfdiRecord.md` (12) | Audited product cards | Auditoria | P-001 sampled: still estado BORRADOR, confidence 0, audit_due 2026-07-23 — never advanced past draft though F6 ran (§4). |
| `Evidencias/E-001.md`..`E-008.md` (8) | Captured audit evidence | Evidencia | Not read individually. |

### 1.8 `changes/` — FDGE Proposal Packages (Trabajo)

Each PT dir contains `design.md`, `tasks.md`, `spec-changes.md`, `test-scenarios.md`, `out-of-scope.md`. All classification **Trabajo**, dated 2026-06-23 (PT-034 2026-06-24). Not read line-by-line (content mirrored in DISCOVERY/ENRICHMENT/PLAN which were read).

| Path (dir) | PT / type | Status (per HISTORY) | Notes |
|---|---|---|---|
| `changes/PT-026-bids-soft-close-config/` | PT-026 BUG soft-close | DONE (H-001 CLOSED) | 5 files. |
| `changes/PT-029-withdraw-payment-method-validation/` | PT-029 BUG withdraw validation | VALIDATION_PENDING/DONE | 5 files. |
| `changes/PT-030-throttler-redis-storage/` | PT-030 REFACTOR throttler→Redis | DONE (H-002 CLOSED) | 5 files. |
| `changes/PT-033-auth-email-links/` | PT-033 BUG auth email links | CLOSED | 5 files. |
| `changes/PT-034-cookie-domain-docker/` | PT-034 BUG cookie domain | CLOSED | 5 files. |
| `changes/PT-035-ironloot-design-system/` | PT-035 FEATURE design system | VALIDATION_PENDING | 5 files (largest: tasks 419, design 367). |

**Missing Proposal Packages:** PT-027 (CFDI, BLOQUEADO — never got package), PT-028 (INVESTIGATION, no package by design), PT-031/PT-032 (TRIVIAL, PLAN_ACTUAL path). Consistent with methodology.

---

## 2. KNOWLEDGE MAP — what the docs collectively claim

### 2.a Business rules asserted

The canonical rule set is the PTSA **CR-001..CR-015** catalog (`F-1_Declaracion_Valor.md:78-95`), cross-referenced to the PRD/Overview. Note the CR-number-vs-meaning conflict flagged in §3.

| Rule | Statement | Where stated (multiple = potential duplication) |
|---|---|---|
| Soft-close window | Bid in final 120s extends auction by `AUCTION_SOFT_CLOSE_WINDOW_SEC` (default 120s) | `01-Platform-Overview.md:93`; `02-PRD.md:32`; `04-App-Flow.md:68`; `README.md:37` ("2 min"); `F-1:88` (as **CR-009**); `F6:29` (as **CR-002**). CONSISTENT on value; CONFLICT on CR-number. |
| Held-funds invariant | Held funds cannot exceed available balance **at time of locking**; may exceed remaining balance after | `02-PRD.md:59` (AC-3.2, corrected by PT-032); `07-Database-Architecture.md:224` (invariant); **CONFLICTS** with `F-1:81` CR-002 "held_funds <= wallets.balance" (permanent) — see §3. |
| Balance non-negative | `wallets.balance >= 0` always | `02-PRD.md:58` (AC-3.1); `07-Database:224`; `F-1:80` (CR-001); `F6:24`. CONSISTENT. |
| Deposit amount match | Deposit amount must equal verified provider payment; else `PaymentMismatchException` | `02-PRD.md:61` (AC-3.4); `04-App-Flow.md:110`; `09-Security:137`; `F-1:83` (CR-004); `F6:41`. CONSISTENT. |
| Bid on own auction rejected | 400 `BID_ON_OWN_AUCTION` | `02-PRD.md:38` (AC-2.1); `04-App-Flow.md:61`; `F-1:84` (CR-005). CONSISTENT. |
| Bid too low rejected | 400 `BID_TOO_LOW` if bid ≤ currentPrice | `02-PRD.md:39` (AC-2.2); `F-1:85` (CR-006). CONSISTENT. |
| Dispute window | 14 days after delivery; else `DISPUTE_WINDOW_EXPIRED` | `01-Overview:95`; `02-PRD.md:97,103`; `04-App-Flow.md:138`; `F-1:86` (CR-007). CONSISTENT. |
| Webhook HMAC | Validate HMAC before processing any webhook | `01-Overview:12`; `02-PRD.md:70`; `09-Security:127`; `11-Conventions RULE-04:265`; `F-1:87` (CR-008). CONSISTENT (HARD RULE). |
| Currency MXN | MXN only; Decimal not Float | `01-Overview:98`; `03-TRD:79`; `07-Database:17`; `11-Conventions RULE-03:249`; `F-1:89` (CR-010). CONSISTENT. |
| Prod secrets gate | ADMIN_API_KEY/JWT_SECRET/SESSION_SECRET/ALLOWED_ORIGINS non-placeholder or process.exit(1) | `03-TRD:46-53`; `09-Security:49-68`; `F-1:90` (CR-011). CONSISTENT. |
| JWT access expiry | 15m access, 7d refresh (token expiry) | `02-PRD.md:23-24`; `03-TRD:56`; `09-Security:8-9`; `F-1:91` (CR-012). NOTE cookie maxAge differs (7d/30d) — see §3. |
| Unverified cannot log in | 403 `USER_NOT_VERIFIED` if PENDING_VERIFICATION | `02-PRD.md:21` (AC-1.2); `F-1:92` (CR-013); manifested in PT-033 bug (`DISCOVERY.md:202`). CONSISTENT. |
| BANNED cannot auth | ForbiddenException | `F-1:92`; `F6:88-91` (CR-013). CONSISTENT. |
| Daily withdraw limit | 5,000 MXN | `01-Overview:99`; `02-PRD.md:54`; `F-1:93` (CR-014); `F6:93`. CONSISTENT. |
| Withdraw needs registered payment method | Reject if referenceId not owned | `F-1` (implied); `F6:65` (CR-009). Was mocked (TD-003/H-004), fixed by PT-029. |
| Ledger immutability | ledger insert-only; corrections via ADJUSTMENT | `07-Database:240`; `11-Conventions RULE-05:271`; `10-Tech-Debt TT-002:71`; `F-1 rubric §5.2`. CONSISTENT (HARD RULE). |
| Global rate limit | 100 req/min per IP; stricter on auth/wallet/webhooks | `01-Overview:96`; `03-TRD:25-31`; `09-Security:112-123`. CONSISTENT. |
| Email enumeration prevention | forgot-password always returns success | `09-Security:149`; `F-1 §5.5`. CONSISTENT. |
| One order per auction | orders.auction_id UNIQUE (1:1) | `02-PRD.md:88`; `07-Database:147`; `inventory/entities.md:43`. CONSISTENT. |
| Auction close creates order + redistributes funds | Winner held→payment, losers released, notifications | `01-Overview` (value prop); `04-App-Flow.md:70-83`; `F6 §Nivel 3`. CONSISTENT. |

### 2.b Use cases / user flows described

Primary source `04-App-Flow.md`; also `README.md §10`, `05-UIUX-Brief`, PTSA products.
1. Register + email verify + login (`04-App-Flow §1`; PRD §1.1).
2. Cross-subdomain SSO via BFF cookie (`04-App-Flow §2`; 05-UIUX §1).
3. Browse → bid → win → auction close (`04-App-Flow §3`; PRD §1.2-1.3).
4. Wallet deposit (initiate→pay→webhook→confirm) (`04-App-Flow §4`; PRD §1.4).
5. Order → shipment → delivery → rating (`04-App-Flow §5`; PRD §1.5, 1.9).
6. Dispute → mediation → resolution → refund (`04-App-Flow §6`; PRD §1.6).
7. Admin moderation (approve/reject/suspend/force-close) (`04-App-Flow §7`; PRD §1.8).
8. KYC seller verification (`04-App-Flow §8`; PRD §1.8).
9. 2FA TOTP enable/disable; password reset (PRD §1.1; 08-API-Catalog Auth).

### 2.c Domain entities named

27 Prisma models / 20 enums — canonical list `inventory/entities.md`; full column detail `07-Database-Architecture.md`.
Core models: User, Profile, Session, Wallet, Ledger, Auction, Bid, Watchlist, Order, Payment, Shipment, Rating, Dispute, Notification. Backoffice: CommissionConfig, CommissionRecord, ModerationLog, CfdiRecord, KycSubmission, NotificationCampaign, RefundRequest, SeoConfig, CmsContent, SystemConfig. Observability: AuditEvent, ErrorEvent, RequestLog. Plus `UserPaymentMethod` added by PT-029 (`HISTORY.log:86`) — **NOT reflected in entities.md/07-Database** (gap §4).
PTSA "products" P-001..P-012 (Bid, AuctionClose, Order, Payment, WalletTransaction, Dispute, Notification, JwtToken, LedgerEntry, CommissionRecord, KycSubmission, CfdiRecord) — a semantic overlay on entities (`F-1 §3`).

### 2.d Glossary / ubiquitous-language terms

**No single glossary file exists.** Terms are defined in-line, scattered:
- "Soft-close" — `01-Overview:93`, `10-Tech-Debt TT-001:68` (defined as scheduler-logic state, NOT a DB status), `README.md:37`.
- "BFF (Backend-for-Frontend)" — `05-UIUX-Brief §1`, `09-Security §1`, `11-Conventions Pattern 3`.
- "Held funds" — `07-Database:220`, `02-PRD §1.3`.
- "Ledger" (insert-only) — `07-Database:226-240`.
- "@ironloot/core" (framework-free lib) — `06-Backend §7`, `01-Overview §Shared Library`, `11-Conventions RULE-02`.
- "PTSA product" vs "entity" — `F-1 §3`.
- Brand terms (Iron Black, Gunmetal, Gold, isotipo, bóveda) — `docs/design/Modo_Luz.md`, `Modo_Oscuro.md`.
- Methodology terms (PT-XXX, STATE 1-B/E/R, D1-D5, Health/Risk/Confidence, CR-XXX, H-XXX) — `CLAUDE.md`, `docs/methodology/*`.
**Duplication:** "soft-close" defined in 4 places (AGREE on value, but see CR-number conflict §3). See §4 — a consolidated glossary is missing.

### 2.e Architecture descriptions

- Service topology / 5-service map: `01-Overview §Service Map` (ASCII), `06-Backend §1`, `README.md §2`, `11-Conventions §1`. **Repeated 4×** — AGREE.
- API module graph: `06-Backend §2`, `inventory/components.md`. AGREE (with count discrepancy §3).
- Request pipeline (middleware→guards→controller→service→interceptor→filter): `06-Backend §3`. Single source.
- Auth architecture (JWT global guard, admin session, BFF cookie): `06-Backend §4`, `09-Security §1`, `03-TRD §3.2`, `11-Conventions Patterns 1,3,4`. AGREE.
- Domain events bus, distributed lock, @ironloot/core layers: `06-Backend §5-7`. Single source each.
- Auction lifecycle state machine: `01-Overview`, `02-PRD §1.2`, `CLAUDE.md`, `07-Database:120-122`. AGREE (SOFT_CLOSE not a DB status).

### 2.f Diagrams present

All ASCII/text (no image diagrams except design mockups). Service map (`01-Overview:27-58`, `README.md:49-59`), ERD (`07-Database:23-47`), module graph (`06-Backend:21-59`), request pipeline (`06-Backend:65-91`), flow blocks (`04-App-Flow` throughout), core lib layers (`06-Backend:156-174`), traceability chains (PTSA products). Design mockups: `docs/design/*.png` (binary, not analyzed).

---

## 3. DUPLICATION & CONFLICT FINDINGS

**CONFLICT-01 (significant) — CR-number ↔ meaning mismatch between PTSA F-1 and F6.**
`F-1_Declaracion_Valor.md:81` defines **CR-002** = "Los fondos retenidos no pueden superar el balance disponible" and `:88` **CR-009** = "La ventana de soft-close es de 120s"; `:84` CR-005 = bid-own, etc. But `F6_Funcional.md:29` defines **CR-002** = soft-close and `:65` **CR-009** = "Retiro requiere método de pago registrado". DISCOVERY.md and ROADMAP also use "CR-002 violada" to mean soft-close (`DISCOVERY.md:30`, `ROADMAP.md`). The **same CR IDs denote different rules** across the audit's own artifacts. CONFLICTING.

**CONFLICT-02 (significant) — Held-funds invariant contradiction.**
`F-1:81` CR-002 (CRÍTICA): `wallets.held_funds <= wallets.balance` (stated as a permanent invariant). This is exactly the WRONG invariant that PT-032 corrected in the PRD. `02-PRD.md:59` (AC-3.2, post-fix): "After locking, held_funds **may exceed** remaining balance — this is the expected state". `07-Database:224`: "total user funds = balance + held_funds". So F-1's CR-002 CONFLICTS with the corrected PRD AC-3.2 and 07-Database. The finding that fixed the PRD (H-007/PT-032) did NOT propagate to F-1. CONFLICTING.

**CONFLICT-03 — CSRF protection: exists or not?**
`CLAUDE.md` (Key Technical Decisions): "Helmet + **CSRF double-submit cookies** + strict CSP". `CHANGELOG.md:28`: "CSRF: Added Double-Submit Cookie protection for state-changing requests". BUT `09-Security-Architecture.md:104-108` §6: "No double-submit CSRF tokens needed on BASE/CLIENT" and `:70` "CSRF: mitigated by JWT Bearer tokens... sameSite: Lax"; `03-TRD:70` same. CONFLICTING (CLAUDE.md+CHANGELOG assert a mechanism the security doc says is absent/unnecessary).

**CONFLICT-04 — PTSA product ID for CFDI.**
`F-1:66-68` defines **P-009 = Ledger Entry** and **P-012 = CFDI Record**. But `RESUMEN.md:43` lists H-005 under "**P-009** CfdiRecord", and `Hallazgos/H-005.md` frontmatter `producto_id: P-009`. Product file `P-009_LedgerEntry.md` exists separately from `P-012_CfdiRecord.md`. So H-005 is mis-linked to P-009(Ledger) instead of P-012(CFDI). CONFLICTING internal reference.

**CONFLICT-05 — API feature-module count.**
`CLAUDE.md`: "27 feature modules". `06-Backend:35` header "Feature Modules (27)" but the tree lists **23**. `inventory/components.md:27` "Feature Modules (27 total)" but table lists **23** rows. `entities.md:65` separately says "Total models: 27". The "27" appears conflated with the model count; actual feature modules enumerated = 23. INCONSISTENT count.

**CONFLICT-06 — Admin module count.**
`CLAUDE.md` / `06-Backend:190`: "18 feature modules". `inventory/components.md:82`: "Total admin modules: 19 (including AppModule)". Off-by-one framing (18 features + AppModule = 19). Minor INCONSISTENCY.

**CONFLICT-07 (minor) — Cookie lifetime vs JWT expiry.**
`04-App-Flow:32-33` & `09-Security:26-27`: access_token cookie 7 days, refresh_token cookie 30 days. `02-PRD:23-24` & `03-TRD:56` & `09-Security:8-9`: JWT access expires 15m, refresh 7d. Different axes (cookie maxAge vs token TTL) but never reconciled in one place; a reader may read them as contradictory. Potentially misleading.

**CONFLICT-08 (minor) — Logo symbol composition.**
`Modo_Luz.md:59` shield = "I + bóveda + sistema de protección". `Modo_Oscuro.md:34-39` shield = "I + candado (lock) + bóveda". Slight divergence in described symbol elements.

**DUPLICATION (consistent, redundant) — the following are stated in ≥2 places and AGREE:**
- **Endpoints:** `08-API-Catalog.md` ≈ `inventory/endpoints.md` (latter adds audit-event & drops rate-limit prose). Near-total overlap.
- **Routes/pages:** `05-UIUX-Brief §4-6` ≈ `inventory/routes.md` ≈ `README.md §10`. Triple overlap.
- **Entities/enums:** `07-Database-Architecture.md` ≈ `inventory/entities.md`. Overlap.
- **Modules:** `06-Backend §2` ≈ `inventory/components.md`. Overlap.
- **Service map:** `01-Overview`, `06-Backend §1`, `README.md §2`, `11-Conventions §1`. Quadruple.
- **PTSA current-state:** `RESUMEN.md` ≈ `ESTADO_ACTUAL.md` (scores, findings, FDGE state table restated). Near-duplicate by design (one is summary, one is state).
- **Business-rule tables:** `01-Overview:91-99` ≈ `03-TRD §2-3` ≈ `09-Security §7` (rate limits) ≈ `F-1 §4`. Overlapping partial restatements, consistent.

---

## 4. GAPS (referenced but thin/missing)

1. **No consolidated glossary / ubiquitous-language file.** Terms (soft-close, BFF, held funds, PTSA-product vs entity) are defined ad hoc across many docs (§2.d). Foundation Protocol produced no glossary doc.
2. **`UserPaymentMethod` model undocumented.** Added by PT-029 (`HISTORY.log:86`, schema + migration) but absent from `inventory/entities.md` and `07-Database-Architecture.md`. The DB docs are already out of date vs the schema (created via `db push`, no formal migration — `HANDOFF.md:115`).
3. **10-Technical-Debt.md is stale.** ND-002 (throttler in-memory) resolved by PT-030; TD-003 (withdraw mock) resolved by PT-029; yet TD/ND entries remain listed as open. `inventory/integrations.md:68,102` still says throttler storage "TBD (TD-002)" and BullMQ queues "not inventoried (ND-006)". No delta applied post-fix.
4. **PTSA product cards (`P-*.md`) never advanced past BORRADOR.** `P-001_Bid.md` still `estado: BORRADOR`, `confidence: 0`, invariants "⏳ Pendiente F6" — even though F6 ran and verified those CRs. Product-level validation state not synced with phase results.
5. **Status skew across FDGE tracking docs.** `DISCOVERY.md` marks PT-033/PT-034 as `DISCOVERY_PENDING` while `HISTORY.log` + `HANDOFF.md` mark them CLOSED. `PENDING_TASKS.md` lists PT-026/029/030 atomic tasks as PENDING in one block and DONE in "Completados". Working docs not reconciled after completion.
6. **CHANGELOG stops at v0.5.1 (Jan 2026).** No entries for v1.0.0 or any PT-026..PT-035 work; it still documents the removed legacy `web/` frontend. Effectively abandoned as a changelog.
7. **WebSocket event payload schemas undocumented.** `08-API-Catalog §WebSocket` and `10-Tech-Debt ND-001` list event names (`bid.new`, `auction.extended`, `auction.closed`) but no payload schema; sourced only from CLAUDE.md, unverified.
8. **Email templates location unknown** (`10-Tech-Debt ND-003`) — referenced, never located.
9. **Test coverage thresholds unknown** (`ND-004`); feature-flags impl (`ND-005`), BullMQ queues/processors (`ND-006`) uninventoried.
10. **CFDI/PAC domain gap** (H-005/TD-001): fiscal invoicing non-functional; blocks legal commercial operation in Mexico (`Hallazgos/H-005.md`, `10-Tech-Debt TD-001`). Documented but unresolved (PT-027 BLOQUEADO — no PAC selected).
11. **No architecture-decision-record (ADR) trail** beyond `11-Conventions Delta Log` (which has only the initial-run row). Tradeoffs live in `10-Tech-Debt TT-00x` but design rationale per PT lives only in `changes/*/design.md`.
12. **PTSA F0-F5, F7-F12 phase files not deep-read here** (flagged "not read in full" in §1.7) — classification is confident but their internal claims were not cross-checked for further conflicts; a full pass may surface more CR/product mismatches like CONFLICT-01/04.

---

*End of A-docs-inventory.md*
