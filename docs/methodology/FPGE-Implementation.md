# FPGE-Implementation — Framework de Priorización Gobernada por Evidencia

> Responde: **¿Cómo se materializa FPGE dentro de un repositorio?**
> Método (filosofía y reglas): [Framework-FPGE.md](Framework-FPGE.md).
> Marcos hermanos: [FDGE-Implementation.md](FDGE-Implementation.md) · [PTSA/PTSA-V3-Especificacion-Oficial.md](PTSA/PTSA-V3-Especificacion-Oficial.md).

---

## Objetivo de la implementación

Convertir el estado de evidencia del proyecto (auditoría PTSA + historia FDGE) en **una decisión
trazable de qué construir a continuación**, lista para entregarse a FDGE como tareas PT-XXX, sin que
FPGE escriba jamás en los artefactos de los otros dos marcos.

FPGE asume lo mismo que FDGE: el agente actual no estará en la próxima sesión, la memoria conversacional
es temporal, y toda decisión importante debe persistirse en disco.

---

## Estructura de carpetas / artefactos

FPGE vive **junto a FDGE** (`docs/implementation/`) porque su salida alimenta a FDGE. No requiere una
carpeta nueva de alto nivel.

```text
docs/
└── implementation/
    ├── ROADMAP.md              # Artefacto vivo: roadmap priorizado (se SOBRESCRIBE en cada corrida)
    ├── ROADMAP_HISTORY.log     # Append-only: una entrada por corrida y por promoción/decisión
    ├── HISTORY.log             # (FDGE — FPGE lo LEE, no lo modifica) · incluye Branch y Delta real vs planificado
    ├── HANDOFF.md              # (FDGE — FPGE lo LEE, no lo modifica)
    ├── ENRICHMENT.md           # (FDGE — FPGE lo LEE, no lo modifica) · features enriquecidos pendientes
    ├── REFACTOR_SCOPE.md       # (FDGE — FPGE lo LEE, no lo modifica) · refactors con scope definido
    ├── PLAN_ACTUAL.md          # (FDGE — FPGE lo LEE, no lo modifica) · solo trabajos TRIVIAL activos
    ├── PENDING_TASKS.md        # (FDGE — FPGE lo LEE, no lo modifica)
    └── evidence/PT-XXX/        # (FDGE)

changes/
└── PT-XXX-slug/                # (FDGE Proposal Packages — FPGE los LEE, no los modifica)
    ├── design.md
    ├── tasks.md
    ├── spec-changes.md
    ├── test-scenarios.md
    └── out-of-scope.md

PTSA/                           # (PTSA — FPGE lo LEE, no lo modifica)
    ├── RESUMEN.md
    ├── Hallazgos/H-XXX.md
    ├── Productos/P-XXX.md
    └── score-history.json
```

**Regla de escritura de FPGE:** solo `ROADMAP.md` (sobrescribir completo) y `ROADMAP_HISTORY.log`
(append-only). Cualquier otra escritura está prohibida.

---

## Trigger y prompts oficiales

FPGE se activa **solo** ante invocación explícita. En ausencia de trigger, opera como asistente normal.

### Prompt oficial — corrida completa
```
[START FPGE]
Actúa como priorizador gobernado por evidencia.
1. Verifica PTSA/score_freshness. Si STALE/UNKNOWN, recomienda un delta sync PTSA antes de confiar en el orden.
2. Lee evidencia: PTSA (RESUMEN, Hallazgos activos, Productos, score-history) y FDGE (HISTORY.log, HANDOFF.md).
3. Sintetiza candidatos. Cada candidato DEBE citar su evidencia de origen.
4. Calcula Priority por candidato (algoritmo de Framework-FPGE). Ordena con los desempates definidos.
5. Sobrescribe ROADMAP.md (todos los ítems en PROPUESTO). Declara los 3 de mayor impacto y los 3 quick wins.
6. Appendea la corrida a ROADMAP_HISTORY.log. DETENTE — no promuevas nada.
```

### Prompt oficial — promover a FDGE
```
promote FPGE R-XXX
Marca R-XXX como APROBADO→PROMOVIDO en ROADMAP.md, asígnale un PT-XXX nuevo y entrégalo a FDGE STATE 1
con su evidencia de origen y racional como contexto inicial. El tipo del ítem determina la variante:
  BUG         → STATE 1-B (Discovery)
  FEATURE     → STATE 1-E (Enrichment) — usar racional del ítem como punto de partida
  REFACTOR    → STATE 1-R (Scope Definition)
  INVESTIGATION → STATE 1-B (Discovery, modo investigación)
Registra la promoción en ROADMAP_HISTORY.log.
```

