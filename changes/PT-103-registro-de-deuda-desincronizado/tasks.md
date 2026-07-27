# PT-103 — tasks.md

Rama: `fix/PT-103-registro-de-deuda-desincronizado`

| ID | Tarea | Estado |
|---|---|---|
| PT-103.1 | Guarda que cruza `HISTORY.log` con el registro — **en RED** | PENDING |
| PT-103.2 | Corregir las cuatro filas, cada una con su cita al código | PENDING |
| PT-103.3 | Alinear `PENDING_TASKS.md` y la matriz | PENDING |
| PT-103.4 | Suites y evidencia | PENDING |

## PT-103.1 — La guarda

**Objetivo**: que una deuda declarada cerrada en la historia y `Open` en el registro **falle**.

**Salidas**: `src/api/test/unit/docs/coherencia-deuda-tecnica.spec.ts`.

**Validación**: debe fallar **contra el estado actual** nombrando TD-003, TD-005, TD-010 y TD-012.
Más tres casos que no dependen del repositorio: acepta un registro coherente, rechaza uno
incoherente, y **se salta** si el fichero no existe.

## PT-103.2 — Las cuatro filas

**Objetivo**: que el registro diga la verdad, con cita comprobable.

**Validación**: PT-103.1 en verde, y cada estado nuevo resuelve a algo legible en el código.

## PT-103.3 — Coherencia del resto

`PENDING_TASKS.md` (lo reconstruyó PT-090) y `MATRIZ-DEUDA-TECNICA.md` no deben contradecir al
registro corregido.

## PT-103.4 — Suites y evidencia

`npm test` completo. Evidencia en `docs/implementation/evidence/PT-103/`.
