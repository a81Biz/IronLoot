# CI/CD, Observabilidad y Operación — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/E/B`, `.github/workflows/ci.yml`, `.husky/pre-commit`, `docker-compose.yml`, módulos audit/health/diagnostics |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | 03-TRD, 09-Security |
| **Código usado** | `ci.yml`, `.husky/`, `audit/`, `health/`, `diagnostics/`, `system-cleanup/` |
| **Nivel de confianza** | Alto |

## 1. CI/CD

Pipeline `.github/workflows/ci.yml` (push/PR a `dev`,`qa`,`prep`,`prod`; Node 20), secuencial:

1. **lint** — install → `lint:check` → `typecheck`.
2. **test-unit** — `test --coverage` → Codecov (`fail_ci_if_error:false`).
3. **test-integration** — Postgres+Redis efímeros → `test:e2e`.
4. **build** — `build` → artefacto `dist/` (7 días).
5. **docker** — sólo `prod`/`prep`: Buildx de `./Dockerfile` (`push:false`, cache GHA).

⚠️ **Hallazgos CI/tooling:**
- Scripts corren en la **raíz**, pero el `package.json` raíz no define `lint/test/build` (workspaces sólo `apps/*`+`packages/*`, no `src/api`/`src/admin`) → resolución dudosa (`AUD-028`, no verificado contra logs).
- Husky `pre-commit` sólo hace lint-staged + typecheck de **`src/api`**; base/client/admin/core no cubiertos.

## 2. Versionado

Keep-a-Changelog + SemVer. `CHANGELOG.md` documenta `0.1.0`→`0.5.1` (ene-2026) y **está detenido** (no cubre v1.0.0 ni PT-026..035, aún menciona el `web/` eliminado — `AUD-031`). Versiones no unificadas: monorepo/admin `1.0.0`, api `0.5.1`, base/client/core `0.1.0` (`AUD-034`).

## 3. Observabilidad

- **Logs estructurados con `traceId`** en tres tablas inmutables: `AuditEvent` (eventos de negocio), `ErrorEvent` (errores con severidad/HTTP), `RequestLog` (peticiones con duración). `[C]`
- **Health:** `GET /health` y `/health/detailed` (deps). Healthchecks Docker en todos los servicios de app.
- **Diagnostics:** panel dev-only (`DevelopmentOnlyGuard`) con logs/metrics/errors — **TODO restringir en prod** (`AUD-025`).
- **Métricas de negocio:** dashboard admin (revenue/users por día), reportes financiero/operativo/fiscal.

## 4. Retención y limpieza ⚠️

**Dos crons `EVERY_DAY_AT_MIDNIGHT` en conflicto** (`AUD-018`):
- `scheduler/system-cleanup.service.ts` → borra `AuditEvent` > **90 días**.
- `system-cleanup/system-cleanup.service.ts` → borra `AuditEvent` + `RequestLog` > **30 días**.

Retención efectiva = **30 días** (gana el más estricto). El log "inmutable" se trunca antes de lo previsto. **Acción:** unificar en un único cron.

## 5. Backups / Restore / Recovery

- **Estado:** **No determinado** — no se encontró script/procedimiento de backup/restore en el repo. Postgres persiste en volumen `ironloot_postgres_data`; Redis con `appendonly yes`.
- **Recomendación:** definir política de backup de Postgres (pg_dump programado), restore probado, y RPO/RTO. *(Pendiente — registrar como deuda operativa.)*

## 6. Distributed lock y resiliencia

- Cierre de subasta protegido por lock Redis (`lock:auction-close`, TTL 60s) → idempotente multi-instancia.
- Sesión admin en Redis con **fallback a memoria** si Redis cae (aviso dev-only).

## 7. Checklist de despliegue (propuesto)

- [ ] Secretos no placeholder: `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_API_KEY`, **`ADMIN_USERNAME/PASSWORD`** (gate añadido por **PT-036**, VALIDATION_PENDING; en producción el arranque falla si son vacíos/placeholder/`admin`).
- [ ] `ALLOWED_ORIGINS` no vacío; `COOKIE_SECURE=true`; `COOKIE_DOMAIN` con punto.
- [ ] Esquema completo aplicado (⚠️ `migrate deploy` insuficiente por `AUD-001` → aplicar reconciliación).
- [ ] Proveedores de pago configurados (incluye `HEY_BANCO_*` si se usa, `AUD-023`).
- [ ] PAC de CFDI configurado (bloqueante fiscal, `AUD-016`).
- [ ] Diagnostics restringido en prod (`AUD-025`).
- [ ] Retención de audit unificada (`AUD-018`).

## 8. Release notes

Fuente histórica: `CHANGELOG.md` (hasta 0.5.1). **Recomendación:** retomar el changelog incorporando PT-026..PT-035 y el estado v1.0.0.
