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
- **El cerrojo recibe su URL por inyección y sin reserva** (ADR-053, PT-185). Conservaba
  `process.env.REDIS_URL || 'redis://localhost:6379'` a través de PT-137 y PT-147: un despliegue sin `REDIS_URL`
  **arrancaba**, apuntaba a un `localhost` que en el contenedor no es nadie, `acquireLock` relanzaba y
  **ninguna subasta se cerraba**. Desde fuera, subastas que nunca terminan.
- **Y la guarda que debía impedirlo miraba otra cosa**: comprobaba que las variables estuvieran *declaradas*, no
  que carecieran de *reserva* — que es la mitad que RULE-17 llama, en negrita, el problema. Ahora
  `conexiones-sin-reserva.spec.ts` cubre los cuatro servicios.

## 7. Checklist de despliegue (propuesto)

- [ ] Secretos no placeholder: `JWT_SECRET`, `SESSION_SECRET`, `ADMIN_API_KEY`, **`ADMIN_USERNAME/PASSWORD`** (gate añadido por **PT-036**, VALIDATION_PENDING; en producción el arranque falla si son vacíos/placeholder/`admin`).
- [ ] `ALLOWED_ORIGINS` no vacío; `COOKIE_SECURE=true`; `COOKIE_DOMAIN` con punto.
- [x] Esquema completo aplicado por migración. `AUD-001` corregido (PT-127) y **vigilado en CI** por el job `schema-drift`.
- [ ] Proveedores de pago configurados (incluye `HEY_BANCO_*` si se usa, `AUD-023`).
- [ ] PAC de CFDI configurado (bloqueante fiscal, `AUD-016`).
- [ ] Diagnostics restringido en prod (`AUD-025`).
- [ ] Retención de audit unificada (`AUD-018`).

## 8. Release notes

Fuente histórica: `CHANGELOG.md` (hasta 0.5.1). **Recomendación:** retomar el changelog incorporando PT-026..PT-035 y el estado v1.0.0.

---

## 9. Checkpoints de auditoría (D1 · D2 · D3 · D5)

Cinco comandos. **Los tres primeros corren solos en CI y van sin `needs`**: un job roto no debe poder ocultarlos
— es lo que le pasó a `build` y `docker`, que no se ejecutaron **nunca** porque colgaban de un job que no podía
terminar (H-015).

| Comando | Mide | En CI |
|---|---|---|
| `npm run audit:schema` | Que las migraciones reproduzcan `schema.prisma` | job `schema-drift` |
| `npm run audit:check` | Vulnerabilidades contra `security-baseline.json` | job `security-audit` |
| `npm run audit:observability` | `catch` mudos contra línea base + traza completa | job `observabilidad` |
| `npm run audit:domain` | 14 reglas de dominio **sobre salida real** | delta sync (necesita base con historia) |
| `npm run audit:reliability` | Success/Retry/Failure de los ciclos de pago | delta sync |

**`audit:schema` necesita una base sombra y en local no la crea nadie.** CI crea la suya; en desarrollo hay que
crearla una vez, **y después de cada `run-all.sh`** porque el reseteo se la lleva. Sin ella el checkpoint dice
`FALLA — No se pudo comprobar la deriva del esquema`: **eso es correcto y es a propósito** —un error de ejecución
no es un aprobado— pero se lee igual que una deriva real. El comando está en `CLAUDE.md`.

**Los instrumentos declaran la base de su afirmación.** `audit:domain` imprime el denominador de cada
comprobación y sale con **1** cuando no puede medir (H-025); `audit:reliability` exige **muestra mínima de 20** y
por debajo dice `SIN_DATOS` en vez de dar verde o rojo (H-028). *Lo que distingue un instrumento de auditoría de
un test es que declara la base de su afirmación.*

**Y la fiabilidad operacional de v1.0 NO está demostrada** (ADR-055): hacen falta 20 ciclos de pago resueltos y
hay 2. Está declarado, no pendiente.

## 10. El estado del trabajo se lee en un índice generado

`npm run indice:estado` regenera el **ÍNDICE DE ESTADO** al final de `HISTORY.log`. Existe porque el log es
append-only: la línea `Status:` de una entrada es **histórica**, y **102 entradas dicen `VALIDATION_PENDING`
estando cerradas**. Es una herramienta de **host** —el contenedor monta el repo `:ro` a propósito— y vive en la
raíz junto a `lock:*`.
