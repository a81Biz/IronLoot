# PT-140 — Design: doce almacenes de pendientes, ningún punto de cierre

**Tipo**: REFACTOR · **Complejidad**: STANDARD · **Origen**: pregunta del humano — *«siempre quedan
cosas por hacer y nunca se cierran completo»*
**Depende de**: PT-136

## La respuesta a la pregunta es estructural, no de disciplina

**Un pendiente puede vivir hoy en doce sitios, y ninguno declara cuál manda.**

| # | Almacén | Qué guarda | Guarda automática |
|---|---|---|:--:|
| 1 | `docs/implementation/PENDING_TASKS.md` | Índice FDGE | — |
| 2 | `docs/implementation/MATRIZ-DEUDA-TECNICA.md` | «El documento que manda», según el #1 | — |
| 3 | `docs/implementation/HANDOFF.md` | Riesgos, deuda, próximas acciones | — |
| 4 | `docs/implementation/DISCOVERY.md` | Los `F-XXX` dentro de § Revisión U-00N | — |
| 5 | `docs/implementation/HISTORY.log` | `Status: VALIDATION_PENDING` | — |
| 6 | `docs/implementation/ROADMAP.md` | FPGE | — |
| 7 | `docs/implementation/FDGE_HALLAZGOS_TRACKER.md` | Hallazgos FDGE | — |
| 8 | `changes/PT-XXX/tasks.md` | Estado por tarea atómica | — |
| 9 | `PTSA/PENDIENTES.md` | Bloqueantes por sesión | — |
| 10 | `PTSA/Hallazgos/` + `ESTADO_ACTUAL.md` + `RESUMEN.md` | Hallazgos de auditoría | — |
| 11 | `docs/enterprise-documentation/10-Technical-Debt.md` | `TD-XXX` | **sí** (PT-103) |
| 12 | `docs-v2/Informe-Remediacion.md` | Hallazgos de julio | — |

**Uno de doce tiene guarda.** Cerrar algo exige hoy hasta doce escrituras y once son voluntarias.

## Lo que eso produjo, medido el 2026-07-28

| Registro | Dice | Realidad, verificada en la fuente |
|---|---|---|
| `PENDING_TASKS.md:23` | `PT-104` PENDING | **Hecho**: `71-paypal-guaranteed.js:236-258` cuenta asientos del ledger, no deltas de saldo |
| `PENDING_TASKS.md:24` | `TD-014` PENDING | **Cerrada por PT-105**: `10-Technical-Debt.md:289-292` |
| `PENDING_TASKS.md:32` · `HANDOFF.md:49` | «falta empujar `master`» | **Empujado**: `0 0` ahead/behind |
| `PENDING_TASKS.md:91-167` | PT-127…130 `BLOCKED`, «ningún fichero de código tocado» | **Los cuatro fusionados**. **44 filas mienten** |
| `PENDIENTES.md:152` | ADMIN sin favicon | **Hecho**: `favicon.svg` + `admin.html:7` |
| `HANDOFF.md:50` | «los siete jobs» | Son **ocho** |
| `HISTORY.log` | — | **PT-129 y PT-130 no tienen entrada.** Salta de 128 a 131, con evidencia y commits de los dos |
| `ROADMAP.md:3` | `Health 86.1 · Clase C · Risk 100` | Hoy `95.5 · Clase A · Risk 24`. Del **23-jun** |
| `PTSA/PENDIENTES.md` | 7 bloques apilados | El mismo pendiente aparece **cinco veces** |
| `10-Technical-Debt.md:103-105` | «**Queda `styleSrc`**… registrado aparte como TD-014» | Se contradice a sí mismo: TD-005 «cerrada del todo» 14 líneas antes, TD-014 cerrada en `:289` |

**Ninguna de estas filas es trabajo sin hacer. Todas son trabajo hecho que ningún registro recogió.**

## Decisiones de arquitectura

### D1 — Una regla de precedencia, escrita

Sin ella, lo demás se vuelve a desincronizar en un mes. Propuesta:

