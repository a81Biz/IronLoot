# PT-120 — test-scenarios.md

## Motor

| ID | Escenario | Esperado |
|---|---|---|
| DR-01 | Todas cumplen | `rubric = 100`, código 0 |
| DR-02 | Una violada (peso 20 de 100) | `rubric = 80`, **falla**, la nombra |
| DR-03 | Una `SIN_DATOS` (peso 20) y el resto cumple | `rubric = 100` — la sin datos **fuera del denominador** |
| DR-04 | Todas `SIN_DATOS` | `rubric = null`, y lo dice; **no** 100 |
| DR-05 | Añadir una regla al catálogo | Aparece sin tocar el motor |
| DR-06 | Coherencia inter-producto rota | Se reporta aparte, **no** baja el score de rúbrica |

> DR-02 y DR-04 son los que dan valor a DR-01. Sin ellos, un `rubric = 100` podría significar que el
> motor no mira.

## Punta a punta

| ID | Escenario | Esperado |
|---|---|---|
| E2E-01 | `npm run audit:domain` con la BD actual | Reproduce DS-008: `rubric = 100` |
| E2E-02 | Con un balance negativo inyectado | Falla nombrando CR-001 y el monedero |
| E2E-03 | Código de salida, comprobado **sin tubería** | 1 al fallar, 0 al pasar |
