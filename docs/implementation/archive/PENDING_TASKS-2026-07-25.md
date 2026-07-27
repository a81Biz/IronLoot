# PENDING_TASKS.md — IronLoot
**FDGE V3 | Actualizar al completar o agregar tareas**
**Última actualización**: 2026-07-25 (PT-076 añadido)

---

## PT-035 — FEATURE MAJOR: Iron Loot Design System — VALIDATION_PENDING
**Branch**: `feature/PT-035-ironloot-design-system`
**Proposal Package**: `changes/PT-035-ironloot-design-system/`
**Evidence**: `docs/implementation/evidence/PT-035/`

| Task | Descripción | Status |
|---|---|---|
| T-035.0 | Copiar logo-3d.png a `src/apps/base/public/images/` | DONE |
| T-035.1 | CSS BASE: reescritura con design tokens Iron Loot | DONE |
| T-035.2 | CSS CLIENT: reescritura con design tokens Iron Loot | DONE |
| T-035.3 | CSS ADMIN: actualización de variables --primary y --sidebar-bg | DONE |
| T-035.4 | Layout BASE: base.html (navbar SVG + Google Fonts + footer 4-col) | DONE |
| T-035.5 | Layout CLIENT: client.html (sidebar Iron Black + SVG isotipo) | DONE |
| T-035.6 | Layout ADMIN: admin.html (Montserrat link + SVG isotipo reemplaza bolt) | DONE |
| T-035.7 | Page HOME: 6 secciones según Index.png | DONE |
| T-035.8 | Page LIST: sidebar filtros + grid con imágenes | DONE |
| T-035.9 | Page DETAIL: split layout + panel puja gold | DONE |
| T-035.10 | Auth pages: card pattern con logo (6 archivos) | DONE |
| T-035.11 | Build verification: BASE/CLIENT exit 0; Admin pre-existing TS2307 error | DONE |
| T-035.12 | Evidence generada; validación visual pendiente (ver test-scenarios.md) | VALIDATION_PENDING |

---

## PT-026 — BUG: BidsService EXTENSION_MS hardcodeado (STANDARD)
**Branch**: `fix/PT-026-bids-soft-close-config` (crear desde master)
**Proposal Package**: `changes/PT-026-bids-soft-close-config/`

| Task | Descripción | Status |
|---|---|---|
| PT-026.1 | Escribir tests RED — soft-close extiende 120s no 300s | PENDING |
| PT-026.2 | Agregar SystemConfigModule a BidsModule.imports | PENDING |
| PT-026.3 | Inyectar SystemConfigService en BidsService constructor | PENDING |
| PT-026.4 | Reemplazar EXTENSION_MS con extensionMs dinámico | PENDING |
| PT-026.5 | Commit + npm test limpio | PENDING |

---

## PT-029 — BUG: Withdraw payment method validation (STANDARD)
**Branch**: `fix/PT-029-withdraw-payment-method-validation` (crear desde master)
**Proposal Package**: `changes/PT-029-withdraw-payment-method-validation/`

| Task | Descripción | Status |
|---|---|---|
| PT-029.1 | Escribir tests RED — getUserPaymentMethod + withdraw 400 | PENDING |
| PT-029.2 | Agregar modelo UserPaymentMethod a schema.prisma | PENDING |
| PT-029.3 | Generar Prisma client (db:generate) | PENDING |
| PT-029.4 | Crear y aplicar migration | PENDING |
| PT-029.5 | Implementar getUserPaymentMethod() en PaymentsService | PENDING |
| PT-029.6 | Activar validación en WalletController.withdraw() | PENDING |
| PT-029.7 | Commits atómicos + npm test limpio | PENDING |

---

## PT-030 — REFACTOR: ThrottlerModule Redis storage (STANDARD)
**Branch**: `refactor/PT-030-throttler-redis-storage` (crear desde master)
**Proposal Package**: `changes/PT-030-throttler-redis-storage/`

| Task | Descripción | Status |
|---|---|---|
| PT-030.1 | Verificar compatibilidad nestjs-throttler-storage-redis | PENDING |
| PT-030.2 | Instalar nestjs-throttler-storage-redis | PENDING |
| PT-030.3 | Actualizar ThrottlerModule en app.module.ts | PENDING |
| PT-030.4 | npm test — sin regresiones | PENDING |
| PT-030.5 | Verificación manual Docker + redis-cli | PENDING |
| PT-030.6 | Commit atómico | PENDING |

---

## PT-027 — FEATURE MAJOR: CFDI/PAC Integration (BLOQUEADO)
**Branch**: pendiente PAC selection
**Bloqueador**: PAC SAT no seleccionado. STATE 2 no puede iniciarse.

