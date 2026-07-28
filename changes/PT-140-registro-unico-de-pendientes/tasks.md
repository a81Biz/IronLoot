# PT-140 — Tareas atómicas

**Prerequisito**: PT-136 cerrado. Idealmente también PT-137, PT-138 y PT-139, para que el barrido
recoja su estado final — pero **no es bloqueante**: la guarda se puede dejar antes.
Ninguna empieza antes del ACK del Proposal Gate.
**Regla que gobierna todas**: ningún estado cambia sin cita `fichero:línea` verificada.

---

## PT-140.1 — RED: la guarda de coherencia de registros

- **Objetivo**: una prueba que falle **hoy**, con los registros que están en `master`.
- **Entrada**: `PENDING_TASKS.md`, `HISTORY.log`, `10-Technical-Debt.md`,
  `docs/implementation/evidence/`. Patrón de `coherencia-deuda-tecnica.spec.ts`.
- **Salida**: `src/api/test/unit/documentacion/coherencia-de-registros.spec.ts` con las tres
  comprobaciones de D2. **Sólo lo determinista; nada de prosa.**
- **Validación**: falla nombrando, como mínimo, `PT-104`, `TD-014`, los PT-127…130 marcados `BLOCKED`,
  y **PT-129 y PT-130 sin entrada en `HISTORY.log`**.
- **Status**: PENDING

## PT-140.2 — El barrido: cada fila contra el código

- **Objetivo**: la disciplina de PT-090, esta vez con mecanismo detrás.
- **Entrada**: las filas de `PENDING_TASKS.md` y de `PTSA/PENDIENTES.md`.
- **Salida**: tabla `fila | dice | realidad | cita`. **Ninguna fila sin cita.**
- **Validación**: cada estado nuevo se sostiene en `fichero:línea` que alguien puede abrir. Es R3, y
  es el riesgo principal de este PT.
- **Status**: PENDING

## PT-140.3 — `HISTORY.log`: las dos entradas que faltan

- **Objetivo**: FDGE STATE 7 incumplido. Salta de PT-128 a PT-131.
- **Entrada**: `evidence/PT-129/`, `evidence/PT-130/`, y los commits (a8d5bf0, 90ce57b, bd5eed4 ·
  676831c, 90d1fcf).
- **Salida**: dos entradas **añadidas al final**, fechadas hoy y diciendo a qué fecha corresponden.
- **Validación**: D3 — el diff **sólo añade**. `git diff` no muestra ni una línea modificada ni
  movida. Reordenar sería falsificar el registro que este PT hace fiable.
- **Status**: PENDING

## PT-140.4 — `PENDING_TASKS.md` reconstruido

- **Objetivo**: que deje de mentir en diez sitios.
- **Entrada**: PT-140.2.
- **Salida**: fichero reconstruido; la versión anterior a `archive/PENDING_TASKS-2026-07-28.md`. Las
  **44 filas de PT-127…130 marcadas `BLOCKED`** desaparecen: los cuatro están fusionados.
- **Validación**: PT-140.1 en verde para las comprobaciones 1 y 3.
- **Status**: PENDING

## PT-140.5 — `PTSA/PENDIENTES.md` podado

- **Objetivo**: D4. Es estado, no log.
- **Entrada**: los siete bloques (DS-004 … S-002-G).
- **Salida**: un solo bloque vivo con lo que sigue abierto; los seis anteriores a `PTSA/archive/`,
  **enlazados**. Nada se borra (`[A6]`).
- **Validación**: el pendiente de `PTSA/Motor-PTSA.md` aparece **una** vez, no cinco. (Su resolución es
  de PT-141.)
- **Status**: PENDING

## PT-140.6 — La regla de precedencia, escrita

- **Objetivo**: D1. Sin esto, todo lo demás se vuelve a desincronizar en un mes.
- **Salida**: sección en `CLAUDE.md` con la tabla `clase de pendiente | manda | derivados`, y los tres
  ficheros que pasan a histórico explícito (`FDGE_HALLAZGOS_TRACKER.md`, `MATRIZ-HALLAZGOS-*.md`,
  `docs-v2/Informe-Remediacion.md`).
- **Validación**: alguien que llega nuevo responde «¿dónde apunto un pendiente?» leyendo sólo eso.
- **Status**: PENDING

## PT-140.7 — `ROADMAP.md`: correrlo o retirarlo

- **Objetivo**: D5. Es del 23-jun y declara Clase C cuando hoy es Clase A.
- **Entrada**: `[START FPGE]` sobre el estado real — seis PT y H-005.
- **Salida**: `ROADMAP.md` regenerado con todos los ítems en `PROPUESTO`, y entrada en
  `ROADMAP_HISTORY.log`. Si se decide retirarlo, se retira **con su razón escrita**.
- **Validación**: las cifras del roadmap coinciden con `ESTADO_ACTUAL.md`. **Dejarlo como está no es
  una opción**: se lee con confianza y es falso.
- **Status**: PENDING

## PT-140.8 — Las cifras sueltas que se copiaron mal

- **Objetivo**: la familia de H-016 en los registros propios.
- **Entrada**: «los siete jobs» (son ocho, lo corrige PT-136), el favicon de ADMIN
  (`PENDIENTES.md:152`, ya hecho), `PT-104` y `TD-014`.
- **Salida**: corregidas donde estén.
- **Validación**: `grep` de cada cifra sin resultados obsoletos.
- **Status**: PENDING

## PT-140.9 — Casos de control

- **Objetivo**: RULE-14.
- **Salida**: (a) PT marcado `PENDING` que está `DONE` en `HISTORY.log` → **falla**;
  (b) coherente → pasa; (c) carpeta en `evidence/` sin entrada en `HISTORY.log` → **falla**;
  (d) `TD` cerrada que figura pendiente → **falla**; (e) los tres coherentes → pasa.
- **Validación**: los cinco. Sin (a), (c) y (d) la guarda no ha demostrado nada.
- **Status**: PENDING

## PT-140.10 — Las guardas hermanas siguen verdes

- **Objetivo**: se toca justo lo que ellas vigilan.
- **Salida**: `coherencia-deuda-tecnica.spec.ts` y `coherencia-documentacion-codigo.spec.ts` en verde.
- **Validación**: las dos. **Añadir una línea a un documento desplaza citas** — es la molestia con
  razón de H-016.
- **Status**: PENDING

## PT-140.11 — Regresión, evidencia, registro

- **Salida**: 944 · 77 · 176 · `evidence/PT-140/` con la tabla del barrido (fila → cita) y el
  antes/después de la guarda · `HISTORY.log` + `HANDOFF.md`.
- **Validación**: STATE 5. Es REFACTOR: puede marcarse **DONE** si el comportamiento se preserva y hay
  evidencia — no requiere validación humana como los BUG.
- **Status**: PENDING
