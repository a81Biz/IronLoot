# RELACIONES — Índice cache hallazgos ↔ evidencias ↔ productos
**PTSA V3 | Cache: se sobrescribe al reconstruir. `[R75]` — prevalecen los archivos individuales.**
**Última reconstrucción:** 2026-07-31 (S-015 — delta sync tras la tanda FPGE-004)

> **Nota de reconstrucción.** La versión anterior era de S-002 (27-jul) y declaraba **17 hallazgos, 5
> activos**. Hoy son **42** con **1** activo. La tabla se ha reconstruido leyendo el frontmatter de los
> 42 ficheros de `Hallazgos/`, no editándola a mano — que es lo que `[R75]` pide y lo que impide que
> vuelva a contradecir a su fuente.

## Hallazgos registrados (42 total · 1 activo)

| ID | Dim | Tipo | Sev | Estado | Producto | Evidencias | Riesgo | Sesión |
|---|:--:|---|---|---|---|---|---:|---|
| H-001 | D1 | DOMAIN_RULE | ALTA | CLOSED | P-001 | [E-001, E-002] | 0 | — |
| H-002 | D2 | OPERATIONAL | MEDIA | CERRADA | P-003 | [E-003] | 0 | — |
| H-003 | D2 | OBSERVABILITY | BAJA | CLOSED | P-004 | [E-004] | 0 | — |
| H-004 | D2 | SECURITY | MEDIA | CLOSED | P-005 | [E-005] | 0 | — |
| H-005 | D1 | DOMAIN_RULE | ALTA | CERRADA | P-009 | [E-007, E-009] | 6 | — |
| H-006 | D2 | SECURITY | BAJA | CERRADA | P-010 | [E-006] | 2 | — |
| H-007 | D4 | DOCUMENTATION | BAJA | CLOSED | P-005 | [E-008] | 0 | — |
| H-008 | D2 | TECHNICAL | ALTA | CERRADA | P-001 | [E-013] | 9 | DS-004 |
| H-009 | D4 | PROCESS | MEDIA | CERRADA | null | [E-012] | 8 | DS-004 |
| H-010 | D1 | DOMAIN_RULE | ALTA | CERRADA | P-010 | [E-013] | 12 | DS-006 |
| H-011 | D1 | DOMAIN_RULE | MEDIA | CERRADA | P-006 | [E-014] | 6 | DS-006 |
| H-012 | D1 | DOMAIN_RULE | BAJA | CERRADA | P-007 | [E-015] | 4 | DS-008 |
| H-013 | D2 | BUG | ALTA | CERRADA | P-002 | [E-016] | 12 | DS-009 |
| H-014 | D2 | BUG | CRITICA | CERRADA | null | [E-025, E-017] | 8 | S-002 |
| H-015 | D2 | BUG | ALTA | CERRADA | null | [E-025, E-018] | 12 | S-002 |
| H-016 | D4 | PROCESS | ALTA | CERRADA | null | [E-025, E-020] | 9 | S-002 |
| H-017 | D2 | BUG | ALTA | CERRADA | null | [E-025, E-021] | 6 | S-002 |
| H-018 | D2 | BUG | BAJA | CERRADA | P-005 | [E-025, E-022] | 2 | S-002 (PT-128) |
| H-019 | D2 | BUG | ALTA | CERRADA | null | [E-025, E-023] | 12 | S-002 (PT-131) |
| H-020 | D1 | BUG | ALTA | CERRADA | null | [E-025, E-024] | 12 | S-002-R3 |
| H-021 | D2 | BUG | ALTA | CERRADA | null | [E-026] | 9 | S-003 |
| H-022 | D2 | OPERATIONAL | MEDIA | CERRADA | null | [E-026] | 8 | S-003 |
| H-023 | D4 | DOCUMENTATION | BAJA | CERRADA | null | [E-028] | 4 | S-003 |
| H-024 | D4 | PROCESS | MEDIA | CERRADA | null | [E-027] | 8 | S-003 |
| H-025 | D2 | BUG | ALTA | CERRADA | null | [E-029, E-030] | 12 | S-004 |
| H-026 | D3 | OBSERVABILITY | MEDIA | CERRADA | null | [E-031] | 8 | S-004 |
| H-027 | D3 | OBSERVABILITY | MEDIA | CERRADA | null | [E-032] | 8 | S-004-M |
| H-028 | D3 | BUG | MEDIA | CERRADA | null | [E-033] | 8 | S-005 |
| H-029 | D2 | SECURITY | MEDIA | CERRADA | null | [E-034, E-035] | 6 | S-005-R |
| H-030 | D1 | BUG | ALTA | CERRADA | null | [E-034, E-035] | 9 | S-005-R |
| H-031 | D2 | BUG | MEDIA | CERRADA | null | [E-034, E-035] | 6 | S-005-R |
| H-032 | D3 | BUG | ALTA | CERRADA | null | [E-036] | 9 | S-006-R |
| H-033 | D3 | BUG | MEDIA | CERRADA | null | [E-036] | 6 | S-006-R |
| H-034 | D3 | BUG | MEDIA | CERRADA | null | [E-037] | 6 | S-007-R |
| H-035 | D2 | BUG | MEDIA | CERRADA | null | [E-038, E-039] | 6 | S-008-R |
| H-036 | D3 | BUG | MEDIA | CERRADA | null | [E-040] | 9 | S-011 |
| H-037 | D4 | PROCESS | MEDIA | CERRADA | null | [E-040] | 6 | S-012 |
| H-038 | D2 | PROCESS | CRITICA | CERRADA | null | [E-041] | 16 | S-014 |
| H-039 | D1 | BUG | CRITICA | CERRADA | null | [E-041] | 16 | S-014 |
| H-040 | D1 | BUG | CRITICA | CERRADA | null | [E-041] | 16 | S-014 |
| H-041 | D1 | DOMAIN | ALTA | CERRADA | null | [E-041] | 12 | S-014 |
| H-042 | D2 | SECURITY | ALTA | ABIERTA | P-004 | [E-042] | 8 | S-014 |

## Lo que esta reconstrucción deja visible

**`H-038`…`H-041`** son las cuatro familias con las que `S-014` registró los **64 hallazgos** de la
auditoría de interfaz del 2026-07-31 — una por causa, no una por síntoma. Las cuatro nacieron `CERRADA`,
cerradas por la tanda `PT-204`…`PT-233`.

**`H-042` es el único activo**, y es el único de todo el registro que **encontró la suite de navegador** en
vez de una lectura o un checkpoint. Está en el camino del dinero y se deja abierto a propósito: falta medir
por qué la verificación de firma respondió `SUCCESS`, y eso no se cierra escribiendo código.

**Evidencias:** `E-001` … `E-042`. Las dos últimas —`E-041` y `E-042`— son de esta jornada.
