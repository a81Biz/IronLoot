# PT-037 — Evidencia de pruebas

**Fecha**: 2026-07-23 · **Rama**: `fix/PT-037-migration-reconciliation` · **Tipo**: BUG/REFACTOR (MAJOR)
**Entorno de prueba**: PostgreSQL 16 **throwaway** en contenedor `il-pt037-pg` (puerto 5433, `--rm`), BDs desechables `il_fresh`, `il_dbpush`, `il_diff_shadow`. **No se tocó** ninguna BD de dev (de hecho `ironloot-db` no estaba levantada; el 5432 lo ocupa un stack Supabase ajeno). Contenedor eliminado al finalizar.

## Spike — generación del SQL (PT-037.1)

`prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url <il_diff_shadow> --script` → **273 líneas**. Reveló el drift completo (más de lo que halló la auditoría por grep de tablas):
- 11 `CREATE TABLE`, 9 `CREATE TYPE`, 3 `ALTER TYPE ADD VALUE`, 3 FKs, 18 índices.
- **Drift adicional en tablas existentes**: `auctions.admin_notes`, `profiles.legal_name`, `users.settings` (JSONB), `user_payment_methods.id DROP DEFAULT`.
- `ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'MXN'` (AUD-008, incluido automáticamente por el diff).

Migración creada: `prisma/migrations/20260723_reconcile_backoffice_schema_and_currency/migration.sql` (SQL del diff + backfill `UPDATE payments SET currency='MXN' WHERE currency='USD'`).

## T1 — Entorno limpio (il_fresh)
`migrate deploy` → **15 migraciones aplicadas** sin error. Verificación:

| Comprobación | Resultado |
|---|---|
| Tablas (excl. `_prisma_migrations`) | **28** ✓ |
| Enums | **19** ✓ |
| `payments.currency` default | `'MXN'` ✓ |
| `AuctionStatus` SUSPENDED/PENDING_MODERATION | 2/2 ✓ |
| `PaymentProvider` HEY_BANCO | 1/1 ✓ |
| 11 tablas backoffice | 11/11 ✓ |
| `users.settings` | presente ✓ |

## T2 — Entorno db-push + baseline (il_dbpush)
Simulación fiel de dev: `migrate deploy` (14 migraciones) → `db push` (añade backoffice) → migración 15 restaurada.
- `migrate status` antes → **1 pendiente** (`20260723_reconcile...`).
- `migrate resolve --applied 20260723_reconcile...` → **"marked as applied"** (baseline).
- `migrate status` después → **"Database schema is up to date!"** ✓
- `payments.currency` default = `'MXN'` ✓; filas `USD` = **0** ✓.

## T3 — Drift 0
`migrate diff --from-schema-datasource --to-schema-datamodel` (BD live vs schema):
- il_fresh → **✓ drift 0** (salida vacía).
- il_dbpush → **✓ drift 0**.

## T4 — Migrate status
Ambos entornos: sin migraciones pendientes ni fallidas tras aplicar/baseline.

## T6 — Regresión de app
- `prisma generate` → ✔ Prisma Client v5.22.0 generado.
- `tsc --noEmit` → **exit 0**.
- `jest` (unit) → **29 suites / 153 tests, 100% verde** (baseline de master; el schema no cambió, solo se añadió SQL de migración).

## Commit
```
688ffc5 fix: PT-037 reconcile backoffice schema migrations + MXN currency default
```
Un commit atómico (`fix: PT-037`), traceable a AUD-001/AUD-008. Solo añade `prisma/migrations/.../migration.sql`.

## Mecanismo (decisión humana en el spike)
**Migración estándar (SQL del diff) + baseline `migrate resolve --applied`** en entornos ya existentes, en lugar de SQL idempotente hecho a mano. Fresh/CI: `migrate deploy`. Existentes (db-push): un `resolve` documentado.