### Prompt oficial — estado
```
status FPGE
Reporta el ROADMAP.md vigente: ranking, estado de cada ítem (PROPUESTO/APROBADO/PROMOVIDO/DESCARTADO/DIFERIDO)
y PT-XXX asignados. No recalcules ni sobrescribas.
```

---

## El proceso paso a paso

```
[1] Freshness gate
    └─ Leer PTSA/RESUMEN.md → score_freshness. Si STALE/UNKNOWN: anotar advertencia en ROADMAP.md
       y recomendar `resume PTSA` (delta sync) antes de tomar decisiones irreversibles.

[2] Recolección de evidencia (read-only)
    ├─ PTSA: hallazgos ACTIVOS (ABIERTA/REABIERTA) con dimensión, severidad, impacto, probabilidad.
    ├─ PTSA: productos en RECHAZADO_DOMINIO / REQUIERE_REVISION.
    ├─ PTSA: score-history.json → tendencia por dimensión (estancada / en regresión).
    ├─ FDGE: HANDOFF.md → bugs abiertos, validaciones pendientes, recommended next actions.
    ├─ FDGE: HISTORY.log → deuda diferida, ítems pospuestos que reinciden, branches abiertas, deltas real vs planificado.
    ├─ FDGE: ENRICHMENT.md → features ya especificados (criterios, escenarios, NFRs) pero aún sin implementar → candidatos con definición adelantada.
    ├─ FDGE: REFACTOR_SCOPE.md → refactors ya scoped pero pendientes → candidatos con motivación técnica documentada.
    └─ FDGE: changes/ → Proposal Packages existentes → evitar proponer trabajo ya planificado o con propuesta aprobada.

[3] Síntesis de candidatos
    └─ Un candidato R-XXX por unidad de trabajo accionable. Fusionar duplicados
       (p. ej. varios hallazgos del mismo producto → un ítem de corrección con varias evidencias).

[4] Cálculo de Priority
    └─ Priority = (EvidenceWeight × ScoreImpact × Urgency × DomainMultiplier) / Effort
       Estimar Effort con graphify/acoplamiento si está disponible; si no, declarar el supuesto.

[5] Orden y desempates
    └─ Mayor Priority → D1 antes que D2/D3/D4 → mayor riesgo de no hacer → menor id.

[6] Emisión
    └─ Sobrescribir ROADMAP.md. Declarar Top-3 impacto y Top-3 quick wins. Todos en PROPUESTO.
    └─ Append a ROADMAP_HISTORY.log: fecha, evidencia leída (versión/score), nº de candidatos, top items.

[7] STOP — esperar decisión humana.
```

---

## Schema de `ROADMAP.md`

```markdown
# ROADMAP — Priorización Gobernada por Evidencia (FPGE)
**Corrida:** <YYYY-MM-DD> · **Basado en:** PTSA Score <Health>/<Clasif> (freshness <FRESH/STALE>) · HISTORY.log @ <último PT>
**Advertencias:** <p. ej. "Score STALE: recomendado `resume PTSA` antes de promover"> | ninguna

## Top 3 — Mayor impacto
1. R-003 — <título> (D1, ΔHealth +15)
2. ...

## Top 3 — Quick wins
1. R-007 — <título> (esfuerzo S, ΔHealth +5)
2. ...

## Roadmap completo
| Rank | ID | Tipo | Título | Origen | Producto/Dim | ΔScore | Esf. | Riesgo no hacer | Priority | Estado | PT |
|:--:|:--:|:--|:--|:--|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| 1 | R-003 | DOMAIN/BUG | Regenerar P-008 con guardrails | H-008 | P-008 / D1 | +15 | M | ALTO | 36.0 | PROPUESTO | — |
| 2 | R-001 | REFACTOR | ... | HISTORY PT-150 | — / D2 | +5 | S | MEDIO | 12.0 | PROPUESTO | — |

## Racional por ítem
### R-003 — Regenerar P-008 con guardrails
**Evidencia:** H-008 (D1, ALTA, riesgo 9), producto P-008 en RECHAZADO_DOMINIO.
**Por qué ahora:** D1=75 tapa el ascenso a A+; este ítem es el de mayor ΔHealth y es de dominio.
**Definición de hecho:** `validacion_estado='aprobado'` verificado en BD (lo confirma PTSA en delta sync).
```

