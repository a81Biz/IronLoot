# Informe de Remediación — Hallazgos de Auditoría IronLoot

| Metadato | Valor |
|---|---|
| **Fecha** | 2026-07-23 |
| **Alcance** | Remediación de los 36 hallazgos `AUD-*` del Registro de Hallazgos, bajo FDGE |
| **Método** | PTs con ramas `fix/*` (no fusionadas a master → todo revisable), commits atómicos, tests-first donde aplica, verificación tsc/build/unit + DB throwaway |
| **Verificación final** | API `tsc` 0 + **164 tests** · core **134 tests** · CLIENT build OK · ADMIN build OK |
| **No fusionado a master** | Sí — cada PT queda en su rama para revisión/merge por el equipo |

## Resumen

**33 de 36 hallazgos resueltos** (código verificado o documentación oficial). **3 abiertos honestos** (bloqueo externo o validación de entorno).

| Severidad | Total | Resueltos | Abiertos |
|---|---|---|---|
| CRÍTICA | 5 | 5 | 0 |
| ALTA | 11 | 10 | 1 (AUD-016 externo) |
| MEDIA | 13 | 11 | 2 (AUD-028, AUD-033) |
| BAJA | 7 | 7 | 0 |

## Ramas de trabajo

| Rama | Hallazgos | Estado |
|---|---|---|
| `fix/PT-036-admin-auth-hardening` | AUD-004 | CLOSED |
| `fix/PT-037-migration-reconciliation` | AUD-001, AUD-008 | CLOSED (baseline `resolve` pendiente en dev) |
| `fix/PT-038-client-bff-writes` | AUD-003 | CLOSED (fusionada en audit-remediation) |
| `fix/PT-039-websocket-hardening` | AUD-006 | CLOSED |
| `fix/audit-remediation` | AUD-007,014,025,026,009,011,005,010,012,013,017,018,027,002,032,015,016-msg + doc | CLOSED (rama consolidada) |

## Detalle por hallazgo

### CRÍTICOS
- **AUD-004** (PT-036): gate de credenciales admin en arranque prod + throttle login + comparación timing-safe. Tests RED→GREEN.
- **AUD-001 + AUD-008** (PT-037): migración de reconciliación (11 tablas + enums + columnas) + `payments.currency`→MXN; verificada en PG throwaway (fresh + db-push + drift 0).
- **AUD-003** (PT-038): proxy BFF en CLIENT + 8 escrituras corregidas (path relativo + método/ruta); unit test de inyección de header.
- **AUD-005** (PT-042): el settlement cobra la comisión configurable (CommissionsService) en vez del 10% fijo.
- **AUD-002** (PT-044): página de puja `/auctions/:id` + feed Socket.io en vivo + puja vía BFF.

### ALTA
- **AUD-006** (PT-039): WS público read-only por diseño + validación UUID + sin PII en el feed.
- **AUD-007 + AUD-014** (PT-040): ADMIN Helmet+CSP + sesión SameSite=Lax (mitiga CSRF).
- **AUD-009** (PT-041): incremento mínimo de puja aplicado + test.
- **AUD-010** (PT-042): documentado como flujo de dos pasos intencional (resolver → reembolsar); auto-refund = enhancement.
- **AUD-011** (PT-041): guard de estado terminal en moderación admin.
- **AUD-012** (PT-042): eliminados los 4 use-cases muertos de core (falsa confianza).
- **AUD-013** (PT-042): +10 tests (commissions, refunds).
- **AUD-015** (doc): `docs-v2` RN-21 enuncia la invariante correcta; PTSA queda histórico.
- **AUD-016** (PT-046): **BLOQUEADO (externo)** — requiere un PAC certificado + credenciales; el código falla con guía a `ICfdiPacProvider`.

### MEDIA / BAJA
- **AUD-017** (PT-043): seed script + config `prisma.seed`.
- **AUD-018** (PT-043): un único cron de limpieza (retención configurable, default 90d).
- **AUD-025** (PT-040): diagnostics confirmado dev-only (DevelopmentOnlyGuard); TODO obsoleto retirado.
- **AUD-026** (PT-040): CLIENT sin fallback de secreto débil (falla cerrado).
- **AUD-027** (PT-043): SMTP documentado (MAIL_* activo vs SMTP_* override).
- **AUD-032** (PT-046): puerto admin 5173→5174 + plantilla huérfana eliminada.
- **AUD-019/020/021/022/023/024/029/030/031/034/035/036**: reconciliados/superados por `docs-v2/` (documentación oficial). PTSA original = histórico.

### Abiertos honestos
- **AUD-016**: bloqueo externo (selección de PAC + credenciales).
- **AUD-028**: CI raíz sin scripts propios — requiere validación contra logs reales de CI.
- **AUD-033**: endpoint de orden comentado (inofensivo) — se deja para no dejar imports huérfanos.

## Pendientes de entorno (no ejecutables sin stack)
- e2e de: login admin throttle, escrituras autenticadas de CLIENT, puja en vivo (Socket.io).
- `migrate resolve --applied 20260723_reconcile_...` en la BD dev/staging real.
- `npm run db:seed` contra una BD.

## Recomendación
Revisar y fusionar las ramas `fix/*` a master en orden, ejecutar los e2e con el stack levantado (`docker-compose up -d`), resolver el baseline de migración en dev, y seleccionar un PAC para desbloquear AUD-016.
