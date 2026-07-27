# PT-037 — Design: Reconciliación de migraciones + fix moneda pagos

**Tipo**: BUG/REFACTOR · **Complejidad**: MAJOR · **Origen**: AUD-001 (+ AUD-008)
**Fuentes**: PT-037 Discovery/Context, `PLAN_ACTUAL.md`, docs-v2 `Modelo-de-Datos §4`, `ADR-006`, Graphify.
**Prerequisito de ejecución**: Docker con PostgreSQL (DB + shadow DB) — **disponible**.

## Decisiones

### D1 — Una migración idempotente generada por `migrate diff`
Nueva carpeta `prisma/migrations/<timestamp>_reconcile_backoffice_schema_and_currency/migration.sql`.
El SQL base se **genera** (no se escribe a mano) con:
```
prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url <postgres temporal> --script
```
→ produce exactamente lo que falta: 11 tablas, 9 enums, 2 `ADD VALUE` (`AuctionStatus.SUSPENDED/PENDING_MODERATION`, `PaymentProvider.HEY_BANCO`), índices y FKs. Deriva de `schema.prisma` (fuente de verdad) → mitiga R1 (fidelidad DDL).

### D2 — Endurecer a idempotente
Edición del SQL generado para que corra en cualquier entorno sin fallar por objetos existentes:
- `CREATE TABLE IF NOT EXISTS` (11 tablas).
- `CREATE TYPE` envuelto en `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='...') THEN CREATE TYPE ...; END IF; END $$;` (PG no tiene `CREATE TYPE IF NOT EXISTS`).
- `ALTER TYPE ... ADD VALUE IF NOT EXISTS ...` (PG16 lo soporta).
- Índices `CREATE INDEX IF NOT EXISTS`; FKs con guarda `DO`/`IF NOT EXISTS` sobre `pg_constraint`.

### D3 — AUD-008 (moneda) en la misma migración
```
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'MXN';
UPDATE "payments" SET "currency" = 'MXN' WHERE "currency" = 'USD';
```
Idempotente (re-ejecución inocua).

### D4 — Aplicación y baseline
- Entorno limpio / CI / prod: `migrate deploy` crea todo + aplica el fix.
- BD dev existente: `migrate deploy` ejecuta el SQL idempotente → no-op en lo existente, **sí** aplica el fix de moneda. **No** se usa `migrate resolve` (saltaría el fix).

### D5 — Prevención de recurrencia
Documentar que `db push` (`package.json:27`) es solo para prototipado; en docs-v2/README de ingeniería añadir la regla "toda evolución de esquema vía `migrate`". (No se elimina el script en este PT — ver out-of-scope.)

## Componentes tocados
- `prisma/migrations/<ts>_reconcile_backoffice_schema_and_currency/migration.sql` — **nuevo**.
- `prisma/schema.prisma` — **sin cambios** (es el objetivo).
- Doc: nota de convención (docs-v2 `4-ingenieria`).
- Regenerar Prisma Client (`db:generate`) tras aplicar.

## Procedimiento de generación (STATE 4, Docker arriba)
1. Levantar un PG shadow temporal (contenedor throwaway o `SHADOW_DATABASE_URL`).
2. `migrate diff` → `raw.sql`.
3. Endurecer a idempotente + añadir bloque de moneda.
4. Colocar como migración; `migrate deploy` en (a) PG vacío y (b) copia con estado db-push.
5. `migrate diff --from-schema-datasource --to-schema-datamodel` → **drift 0** en ambos.
