# PT-037 — Self-Review (STATE 5)

**Fecha**: 2026-07-23 · **Origen**: AUD-001 (+ AUD-008)

## Checklist FDGE

- [x] **Criterios de aceptación (`PLAN_ACTUAL.md §8`) verificados?**
  1. `migrate deploy` en PG vacío → 28 tablas/19 enums ✓ (T1).
  2. `migrate deploy`+baseline en PG db-push → sin error, tablas intactas, `payments.currency=MXN` ✓ (T2).
  3. Drift 0 en ambos ✓ (T3).
  4. `migrate status` limpio ✓ (T4).
  5. `payments.currency=MXN`, 0 filas USD ✓ (T5).
- [x] **Escenarios del Proposal Package pasan?** T1–T6 verdes sobre PG throwaway real.
- [x] **Sin efectos colaterales?** Regresión `tsc` + 153 tests verdes; schema.prisma sin cambios; solo se añade una migración.
- [x] **Convenciones respetadas?** Nombre de migración con timestamp `20260723_...` (orden lexical correcto, tras `20260623_...`); SQL generado por Prisma (estándar).
- [x] **Commit atómico, con convención, traceable?** Sí (`fix: PT-037`, Ref AUD-001/AUD-008). Nota de proceso: el primer `git add` usó ruta relativa incorrecta (cwd en repo root) → el commit no ocurrió; corregido con la ruta `src/api/prisma/...` (sin commit sucio).
- [x] **Sin artefactos de depuración?** El SQL crudo del diff vive en `/c/tmp` (scratch), no en el repo. Contenedor y BDs throwaway eliminados.
- [x] **Documentación si cambió el esquema/despliegue?** Sí: la migración lleva header explicativo + instrucción de baseline; docs-v2 (Modelo-de-Datos, Registro AUD-001/008, checklist DevOps) se actualizan en STATE 7.

## Hallazgos del spike (delta vs auditoría)
- La auditoría (grep de tablas) contó 24 modelos / 11 tablas. El conteo real es **28 modelos**; el `migrate diff` reveló además **drift de columnas** en tablas existentes (`auctions.admin_notes`, `profiles.legal_name`, `users.settings`, default de `user_payment_methods.id`) que el grep no detectó. La migración los cubre todos.
- AUD-008 salió **automáticamente** del diff (schema MXN vs migración USD).

## Alcance respetado
Fuera de alcance (no tocado): seed (AUD-017), retirar `db:push`, FKs de referencias libres, multi-moneda. Registrado en `out-of-scope.md`.

## Requisito operativo (documentar en STATE 7)
Entornos existentes creados por `db push` deben baselinear una vez:
`prisma migrate resolve --applied 20260723_reconcile_backoffice_schema_and_currency`.

## Veredicto
Migración generada, aplicada y verificada en dos escenarios reales (fresh + db-push) con drift 0 y regresión verde. Pendiente: validación humana (no auto-cierre) — idealmente ejecutar el baseline en la BD dev/staging real cuando esté disponible.
