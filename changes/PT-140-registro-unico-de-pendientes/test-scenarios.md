# PT-140 — Escenarios de prueba

## La guarda: `coherencia-de-registros.spec.ts`

### Comprobación 1 — `PENDING_TASKS.md` ↔ `HISTORY.log`

| # | Escenario | Esperado |
|---|---|---|
| C1-01 | **RED inicial** | **Falla**, nombrando `PT-104`, `TD-014` y los PT-127…130 marcados `BLOCKED` estando fusionados |
| C1-02 | **GREEN** tras PT-140.4 | Pasa |
| C1-03 | **Control** — PT `PENDING` que está `DONE` en `HISTORY.log` | **Falla** |
| C1-04 | **Control** — PT `PENDING` sin entrada en `HISTORY.log` | Pasa. Es el estado legítimo de un trabajo no empezado |
| C1-05 | **Control** — PT `VALIDATION_PENDING` listado en § 2 | Pasa. Terminado y esperando al humano es coherente |

### Comprobación 2 — `evidence/` ⇒ `HISTORY.log`

| # | Escenario | Esperado |
|---|---|---|
| C2-01 | **RED inicial** | **Falla**, nombrando **PT-129 y PT-130**: tienen carpeta de evidencia y ninguna entrada |
| C2-02 | **GREEN** tras PT-140.3 | Pasa |
| C2-03 | **Control** — carpeta nueva sin entrada | **Falla** |
| C2-04 | **Control** — carpeta con entrada | Pasa |
| C2-05 | **Control** — `evidence/VALIDACION-FINAL/` (no es un PT) | Pasa. No revienta con carpetas que no siguen el patrón `PT-XXX` |

> C2-01 es el escenario que justifica la guarda entera: **esta comprobación sola habría cazado los dos
> PT que FDGE STATE 7 perdió.**

### Comprobación 3 — `10-Technical-Debt.md` ↔ `PENDING_TASKS.md`

| # | Escenario | Esperado |
|---|---|---|
| C3-01 | **RED inicial** | **Falla** por `TD-014`: cerrada en `:289-292`, pendiente en `PENDING_TASKS.md:24` |
| C3-02 | **GREEN** | Pasa |
| C3-03 | **Control** — TD cerrada listada como pendiente | **Falla** |
| C3-04 | **Control** — TD abierta listada como pendiente | Pasa |

## `HISTORY.log` — el diff sólo añade

| # | Escenario | Esperado |
|---|---|---|
| H-01 | `git diff docs/implementation/HISTORY.log` | **Ni una línea modificada ni movida.** Sólo adiciones al final |
| H-02 | Las dos entradas nuevas | Fechadas hoy, diciendo a qué fecha corresponden |
| H-03 | El orden de PT-128 → PT-131 | **Intacto.** Reordenar sería falsificar el registro que este PT hace fiable |

## `PTSA/PENDIENTES.md` — de log a estado

| # | Escenario | Esperado |
|---|---|---|
| P-01 | Bloques vivos | **Uno** |
| P-02 | `PTSA/Motor-PTSA.md` como pendiente | Aparece **una** vez, no cinco |
| P-03 | Los seis bloques anteriores | En `PTSA/archive/`, **enlazados**. Nada borrado (`[A6]`) |

## `ROADMAP.md`

| # | Escenario | Esperado |
|---|---|---|
| R-01 | Cifras del roadmap | Coinciden con `ESTADO_ACTUAL.md` (Clase A, Health 95.5, Risk 24) |
| R-02 | Ítems | Todos en `PROPUESTO` — FPGE propone, el humano dispone |
| R-03 | `ROADMAP_HISTORY.log` | Entrada nueva, append |
| R-04 | Alternativa: retirado | **Con su razón escrita.** Dejarlo como está no es opción |

## Las guardas hermanas no se rompen

| # | Prueba | Esperado |
|---|---|---|
| G-01 | `coherencia-deuda-tecnica.spec.ts` | Verde |
| G-02 | `coherencia-documentacion-codigo.spec.ts` | Verde |

> Se toca justo lo que ellas vigilan, y **añadir una línea a un documento desplaza citas**. Es la
> molestia con razón de H-016.

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **944** |
| REG-02 | e2e | **77** |
| REG-03 | Navegador | **176** |

> Este PT no toca `src/`. La regresión se corre igual: es la única forma de demostrar que no se tocó.

## Lo que NO se prueba aquí

- **La prosa.** La contradicción de `10-Technical-Debt.md:103-105` no la caza ninguna guarda, y se
  acepta: una guarda que obliga a redactar de cierta forma enseña a escribir para el linter.
- Que los pendientes se **resuelvan**. Este PT hace que el registro diga la verdad, no que la verdad
  sea mejor.
