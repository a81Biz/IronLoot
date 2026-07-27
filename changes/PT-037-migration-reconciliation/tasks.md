# PT-037 — Tareas atómicas

Migración = artefacto verificable por **aplicar + comprobar** (integración). "RED" = entorno limpio sin las 11 tablas antes de la migración; "GREEN" = esquema completo tras aplicarla.

| ID | Objetivo | Inputs | Outputs | Validación | Status |
|---|---|---|---|---|---|
| **PT-037.1** | Spike: generar SQL de reconciliación con `migrate diff` (Docker + shadow DB). | schema.prisma, migraciones | `raw` SQL del diff | El diff lista 11 tablas + 9 enums + 2 ADD VALUE | DONE |
| **PT-037.2** | Endurecer el SQL a idempotente (`IF NOT EXISTS`/`DO`) + añadir fix de moneda (SET DEFAULT MXN + backfill). | D2, D3 | `prisma/migrations/<ts>_reconcile_.../migration.sql` | Lint SQL; revisión de guardas | DONE |
| **PT-037.3** | Test escenario limpio: `migrate deploy` en PG vacío. | migración | — | 28 tablas + 19 enums + valores de enum presentes | DONE |
| **PT-037.4** | Test escenario db-push: `migrate deploy` en PG con las tablas ya creadas por db push. | migración | — | Sin error; tablas intactas; `payments.currency` default MXN; 0 filas USD | DONE |
| **PT-037.5** | Verificar drift 0: `migrate diff --from-schema-datasource --to-schema-datamodel` en ambos escenarios. | migración aplicada | log | Salida vacía (sin diferencias) | DONE |
| **PT-037.6** | `db:generate` + suite completa (regresión). | Prisma Client | — | `tsc` OK; jest unit 100% verde | DONE |
| **PT-037.7** | Docs: convención "esquema solo vía migrate" (docs-v2 4-ingenieria) + estado AUD-001/008. | D5 | docs | Revisión | DONE |

**Regla:** ninguna migración/código antes del ACK del PROPOSAL GATE. El spike (PT-037.1) y todo lo demás se ejecutan tras el ACK, con Docker.
