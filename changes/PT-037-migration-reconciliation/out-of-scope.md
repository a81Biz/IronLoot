# PT-037 — Fuera de alcance

Corrige AUD-001 (drift de migraciones) **+ AUD-008 incluido** (default `payments.currency`). Quedan fuera:

1. **Seed inexistente (AUD-017)**: crear el script de seed / `prisma.seed` config → PT propio.
2. **Eliminar el script `db:push`** de `package.json`: en este PT solo se **documenta** su uso restringido; retirarlo es decisión aparte.
3. **Refactor de `schema.prisma`**: no se cambian modelos, tipos ni relaciones; la migración alcanza el estado ya declarado.
4. **Añadir FKs a las referencias libres** de los modelos backoffice (`CommissionRecord.orderId`, etc.): mejora de integridad referencial → PT propio (relacionado con el modelo de dominio).
5. **Multi-moneda**: se mantiene MXN único.
6. **Otras normalizaciones de datos** más allá de `payments.currency USD→MXN`.
7. **Reescritura del historial de migraciones** (squash/baseline global): se añade una migración; no se reescriben las 14 existentes.

Hallazgos tocados tangencialmente se registran, no se corrigen aquí.