---

## PT-033 — BUG: Auth email links apuntan a CLIENT (STANDARD) — CLOSED

---

## PT-034 — BUG: Login cookie no alcanza CLIENT en Docker subdominios (STANDARD) — CLOSED

---

## PT-036 — BUG: Endurecer auth admin (creds default + login sin throttle) (STANDARD) — CLOSED (validado)

Origen: AUD-004. Proposal Package: `changes/PT-036-admin-auth-hardening/`. Rama: `fix/PT-036-admin-auth-hardening`.

| Tarea | Objetivo | Status |
|---|---|---|
| PT-036.1 | Test validateStartupConfig (creds admin) | DONE |
| PT-036.2 | Test throttle login admin (e2e, corre en CI) | DONE |
| PT-036.3 | Extraer validateStartupConfig a función pura | DONE |
| PT-036.4 | Gate de credenciales admin (Gap A) | DONE |
| PT-036.5 | Throttle login admin (Gap B) | DONE |
| PT-036.6 | Comparación timing-safe (Gap C) | DONE |
| PT-036.7 | Docs .env.example | DONE |

**Estado**: VALIDATION_PENDING — validación humana + ejecución del e2e de throttle en CI. Evidencia: `docs/implementation/evidence/PT-036/`.

---

## PT-037 — BUG/REFACTOR: Reconciliación de migraciones (backoffice) + fix moneda (MAJOR) — CLOSED (validado)

Origen: AUD-001 (+ AUD-008). Rama: `fix/PT-037-migration-reconciliation`. Migración: `20260723_reconcile_backoffice_schema_and_currency`.
Mecanismo: migración estándar + baseline `migrate resolve --applied` en entornos existentes.

| Tarea | Objetivo | Status |
|---|---|---|
| PT-037.1 | Generar SQL con migrate diff (shadow DB) | DONE |
| PT-037.2 | Componer migración (SQL diff + backfill moneda) | DONE |
| PT-037.3 | Test PG vacío → 28 tablas/19 enums | DONE |
| PT-037.4 | Test PG db-push + resolve → status limpio | DONE |
| PT-037.5 | Verificar drift 0 (×2) | DONE |
| PT-037.6 | db:generate + tsc + 153 tests | DONE |
| PT-037.7 | Docs (STATE 7: convención, checklist, Registro) | DONE |

**Estado**: VALIDATION_PENDING — verificado en PostgreSQL throwaway (T1–T6). Evidencia: `docs/implementation/evidence/PT-037/`. Baseline pendiente en la BD dev/staging real.

---

## PT-038 — BUG: BFF proxy en CLIENT + corrección de escrituras (MAJOR) — VALIDATION_PENDING

Origen: AUD-003. Rama: `fix/PT-038-client-bff-writes`. Todas las tareas DONE.

| Tarea | Status |
|---|---|
| PT-038.1 Test injectAuthHeader (+jest CLIENT) | DONE |
| PT-038.2 injectAuthHeader + proxy BFF | DONE |
| PT-038.3 Corregir 8 plantillas | DONE |
| PT-038.4 Paridad de rutas (0 mismatches) | DONE |
| PT-038.5 Build CLIENT + typecheck | DONE |
| PT-038.6 Docs (STATE 7) | DONE |

**Estado**: VALIDATION_PENDING — verificado (unit + paridad + build). Evidencia: `docs/implementation/evidence/PT-038/`. E2E runtime pendiente de stack levantado.

---

## Completados (este ciclo)

| PT | Descripción | Status | Branch |
|---|---|---|---|
| PT-026 | BidsService EXTENSION_MS hardcodeado | DONE | fix/PT-026-bids-soft-close-config |
| PT-028 | Investigation H-006 — H1 confirmada | CLOSED | — |
| PT-029 | Withdraw payment method validation | DONE | fix/PT-029-withdraw-payment-method-validation |
| PT-030 | ThrottlerModule Redis storage | DONE | refactor/PT-030-throttler-redis-storage |
| PT-031 | StructuredLogger en PaymentsService | DONE | fix/PT-031-032-trivial-fixes |
| PT-032 | PRD AC-3.2 corregido | DONE | — (gitignored) |
| PT-033 | Auth email links apuntan a BASE | CLOSED | fix/PT-033-auth-email-links |
| PT-034 | Login cookie cross-subdomain Docker | CLOSED | fix/PT-034-cookie-domain-docker |
| PT-069 | KYC obligatorio (gate vendedor/retiro) | CLOSED | merge master |
| PT-070 | Métodos bancarios + validador CLABE | CLOSED | merge master |
| PT-071 | Holdback de liquidación (pendingBalance) | CLOSED | merge master |
| PT-072 | Retiro real con aprobación admin (SPEI manual) | CLOSED | merge master |
| PT-073 | Harness: contrato depósito determinista | CLOSED | fix/PT-073-074-qa-harness-reliability |
| PT-074 | Harness: 31-outbid fuera de secuencia | CLOSED | fix/PT-073-074-qa-harness-reliability |
| PT-075 | Harness: E2E-3 activa antes de aseverar | CLOSED | fix/PT-073-074-qa-harness-reliability |

