# PT-043 — Evidencia (AUD-017, AUD-018, AUD-027)

- **api tsc --noEmit**: exit 0.
- **AUD-018**: el cron 90d duplicado (scheduler/system-cleanup) ya no tiene `@Cron` → no se programa; el módulo system-cleanup queda como único cron `EVERY_DAY_AT_MIDNIGHT` con retención `LOG_RETENTION_DAYS` (default 90) sobre AuditEvent + RequestLog.
- **AUD-017**: `prisma/seed.ts` + `"prisma": { "seed": "ts-node prisma/seed.ts" }`. `npm run db:seed` deja de fallar por falta de config; ejecución real requiere DB (no había stack).
- **AUD-027**: documentado (no code) — dos rutas SMTP (MAIL_* transporte activo vs SMTP_* SystemConfig override). Reconciliación completa = decisión de config, anotada en docs-v2.
