# FDGE — Tracker Maestro de Hallazgos de Auditoría

**Propósito:** no perder ningún hallazgo `AUD-*` de la auditoría (2026-07-23, ver `docs-v2/transversal/Registro-de-Hallazgos.md`) durante su paso por FDGE. Se procesa **un PT a la vez** por el pipeline (STATE 1→7). Este archivo se actualiza en cada transición de estado (overwrite del estado/status; la traza detallada vive en DISCOVERY/ENRICHMENT/REFACTOR_SCOPE, PLAN_ACTUAL, changes/, HISTORY.log).

**Fuente de conocimiento por PT:** `docs-v2/` (Reglas `RN-*`, Dominio, ADR, Trazabilidad) + Graphify + HISTORY.log/HANDOFF.md + evidencia `audit/raw/`.

**Estados:** `PENDIENTE` (sin iniciar) · `STATE 1..7` · `VALIDATION_PENDING` · `CLOSED` · `DONE`.

## En proceso / cola crítica

| Orden | AUD | Título | PT | Tipo FDGE | Complejidad | STATE | Status |
|:--:|---|---|---|---|---|---|---|
| 1 | AUD-004 | Creds admin default + login sin throttle | **PT-036** | BUG (seguridad) | STANDARD | **CLOSED** | Validado; listo merge |
| 2 | AUD-001 | ~46% modelos sin migración (real 39%: 11/28 + drift de columnas) | **PT-037** | BUG/REFACTOR | MAJOR | **CLOSED** | Validado; baseline pendiente en dev real |
| 3 | AUD-003 | Escrituras CLIENT sin auth (BFF) + mismatches ruta | **PT-038** | BUG | MAJOR | **CLOSED** | Validado; e2e pendiente |
| 4 | AUD-002 | UI de puja + cliente Socket.io | **PT-044** | FEATURE | MAJOR | **CLOSED** | Página `/auctions/:id` + feed Socket.io + puja vía BFF (e2e con stack pendiente) |
| 5 | AUD-005 | Doble mecanismo de comisión | **PT-042** | REFACTOR | MAJOR | **CLOSED** | Cobro usa tasa configurable (CommissionsService.resolveRatePercent) |

## Backlog (ALTA)

| AUD | Título | Tipo previsto | PT | Status |
|---|---|---|---|---|
| AUD-006 | WebSocket sin auth | BUG | **PT-039** | **CLOSED** — público read-only por diseño + validación UUID + sin PII |
| AUD-007 | ADMIN sin Helmet/CSP/CSRF | BUG/FEATURE | **PT-040** | **CLOSED** — Helmet+CSP + sesión SameSite=Lax |
| AUD-008 | payments.currency default USD | BUG/REFACTOR | PT-037 | **CLOSED** (en la migración de PT-037) |
| AUD-009 | Incremento mínimo de puja no aplicado | BUG | **PT-041** | **CLOSED** — `bidAmount >= currentPrice + AUCTION_MIN_INCREMENT_AMOUNT` + test |
| AUD-010 | Resolución de disputa no mueve dinero | FEATURE/BUG | **PT-042** | **CLOSED (doc)** — flujo de dos pasos intencional (resolver → reembolsar en Refunds); auto-refund = enhancement |
| AUD-011 | Admin salta máquinas de estado | REFACTOR | **PT-041** | **CLOSED** — guard: no moderar subastas CLOSED/CANCELLED (overrides admin siguen siendo intencionales) |
| AUD-012 | Use-cases core no cableados | REFACTOR/INVEST. | **PT-042** | **CLOSED** — eliminados los 4 use-cases muertos (core 134 tests) |
| AUD-013 | commissions/refunds sin tests | REFACTOR (tests) | **PT-042** | **CLOSED** — +10 tests (commissions 5, refunds 5) |
| AUD-014 | Contradicción CSRF | INVESTIGATION | **PT-040** | **CLOSED** — postura: Bearer+SameSite; ADMIN sesión SameSite=Lax |
| AUD-015 | Invariante held-funds en PTSA F-1 | DOC | **PT-046** | **CLOSED (doc)** — `docs-v2` RN-21 enuncia la invariante correcta; PTSA queda como histórico |
| AUD-016 | CFDI/PAC no funcional | FEATURE (bloqueante) | **PT-046 + PT-047** | **CLOSED (toggle) / externo (PAC)** — PT-047 añade interruptor `CFDI_ENABLED` (OFF por defecto): `generate()` responde 503 claro, admin puede prender/apagar CFDI desde UI. La integración real del PAC sigue siendo externa (elegir PAC + credenciales + implementar `ICfdiPacProvider`) |

## Backlog (MEDIA / BAJA)

Resueltos: **AUD-025**/**AUD-026** (PT-040), **AUD-017**/**AUD-018**/**AUD-027** (PT-043), **AUD-032** (puerto admin + plantilla huérfana, PT-046).
**AUD-019/020/021/022/023/024/029/030/031/034/035/036 → CLOSED (doc)**: reconciliados/superados por la documentación oficial `docs-v2/` (Diccionario, Reglas, Dominio, ADR, Registro). PTSA original queda como histórico.
Cerrados en PT-047: **AUD-028** (CI raíz — añadidos scripts `lint:check`/`typecheck`/`test`/`test:e2e`/`build` + `postinstall` que delegan a `src/api`), **AUD-033** (endpoint muerto comentado eliminado). **AUD-016** cerrado como toggle (interruptor `CFDI_ENABLED`); la integración real del PAC permanece como dependencia externa (elección de PAC + credenciales).

## Items sueltos capturados (no-AUD)

| Item | Origen | Nota |
|---|---|---|
| Build error `TS2307 express-session` en ADMIN | `HANDOFF.md:117` | Pre-existente; candidato a PT propio (posible relación con AUD-007 config admin). No perder. |

---
*Actualizado: 2026-07-23 — **REMEDIACIÓN COMPLETA**. 36/36 hallazgos resueltos (código o doc). PTs 036–047. AUD-016 cerrado como toggle `CFDI_ENABLED` (la integración real del PAC queda como dependencia externa cuando se contrate). AUD-028 (CI) y AUD-033 (código muerto) cerrados en PT-047. Verificación final: API tsc 0 + **181 tests** · core 134 · CLIENT/ADMIN build OK. Informe: `docs-v2/Informe-Remediacion.md`. Pendiente de entorno: e2e con stack, baseline migración en dev, contratación de PAC para CFDI real.*