---

## PT-076 — FEATURE MAJOR: PayPal Orders v2 API + Webhooks — PENDING (Proposal Gate)
**Branch**: `feature/PT-076-paypal-orders-v2` — **NO CREADA** (bloqueada por Proposal Gate)
**Proposal Package**: `changes/PT-076-paypal-orders-v2/`
**Evidence**: `docs/implementation/evidence/PT-076/` (pendiente)

| Task | Descripción | Status |
|---|---|---|
| PT-076.1 | Línea base de regresión (antes de tocar código compartido) | PENDING |
| PT-076.2 | Tests RED: token OAuth2 y `checkStatus()` | PENDING |
| PT-076.3 | Tests RED: `createPayment()` Orders v2 | PENDING |
| PT-076.4 | Tests RED: `handleWebhook()` firma, despacho y captura | PENDING |
| PT-076.5 | Tests RED: service — importe, disponibilidad y dedup | PENDING |
| PT-076.6 | Modelo `ProcessedWebhookEvent` + migración Prisma | PENDING |
| PT-076.7 | `WebhookResult.amount?` (aditivo) | PENDING |
| PT-076.8 | Provider: OAuth2 con cacheo de token | PENDING |
| PT-076.9 | Provider: `createPayment()` Orders v2 | PENDING |
| PT-076.10 | Provider: `handleWebhook()` verificación + captura | PENDING |
| PT-076.11 | Service: importe, cabeceras y disponibilidad | PENDING |
| PT-076.12 | Service: deduplicación transaccional | PENDING |
| PT-076.13 | CLIENT: opciones de depósito dinámicas | PENDING |
| PT-076.14 | Configuración (`PAYPAL_WEBHOOK_ID`) | **BLOCKED** — credenciales |
| PT-076.15 | Prueba E2E real en sandbox | **BLOCKED** — credenciales |
| PT-076.16 | Prueba de reentrega e importe decimal | **BLOCKED** — credenciales |
| PT-076.17 | Regresión completa (suite QA + MP real) | PENDING |
| PT-076.18 | Documentación y ADR | PENDING |

**Bloqueo actual**: Proposal Gate — esperando ACK humano del Proposal Package.
**Bloqueo secundario**: 3 de 18 tareas requieren credenciales de PayPal sandbox + túnel HTTPS.

---

## PT-080 — MIXTO MAJOR: ciclo de pago fiable y modularidad de pasarelas — PENDING (Proposal Gate)
**Branch**: `feature/PT-080-payment-cycle` — **NO CREADA**
**Proposal Package**: `changes/PT-080-payment-cycle/`

| Fase | Tareas | Contenido |
|---|---|---|
| 0 | .1 .2 | Linea base + ampliar arnes (IPN e id numerico) |
| A | .3 .4 .5 | Dos formatos de notificacion, validacion por formato, id canonico, 401 |
| B | .6 .7 .8 .9 .10 .11 .12 .13 | Ciclo persistido, invariante de 3 fases, primera-respuesta-gana, via garantizada, expiracion 72h, cola de anomalias, reconciliacion puntual |
| C | .14 .15 .16 .17 .18 | Puerto de CORE, registro por inyeccion, migracion de adaptadores, reconcilePayments |
| Cierre | .19 .20 | Regresion completa + documentacion |

**20 tareas, 0 bloqueadas.** No requiere tunel ni credenciales de PayPal.
**Bloqueo actual**: Proposal Gate — esperando ACK humano.

## PT-082 — MENOR: limpieza de CORE y retencion de datos — PENDING
- `dist/` obsoleto de CORE (`ProcessPaymentUseCase` documentado sin fuente) + corregir
  `06-Backend-Architecture.md:169`.
- Politica de purga de `processed_webhook_events` y `payment_cycle_event`.

## PT-083 — BUG TRIVIAL: cobertura de la puerta KYC en withdrawals.request — PENDING
- Misma ADR-021 que PT-079; sin verificar si tiene cobertura.

## PT-084 — REFACTOR: cablear los use-cases de CORE (ADR-008 / AUD-012) — PENDING
- Los cuatro use-cases de CORE no se usan. Afecta mas alla de pagos.