| Clase de pendiente | Manda | Derivados (no se editan a mano) |
|---|---|---|
| Trabajo FDGE en curso o pendiente | **`PENDING_TASKS.md`** | `HANDOFF.md` |
| Trabajo terminado | **`HISTORY.log`** (append-only) | todo lo demás |
| Deuda técnica | **`10-Technical-Debt.md`** (`TD-XXX`) | `MATRIZ-DEUDA-TECNICA.md` |
| Hallazgos de auditoría | **`PTSA/Hallazgos/H-XXX.md`** | `ESTADO_ACTUAL.md`, `RESUMEN.md` |
| Bloqueantes de auditoría | **`PTSA/PENDIENTES.md`**, un solo bloque vivo | — |
| Priorización | **`ROADMAP.md`** | — |

`FDGE_HALLAZGOS_TRACKER.md`, `MATRIZ-HALLAZGOS-*.md` y `docs-v2/Informe-Remediacion.md` pasan a
**histórico explícito**: se leen, no se actualizan.

### D2 — La guarda comprueba sólo lo determinista

`coherencia-de-registros.spec.ts`, de la familia de `coherencia-deuda-tecnica.spec.ts`:

1. `PT-XXX` marcado `PENDING`/`BLOCKED` en `PENDING_TASKS.md` ⇒ **no** aparece con `Status: DONE` ni
   `VALIDATION_PENDING` en `HISTORY.log`.
2. `PT-XXX` con carpeta en `docs/implementation/evidence/` ⇒ **tiene** entrada en `HISTORY.log`.
   **Esto solo habría cazado PT-129 y PT-130.**
3. `TD-XXX` declarada cerrada en `10-Technical-Debt.md` ⇒ no figura pendiente en `PENDING_TASKS.md`.

**Nada de prosa.** Una guarda que obliga a redactar de cierta forma para pasar es peor que ninguna: la
gente aprende a escribir para el linter y el documento deja de decir la verdad. Ésa es la razón de que
la contradicción de `10-Technical-Debt.md:103-105` no la cace nadie — y se acepta, porque el remedio
sería peor.

### D3 — `HISTORY.log` no se reescribe

Es append-only por FDGE STATE 7 y se respeta. Las entradas que faltan (PT-129, PT-130) **se añaden al
final**, fechadas hoy y diciendo a qué fecha corresponden. Reordenarlo para que quede bonito sería
falsificar el registro que este PT existe para hacer fiable.

### D4 — `PTSA/PENDIENTES.md` es estado, no log

Hoy se comporta como log sin serlo: siete bloques apilados, ninguno podado, el mismo pendiente cinco
veces. PTSA declara que `ESTADO_ACTUAL.md` y `RESUMEN.md` se **sobrescriben** y sólo `AUDIT_LOG.md` es
append-only. `PENDIENTES.md` pertenece a la primera clase.

Los seis bloques anteriores van a `PTSA/archive/`, **enlazados**. `[A6]` — inmutabilidad auditable —
se cumple archivando, no borrando.

### D5 — `ROADMAP.md`: regenerar o retirar

Es del 23-jun, declara Clase C y Risk 100 cuando hoy es Clase A y Risk 24. **FPGE no se ha vuelto a
ejecutar nunca**, y es el framework cuyo trabajo es decidir qué sigue. Ésa es la causa mecánica de la
acumulación: el bucle `FDGE → PTSA → FPGE → FDGE` está roto en su tercer eslabón.

Dos salidas honestas: correr FPGE de verdad sobre el estado de hoy, o retirar el fichero con su razón
escrita. **Lo que no vale es dejarlo.** Un roadmap de hace cinco semanas que declara una clase que ya
no existe es peor que ninguno, porque se lee con confianza.

**Recomendación**: correrlo. Con este plan hay seis PT y un H-005 abierto — hay material.

### D6 — Lo que se marque hecho lleva cita

Disciplina de PT-090, que ya reconstruyó este mismo fichero una vez. La diferencia es que PT-090 no
dejó mecanismo, y F-33 encontró que el registro había vuelto a mentir **tres PT después**. Este PT
deja la guarda.

## El riesgo que hay que decir en voz alta

**R3 — que este PT marque hecho algo que no lo está.** Sería el defecto que corrige, cometido dentro
del PT que lo corrige. Mitigación: cita `fichero:línea` verificada por cada cambio de estado, **más**
la guarda, que es la pieza que PT-090 y PT-103 no tuvieron.

## Lo que este PT NO decide

- **No fusiona los frameworks.** FDGE, PTSA y FPGE siguen con sus artefactos separados; se declara la
  precedencia entre ellos, que hoy no existe.
- **No cierra hallazgos PTSA.** `[R44]`: los cierra el humano.
- **No decide el árbol documental.** Eso es PT-141.
