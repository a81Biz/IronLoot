# PT-140 — Cambios de especificación

## `CLAUDE.md` — sección nueva: dónde vive un pendiente

Se añade al final de la Parte 3 (FDGE), y las Partes 4 y 5 la referencian:

> ## Dónde vive un pendiente
>
> Un pendiente puede escribirse en muchos sitios, y durante meses se escribió en varios a la vez sin
> que ninguno mandara. El resultado fue un registro que declaraba `BLOCKED` cuarenta y cuatro tareas
> ya fusionadas y perdía dos PT enteros (PT-140). **Cada clase de pendiente tiene un registro que
> manda; los demás son derivados y no se editan a mano.**
>
> | Clase | Manda | Derivados |
> |---|---|---|
> | Trabajo FDGE pendiente o en curso | `docs/implementation/PENDING_TASKS.md` | `HANDOFF.md` |
> | Trabajo terminado | `docs/implementation/HISTORY.log` — **append-only** | todo lo demás |
> | Deuda técnica | `10-Technical-Debt.md` (`TD-XXX`) | `MATRIZ-DEUDA-TECNICA.md` |
> | Hallazgos de auditoría | `PTSA/Hallazgos/H-XXX.md` | `ESTADO_ACTUAL.md`, `RESUMEN.md` |
> | Bloqueantes de auditoría | `PTSA/PENDIENTES.md` — **un solo bloque vivo** | — |
> | Priorización | `docs/implementation/ROADMAP.md` | — |
>
> **Histórico explícito** — se leen, no se actualizan: `FDGE_HALLAZGOS_TRACKER.md`,
> `MATRIZ-HALLAZGOS-*.md`, `docs-v2/Informe-Remediacion.md`.
>
> Lo vigila `coherencia-de-registros.spec.ts`.

## `PTSA/PENDIENTES.md` — cambia de naturaleza

| Antes | Después |
|---|---|
| Siete bloques de sesión apilados (DS-004 … S-002-G), ninguno podado | **Un bloque vivo.** Los anteriores en `PTSA/archive/`, enlazados |
| Se comportaba como log sin serlo | Artefacto de **estado**, como `ESTADO_ACTUAL.md` y `RESUMEN.md` |

Coherente con la gestión de estado que PTSA ya declara: `RESUMEN.md` y `ESTADO_ACTUAL.md` se
sobrescriben; sólo `AUDIT_LOG.md` es append-only.

## `docs/implementation/HISTORY.log`

Se **añaden al final** las entradas de **PT-129** y **PT-130**, con su fecha real anotada. Nada se
modifica ni se reordena.

## `docs/implementation/PENDING_TASKS.md`

Reconstruido contra el código. Versión anterior a `archive/PENDING_TASKS-2026-07-28.md`. Desaparecen
las 44 filas de PT-127…130 marcadas `BLOCKED`.

## `docs/implementation/ROADMAP.md`

Regenerado por una corrida FPGE real, o retirado con su razón escrita.

## Fichero nuevo

`src/api/test/unit/documentacion/coherencia-de-registros.spec.ts`

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-20**:

> **Cada clase de pendiente tiene un registro que manda, y cerrar algo se escribe ahí.**
> Este repositorio llegó a tener **doce** almacenes de pendientes y **uno** con guarda automática.
> El resultado: `PENDING_TASKS.md` declarando `BLOCKED` cuarenta y cuatro tareas ya fusionadas, un
> `ROADMAP.md` de hace cinco semanas anunciando una clase que ya no existía, el mismo pendiente
> repetido cinco veces en `PTSA/PENDIENTES.md`, y **dos PT enteros —PT-129 y PT-130— sin entrada en
> `HISTORY.log`** pese a tener evidencia y commits fusionados (PT-140).
> **`HISTORY.log` es append-only**: lo que falta se añade al final con su fecha anotada; reordenarlo
> es falsificarlo.
> Lo vigila `coherencia-de-registros.spec.ts`.

## Lo que este PT NO especifica

- Ningún cambio en `src/`, en la API, en datos ni en comportamiento observable.
- No fusiona los frameworks: declara precedencia entre sus artefactos.
- No cierra hallazgos PTSA (`[R44]`).
- No decide el árbol documental — eso es **PT-141**.
