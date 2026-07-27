# PT-037 — Escenarios de prueba

Verificación por aplicación de migración (integración, Docker). Cada escenario se ejecuta contra un PostgreSQL controlado.

## T1 — Entorno limpio (fresh)
- **Given** PostgreSQL vacío.
- **When** `prisma migrate deploy`.
- **Then** existen las **28 tablas** y **19 enums**; en particular las 11 backoffice (`watchlist, system_config, commission_config, commission_records, moderation_log, cfdi_records, kyc_submissions, notification_campaigns, refund_requests, seo_config, cms_content`) y los valores `AuctionStatus.SUSPENDED/PENDING_MODERATION`, `PaymentProvider.HEY_BANCO`.

## T2 — Entorno con estado db-push
- **Given** PostgreSQL con las 11 tablas ya creadas (simulando el dev actual: `db push` desde schema.prisma en una BD limpia).
- **When** `prisma migrate deploy` con la nueva migración.
- **Then** **sin error** (`IF NOT EXISTS`/guardas), tablas y datos intactos, y `payments.currency` default = `MXN`, sin filas `currency='USD'`.

## T3 — Drift 0
- **When** `prisma migrate diff --from-schema-datasource --to-schema-datamodel --script` tras T1 y tras T2.
- **Then** salida **vacía** (sin diferencias) en ambos.

## T4 — Estado de migraciones
- **When** `prisma migrate status`.
- **Then** todas las migraciones aplicadas, sin pendientes ni fallidas.

## T5 — Moneda (AUD-008)
- **Given** una fila `payments` con `currency='USD'` (insert de prueba en T2).
- **When** migración aplicada.
- **Then** la fila queda `currency='MXN'`; nuevas inserciones sin currency → default `MXN`.

## T6 — Regresión de app
- **When** `db:generate` + `npx jest` (unit) + `tsc --noEmit`.
- **Then** 100% verde; sin cambios de comportamiento en la lógica de negocio.

> Nota: T1–T5 requieren Docker (DB + shadow DB), disponible. Evidencia (logs de deploy/diff/status) → `docs/implementation/evidence/PT-037/`.
