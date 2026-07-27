# PT-103 — spec-changes.md

| Documento | Cambio |
|---|---|
| `10-Technical-Debt.md` | TD-003, TD-005, TD-010, TD-012 pasan a cerradas, **con cita al código** |
| `11-Conventions.md` | RULE-08: cerrar una deuda son dos escrituras, y una guarda lo comprueba |
| `PENDING_TASKS.md` | Coherencia con el registro corregido |
| `MATRIZ-DEUDA-TECNICA.md` | Tabla de estados alineada |
| `VALIDACION-PT-090-101.md` | PT-090 deja de estar bloqueado cuando esto se valide |

## Regla propuesta

> **RULE-08 — Cerrar una deuda técnica son DOS escrituras, no una.**
>
> El código y `10-Technical-Debt.md`. La primera la obliga el compilador; la segunda no la obligaba
> nada, y por eso el registro quedó mintiendo dos veces (PT-090, y otra vez tres PT después).
>
> El estado nuevo **cita qué se puede leer** para comprobarlo. «Cerrada por PT-XXX» sin cita es
> otra afirmación sin respaldo, que es lo que había antes.
>
> Lo vigila `src/api/test/unit/docs/coherencia-deuda-tecnica.spec.ts`, que se salta si `docs/` no
> está presente — está gitignored.