---

## Promoción a FDGE (cómo un R-XXX se vuelve PT-XXX)

1. El humano revisa `ROADMAP.md` y marca ítems `APROBADO` / `DIFERIDO` / `DESCARTADO`.
2. Por cada `APROBADO`, ejecutar `promote FPGE R-XXX`:
   * Se asigna un `PT-XXX` nuevo.
   * Se entrega a **FDGE STATE 1**, variante según tipo:
     - `BUG` → STATE 1-B (Discovery) — evidencia de origen como contexto inicial.
     - `FEATURE` → STATE 1-E (Enrichment) — racional del ítem como punto de partida; FDGE expande criterios de aceptación, escenarios y out-of-scope.
     - `REFACTOR` → STATE 1-R (Scope Definition) — motivación técnica del ítem como contexto inicial.
     - `INVESTIGATION` → STATE 1-B (Discovery, modo investigación).
   * El ítem pasa a `PROMOVIDO` con su `pt_asignado`.
3. FDGE corre su ciclo normal (State 1 → Proposal Gate [ACK humano] → Implementación → Validación → History/Handoff).
   Al cerrar (STATE 7), FDGE registra en `HISTORY.log` incluyendo branch y delta real vs planificado;
   si el PT corrige un hallazgo PTSA, anota la referencia `[PTSA: H-XXX]` (convención heredada del modelo de interacción).
4. En la siguiente auditoría/delta sync, PTSA re-evalúa el producto y actualiza el Score.
5. La próxima corrida FPGE ve el nuevo estado y reordena. **El ciclo se cierra.**

---

## Registro histórico (`ROADMAP_HISTORY.log`)

Append-only. Una entrada por corrida y por decisión:

```
## <YYYY-MM-DD> — Corrida FPGE
- Basado en: PTSA Health <n>/<clasif>, freshness <estado>, HISTORY @ <PT>
- Candidatos: <n>. Top impacto: R-003, R-005, R-009. Top quick wins: R-007, R-001, R-012.

## <YYYY-MM-DD> — Promoción
- R-003 APROBADO → PT-201 (FDGE STATE 1). Evidencia: H-008/P-008.
- R-010 DESCARTADO. Motivo: <…>.
```

---

## Integración con CI / cadencia

FPGE es **a petición**, no continuo — pero conviene dispararlo en momentos naturales del ciclo:

* Después de cada **delta sync de PTSA** (cuando el Score cambió → el orden puede cambiar).
* Al **inicio de un sprint/planeación** (para decidir qué entra).
* Cuando `HANDOFF.md` acumula "recommended next actions" sin atender.

No requiere un workflow de CI propio; se beneficia de los checkpoints de PTSA (que mantienen el Score
fresco, su entrada principal).

---

## Portabilidad — implementar FPGE desde cero en otro proyecto

FPGE es agnóstico al dominio y al stack. Para adoptarlo en un repositorio nuevo:

1. **Prerrequisitos:** tener FDGE operando (produce `HISTORY.log`, `HANDOFF.md`, `ENRICHMENT.md`, `REFACTOR_SCOPE.md`
   y `changes/` con Proposal Packages) y PTSA operando (produce `RESUMEN.md`, `Hallazgos/`, `score-history.json`).
   FPGE no aporta valor sin al menos uno de los dos.
2. Copiar `Framework-FPGE.md` y este archivo a `docs/methodology/`.
3. Crear `docs/implementation/ROADMAP.md` (vacío con el encabezado del schema) y `ROADMAP_HISTORY.log`.
4. Añadir a `CLAUDE.md` la sección de ruleset vinculante de FPGE con su Trigger Rule (ver la suite README).
5. Ajustar las rutas de entrada si el proyecto coloca los artefactos FDGE/PTSA en otra ubicación.
6. Disparar la primera corrida con `[START FPGE]` y validar que el orden propuesto cita evidencia real.

El algoritmo de priorización y los estados de ítem son universales; lo único específico del proyecto son
las **rutas** de los artefactos de entrada.
