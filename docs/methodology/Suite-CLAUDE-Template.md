# Suite CLAUDE.md — Template de Integración

> Texto listo para copiar y pegar en el `CLAUDE.md` de cualquier repositorio.
> Incluye los cuatro componentes de la suite: Foundation Protocol + FDGE + PTSA + FPGE.
> Agrega estas secciones **después** de las secciones propias del proyecto (Project Overview,
> Development Commands, Architecture, etc.).
>
> Referencia canónica: `docs/methodology/`
> Versión: 2026-06-19

---

# Part N — Foundation Protocol: Reverse-Engineering Prerequisite

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

# Part N+1 — FDGE: Framework de Desarrollo Gobernado por Evidencia

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
Strategy and atomization may be condensed. Use STATE 1-EXPRESS path (see `instrucctions.md`).

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

Artifacts: `DISCOVERY.md`, `CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Expand the request: What / Where / When / How / Why (if known).
4. Document reproduction steps, expected behavior, actual behavior.
5. Identify affected users, business impact.
6. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
7. Identify: Components / Services / Dependencies / Data flows / Risks / Constraints.
8. Record Root Cause Confidence (%), Architecture Confidence (%), Solution Confidence (%).

Output: Append entries to `DISCOVERY.md`, `CONTEXT_ANALYSIS.md`.

STOP. Wait for explicit human ACK.
Forbidden: Solution design, code modification, task execution.

#### Investigation Gate
If any condition exists: root cause unknown · architecture impact unknown · dependencies unknown ·
confidence below 70% — classify as INVESTIGATION immediately. Implementation planning is forbidden
until investigation completes.

### STATE 1-E — Enrichment & Architecture (FEATURE)

Artifacts: `ENRICHMENT.md`, `CONTEXT_ANALYSIS.md`

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

Output: Create or overwrite `ENRICHMENT.md`.

STOP. Wait for explicit human ACK.
Forbidden: Proposal design, code modification, task execution.

### STATE 1-R — Scope & Architecture (REFACTOR)

Artifacts: `REFACTOR_SCOPE.md`, `CONTEXT_ANALYSIS.md`

Actions:
1. Generate a new PT-XXX identifier.
2. Classify complexity.
3. Define scope:
   - What changes and what does NOT change (explicit boundary).
   - Quality bar: the measurable threshold that proves the refactor is complete.
   - Regression risk: which behaviors must be preserved exactly.
4. Consult `docs/enterprise-documentation/` (architecture, PRD, TRD, Conventions, Graphify).
5. Identify: coupling, test coverage gaps, breaking change risk, rollback strategy.

Output: Create or overwrite `REFACTOR_SCOPE.md`.

STOP. Wait for explicit human ACK.
Forbidden: Solution design, code modification, task execution.

### STATE 2 — Classification & Strategy

Artifact: `PLAN_ACTUAL.md`

Design the strategy. Required sections: Objective · Proposed solution · Alternatives considered ·
Alternatives rejected · Dependencies · Risks · Constraints · Success criteria.

Mandatory Regression Analysis: explicitly identify what may break, affected workflows, services, APIs,
UI flows, data integrity risks.

Output: Overwrite `PLAN_ACTUAL.md`.

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

Output: `changes/[PT-ID]-[slug]/` (full package) + update `PENDING_TASKS.md`.

**PROPOSAL GATE — STOP. Wait for explicit human ACK before opening any git branch.**
The agent may not create a branch, modify source code, or begin implementation until the human
approves the Proposal Package. This is an absolute gate with no exceptions.

For TRIVIAL: `PLAN_ACTUAL.md` is sufficient; Proposal Package is not required.

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
May be marked `CLOSED` after findings are documented in `DISCOVERY.md`.

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
* Active `ENRICHMENT.md` / `DISCOVERY.md` / `REFACTOR_SCOPE.md`
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

# Part N+2 — PTSA V3: Continuous Audit & Certification Framework

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

# Part N+3 — FPGE: Priorización Gobernada por Evidencia

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
in-flight `PLAN_ACTUAL.md` / `PENDING_TASKS.md` · `changes/[PT-ID]-[slug]/` (existing Proposal Packages).

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

A full run ends by emitting `ROADMAP.md` (all items `PROPUESTO`) and **stopping**.
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
