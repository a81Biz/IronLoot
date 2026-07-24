# Registro de Hallazgos — Auditoría Documental IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Auditoría integral documentación↔código (Fases 1–5) |
| **Fuente** | `docs/`, `PTSA/`, `changes/`, `src/`, `prisma/`, `graphify-out/`, `docker-compose.yml`, `.env.example`, `src/nginx/` |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | Artefactos crudos `audit/raw/A..F` (cada afirmación citada `archivo:línea`) |
| **Código usado** | `src/api`, `src/apps/base`, `src/apps/client`, `src/admin`, `src/packages/core`, `prisma/schema.prisma` + 14 migraciones |
| **Nivel de confianza** | **Alto** — todo hallazgo trazado a evidencia con cita. Los marcados *(no verificado en runtime)* son inferencias estáticas. |
| **Regla de resolución** | En conflicto doc↔código, **gana el código** (decisión del usuario). El desajuste se registra como hallazgo. |

## Clasificación de severidad

- **CRÍTICA** — rompe una operación de negocio, una garantía financiera o de seguridad; o hace que un despliegue estándar falle.
- **ALTA** — contradicción doc↔código en una regla de negocio/seguridad, o riesgo financiero/legal sin salvaguarda.
- **MEDIA** — inconsistencia documental relevante, deuda técnica con impacto, o brecha de cobertura.
- **BAJA** — higiene documental, enlaces muertos, inconsistencias cosméticas.

---

## Tabla resumen

| ID | Sev | Título | Tipo | Doc afectado | Código afectado |
|---|---|---|---|---|---|
| AUD-001 | CRÍTICA | ~46% de modelos sin migración; `migrate deploy` deja media BD sin crear | Código/Infra | 07-Database, inventory/entities | `prisma/schema.prisma`, `prisma/migrations/*` |
| AUD-002 | CRÍTICA | Flujo de puja roto en frontend: sin página de puja ni cliente Socket.io | Funcional | 04-App-Flow, 05-UIUX, CLAUDE.md | `apps/base/.../detail.html`, `apps/client/src/app.controller.ts` |
| AUD-003 | CRÍTICA | 8 acciones de escritura de CLIENT sin ruta de autenticación válida | Funcional | 05-UIUX, 09-Security | `apps/client/views/pages/*`, `apps/client/src/main.ts` |
| AUD-004 | CRÍTICA | Admin con credenciales estáticas por defecto y login sin throttle | Seguridad | 09-Security | `admin-auth.controller.ts`, `admin-dual-auth.guard.ts` |
| AUD-005 | CRÍTICA | Dos mecanismos de comisión en paralelo (10% fijo vs configurable no cableado) | Dominio/Dinero | 02-PRD, 01-Overview | `wallet.service.ts:285`, `commissions.service.ts:46` |
| AUD-006 | ALTA | Gateways WebSocket sin autenticación (guard comentado) | Seguridad | 08-API-Catalog, 06-Backend | `auctions.gateway.ts`, `events.gateway.ts` |
| AUD-007 | ALTA | ADMIN sin Helmet/CSP ni CSRF (superficie más privilegiada) | Seguridad | 09-Security | `src/admin/src/main.ts` |
| AUD-008 | ALTA | `payments.currency` con default DB `'USD'` vs esquema `MXN` | Dinero/Datos | 07-Database, 03-TRD | `migrations/20260106123540...:13`, `schema.prisma:304` |
| AUD-009 | ALTA | Incremento mínimo de puja configurado (`=10`) pero no aplicado por el código | Dominio | 02-PRD (AC-2.2), 03-TRD | `bid-validation.ts:35`, `system-config.service.ts:29-36` |
| AUD-010 | ALTA | Resolución de disputa no mueve dinero (solo cambia estado + nota) | Dominio | 04-App-Flow §6, 02-PRD §1.6 | `admin.service.ts:868-891` |
| AUD-011 | ALTA | Admin salta las máquinas de estado (prisma.update crudo) | Dominio/Integridad | 11-Conventions, 06-Backend | `admin.service.ts:114,409,421,875-899` |
| AUD-012 | ALTA | Casos de uso de `core` probados pero NO cableados → falsa confianza | Integridad de pruebas | 06-Backend §7, inventory/services | `packages/core/application/*`, `src/api` |
| AUD-013 | ALTA | Servicios `commissions` y `refunds` de producción con 0 tests | Cobertura/Dinero | — (Master Test Plan inexistente) | `commissions.service.ts`, `refunds.service.ts` |
| AUD-014 | ALTA | Contradicción CSRF: CLAUDE.md/CHANGELOG afirman doble-cookie; 09-Security lo niega; ADMIN no tiene ninguno | Doc↔Código | CLAUDE.md, CHANGELOG, 09-Security | `apps/*/src/main.ts`, `src/admin/src/main.ts` |
| AUD-015 | ALTA | Invariante de fondos retenidos incorrecta persiste en artefacto PTSA F-1 | Doc contradictoria | PTSA `F-1` CR-002 vs 02-PRD AC-3.2 | `wallet.service.ts` (comportamiento correcto) |
| AUD-016 | ALTA | CFDI/PAC no funcional (lanza NotImplemented) — bloquea operación fiscal MX | Dominio/Legal | 10-Tech-Debt TD-001, H-005 | `cfdi.service.ts:33-67` |
| AUD-017 | MEDIA | No existe script de seed pese a `db:seed` definido | Infra | README setup | `package.json:29` |
| AUD-018 | MEDIA | Dos crons de limpieza en conflicto (90d vs 30d) truncan el audit log | Observabilidad | 09-Security (audit), 06-Backend | `scheduler/system-cleanup.service.ts`, `system-cleanup/system-cleanup.service.ts` |
| AUD-019 | MEDIA | `UserPaymentMethod` (PT-029) sin documentar en la doc de BD | Doc desactualizada | 07-Database, inventory/entities | `schema.prisma:885-896` |
| AUD-020 | MEDIA | `10-Technical-Debt.md` obsoleto (ND-002, TD-003 ya resueltos) | Doc obsoleta | 10-Technical-Debt, inventory/integrations | PT-029, PT-030 |
| AUD-021 | MEDIA | Inconsistencias internas PTSA (CR#↔significado, H-005↔P-009, tarjetas P-* en BORRADOR) | Auditoría incoherente | PTSA `F-1`, `F6`, `H-005`, `Productos/P-*` | — |
| AUD-022 | MEDIA | Conteo de módulos API 27 vs 23 enumerados (confundido con nº de modelos) | Doc inconsistente | 06-Backend, inventory/components, CLAUDE.md | `src/api/src/modules/` (27 reales) |
| AUD-023 | MEDIA | HeyBanco (3er proveedor de pago) sin documentar; hiperarista Graphify mal etiquetada "Stripe" | Doc↔Código | CLAUDE.md, `.env.example` | `payments/providers/heybanco.provider.ts` |
| AUD-024 | MEDIA | "Integración de tracking de transportista" sobredimensionada (solo campos manuales) | Doc↔Código | 04-App-Flow, CLAUDE.md | `shipments/*`, `dto/create-shipment.dto.ts` |
| AUD-025 | MEDIA | Diagnostics expuesto solo por `DevelopmentOnlyGuard` con TODO de restringir en prod | Seguridad | 10-Tech-Debt | `diagnostics.controller.ts:19-20` |
| AUD-026 | MEDIA | CLIENT revalida JWT localmente con secreto compartido; default débil `'change-me'` | Seguridad | 09-Security | `apps/client/.../client-auth.guard.ts:6` |
| AUD-027 | MEDIA | Dos rutas de config SMTP (`MAIL_*` vs `SMTP_*`) — riesgo de drift | Config | inventory/integrations | `notifications.module.ts`, `system-config.service.ts` |
| AUD-028 | MEDIA | CI invoca scripts en raíz sin scripts en `package.json` raíz; husky solo cubre API | CI/CD | 06-Backend (build), README | `.github/workflows/ci.yml`, `.husky/pre-commit` |
| AUD-029 | MEDIA | No existe glosario único / lenguaje ubicuo consolidado | Doc faltante | (todos) | — |
| AUD-030 | BAJA | Convención JS `public/js/pages/` de CLAUDE.md no existe (todo inline) | Doc↔Código | CLAUDE.md, 11-Conventions | `apps/*/views/pages/*.html` |
| AUD-031 | BAJA | Skew de estado FDGE (DISCOVERY vs HISTORY vs PENDING_TASKS); CHANGELOG parado en 0.5.1 | Doc higiene | DISCOVERY, PENDING_TASKS, CHANGELOG | — |
| AUD-032 | BAJA | Plantilla huérfana `auctions-gate.html`; enlace muerto `/contact`; "Ver sitio" admin puerto 5173 | Doc↔Código | 05-UIUX | `apps/client/.../auctions-gate.html`, `base.html:79`, `admin.html:153` |
| AUD-033 | BAJA | Endpoint manual de creación de orden deshabilitado (código muerto) | Código | 08-API-Catalog | `orders.controller.ts:16-26` |
| AUD-034 | BAJA | Versionado no unificado en el monorepo (1.0.0 / 0.5.1 / 0.1.0) | Config | CHANGELOG | `*/package.json` |
| AUD-035 | BAJA | maxAge de cookie (7d/30d) vs TTL de JWT (15m/7d) nunca reconciliados en un solo lugar | Doc confusa | 04-App-Flow, 09-Security | `apps/base/src/main.ts` |
| AUD-036 | BAJA | Acoplamiento cruzado: página admin dispute-detail usa helpers de la app CLIENT | Código | 06-Backend | `admin/.../dispute-detail.html`, `client/src/app.controller.ts` |

**Totales:** 5 CRÍTICA · 11 ALTA · 13 MEDIA · 7 BAJA = **36 hallazgos**.

---

## Detalle — CRÍTICA

### AUD-001 — ~46% de modelos sin migración (drift esquema↔migraciones)
- **Descripción:** 11 de 24 modelos (`Watchlist`, `SystemConfig`, `CommissionConfig`, `CommissionRecord`, `ModerationLog`, `CfdiRecord`, `KycSubmission`, `NotificationCampaign`, `RefundRequest`, `SeoConfig`, `CmsContent`) y sus 9 enums no tienen `CREATE TABLE` en ninguna migración. Además `AuctionStatus.SUSPENDED`/`PENDING_MODERATION` y `PaymentProvider.HEY_BANCO` nunca se añaden vía `ALTER TYPE`.
- **Ubicación:** `prisma/schema.prisma` vs `prisma/migrations/*`.
- **Evidencia:** `audit/raw/C-database.md §5.1–5.2` (grep de cada tabla en migraciones → 0 hits). Causa raíz: `package.json:27` expone `db:push`; el conjunto ausente coincide exactamente con el backoffice v1 → se usó `prisma db push` contra una BD compartida en vez de generar migraciones.
- **Impacto:** Un entorno provisionado con `prisma migrate deploy` (CI/prod, `package.json:25`) **carece de ~la mitad del esquema**. Despliegue reproducible roto.
- **Recomendación:** Generar una migración de reconciliación (`prisma migrate diff` desde el estado real → nueva migración) que cree las 11 tablas + 9 enums + 3 valores de enum; prohibir `db push` fuera de prototipado; documentar en DevOps/Modelo de Datos.

### AUD-002 — Flujo de puja roto en el frontend
- **Descripción:** La "puja en tiempo real" es la característica insignia, pero no hay UI funcional. `apps/base/.../auctions/detail.html:69` "Pujar ahora" enlaza a `{{clientUrl}}/auctions/{id}`, ruta que **no existe** en CLIENT (`app.controller.ts` solo define `/auctions/won-auctions|watchlist|create|:id/edit`). No hay página de puja ni cliente Socket.io en `src/apps/client` (grep `socket.io`/`placeBid`/`io(` = 0).
- **Ubicación:** `apps/base/views/pages/auctions/detail.html:69`; `apps/client/src/app.controller.ts:69-196`.
- **Evidencia:** `audit/raw/D-frontend.md §6.1`.
- **Impacto:** Un usuario no puede pujar desde la UI; la propuesta de valor central no es operable end-to-end. El endpoint API `POST /auctions/:auctionId/bids` existe (`bids.controller.ts:18`) pero es inalcanzable desde el frontend.
- **Recomendación:** Implementar la página de detalle/puja en CLIENT con integración Socket.io (`auctions` namespace, eventos `bid:new`/`auction:extended`/`auction:ended`). Registrar como caso de uso pendiente en la matriz de trazabilidad.

### AUD-003 — 8 acciones de escritura de CLIENT sin ruta de auth válida
- **Descripción:** Los scripts inline de CLIENT (settings, profile, wallet deposit/withdraw, auction create/edit, dispute create, seller onboarding) hacen `fetch(API + '/api/v1/...', {credentials:'include'})` **cross-origin** al API. El API solo lee `Authorization: Bearer` (`jwt.strategy.ts:20`, `fromAuthHeaderAsBearerToken()`), nunca cookies; y `access_token` es `httpOnly` (ilegible por JS). CLIENT no tiene proxy `/api` (a diferencia de BASE `main.ts:73-120`), pese a un comentario que afirma lo contrario (`client/src/main.ts:23-25`).
- **Ubicación:** `apps/client/views/pages/{settings,profile,wallet/deposit,wallet/withdraw,auction/create,auction/edit,disputes/create,seller/onboarding}.html`.
- **Evidencia:** `audit/raw/D-frontend.md §3, §6.3`.
- **Impacto:** Depósito, retiro, creación de subasta, apertura de disputa y onboarding de vendedor **no pueden autenticarse** desde la UI *(no verificado en runtime, pero la ruta de auth no existe en el código)*.
- **Recomendación:** Añadir a CLIENT el mismo proxy BFF de BASE (inyección server-side de `Authorization`), o mover estas escrituras a rutas SSR proxied. Reconciliar el comentario de `main.ts`.

### AUD-004 — Admin: credenciales estáticas por defecto + login sin throttle
- **Descripción:** El login admin compara contra `ADMIN_USERNAME`/`ADMIN_PASSWORD` (defaults `admin`/`admin`) y el guard de API acepta `X-Admin-Key` con default `dev-admin-key`. El endpoint de login admin es `@SkipThrottle()` → sin límite de fuerza bruta.
- **Ubicación:** `admin-auth.controller.ts:15,42-47`; `admin-dual-auth.guard.ts:53`; `admin-api-key.guard.ts:11`.
- **Evidencia:** `audit/raw/B-api-backend.md §7.7`; `audit/raw/D-frontend.md §4 (ADMIN)`.
- **Impacto:** Si el entorno no sobrescribe las envs, el backoffice completo (baneos, resolución de disputas, config de comisiones, campañas) es accesible con credenciales conocidas y sin protección anti-fuerza-bruta.
- **Recomendación:** Falla de arranque si las credenciales admin son placeholder (extender la puerta de secretos CR-011 al set admin); aplicar throttling al login admin; rotar/forzar `ADMIN_API_KEY`.

### AUD-005 — Dos mecanismos de comisión en paralelo
- **Descripción:** En la captura al cierre se cobra un **10% hard-coded** (`wallet.service.ts:285`, ledger `FEE_PLATFORM`). En paralelo existe `CommissionsService` **configurable** (override por vendedor → global → default 10; `commissions.service.ts:37-47`) que **no está cableado** en el flujo de cierre — es sólo admin/reporte.
- **Ubicación:** `wallet.service.ts:285`; `commissions.service.ts:12-114`.
- **Evidencia:** `audit/raw/B-api-backend.md §7.4, reglas 10/20`; `audit/raw/F-core-tests.md §5.1`.
- **Impacto:** La comisión realmente cobrada ignora la configuración de la plataforma; riesgo de doble conteo (registro de comisión + fee de captura) o de cobro incorrecto. `CommissionsService` no tiene tests (AUD-013).
- **Recomendación:** Unificar: cablear `CommissionsService.calculateForOrder` en el flujo de captura, o eliminar uno. Definir la regla canónica en el Catálogo de Reglas. Añadir tests de la matemática de comisión.

---

## Detalle — ALTA (resumen por hallazgo)

- **AUD-006 — WebSocket sin auth.** `JwtAuthGuard` comentado (`auctions.gateway.ts:9-11`); cualquier cliente entra a `auction:<id>` y recibe el flujo de pujas. *Rec:* re-activar guard o autenticar el handshake. Ev: `B §7.6`.
- **AUD-007 — ADMIN sin Helmet/CSP/CSRF.** `src/admin/src/main.ts` no llama `helmet()`, no fija CSP, sin token CSRF; cookie de sesión sin `sameSite` explícito. Toda acción privilegiada (banear, force-close, resolver disputa) depende del default del navegador. *Rec:* añadir helmet+CSP y CSRF (doble-cookie o `csrf-csrf`, ya presente como dependencia según Graphify). Ev: `D §6.6-6.7`.
- **AUD-008 — Moneda de pagos.** `payments.currency` default DB `'USD'` (`migration ...123540:13`), nunca migrado a MXN, mientras `schema.prisma:304` declara MXN. Contradice el estándar "MXN global". `wallets.currency` sí se corrigió (migración 12). *Rec:* migración que fije `DEFAULT 'MXN'` en `payments` (y verificar `refund_requests`). Ev: `C §5.5, §6`.
- **AUD-009 — Incremento mínimo de puja no aplicado.** Existe config `AUCTION_MIN_INCREMENT_AMOUNT=10` (`system-config.service.ts:29-36`) pero `BidValidation` sólo exige `> currentPrice` (`bid-validation.ts:35`); el "+1" es sólo un hint del mensaje de error. Una regla de negocio declarada no se cumple. *Rec:* aplicar el incremento en `bids.service`/core y fijar el valor canónico en el Catálogo de Reglas. Ev: `B regla 1`, `F §1.2`, `E §4`.
- **AUD-010 — Disputa no mueve dinero.** `resolveDisputeFavorBuyer` sólo pone RESOLVED + nota "Initiate refund via POST /admin/refunds" (`admin.service.ts:868-891`). *Rec:* documentar el proceso manual en el Manual del Administrador o automatizar el reembolso. Ev: `B §7.3`.
- **AUD-011 — Admin salta máquinas de estado.** cancel/approve/reject/suspend/force-close/reopen y resolución de disputa escriben estado con `prisma.update` crudo, sin `canTransition` (`admin.service.ts:114,409,421,875-899`) → transiciones inválidas posibles. *Rec:* enrutar mutaciones admin por las FSM de core. Ev: `B §4, §7.8`.
- **AUD-012 — Casos de uso de core no cableados.** `PlaceBid/CloseAuction/ProcessPayment/ProcessRefund` (23 tests) nunca se importan en `src/api` (grep=0); la orquestación real se re-implementa en `bids.service`/`scheduler`/`payments.service`/`refunds.service`. Los tests dan falsa confianza. *Rec:* cablear los use-cases o retirar el código muerto y trasladar la cobertura a los paths reales. Ev: `F §2.10, gap 3`.
- **AUD-013 — commissions/refunds sin tests.** Ambos servicios de producción (rutas de dinero) tienen 0 specs; sólo el `ProcessRefundUseCase` no-cableado está probado. *Rec:* tests de over-refund, refund-desde-estado-inválido, cálculo de comisión. Ev: `F §5 gaps 1-2`.
- **AUD-014 — Contradicción CSRF.** CLAUDE.md ("Helmet + CSRF double-submit cookies") y CHANGELOG ("Added Double-Submit Cookie protection") afirman CSRF; `09-Security §6` dice que no se usa ni se necesita; ADMIN no tiene ninguno (AUD-007). Graphify incluso lista un hiperarista "SSR CSRF Protection (csrf-csrf)". *Rec:* decidir la postura real, implementarla en ADMIN, y unificar la doc. Ev: `A CONFLICT-03`, `D §4`, `E §1`.
- **AUD-015 — Invariante de fondos retenidos incorrecta en PTSA F-1.** `F-1` CR-002 afirma `held_funds <= balance` como invariante permanente — exactamente el bug que PT-032 corrigió. `02-PRD AC-3.2` (post-fix) dice que tras el bloqueo held **puede** exceder el balance restante; `07-Database` lo confirma. El artefacto de auditoría quedó desincronizado. *Rec:* corregir F-1; el Catálogo de Reglas debe enunciar la invariante correcta. Ev: `A CONFLICT-02`.
- **AUD-016 — CFDI/PAC no funcional.** `generate()` escribe registro ERROR/PENDING y lanza `NotImplementedException` (`cfdi.service.ts:33-67`); no hay proveedor PAC concreto. Bloquea la facturación fiscal legal en México. *Rec:* mantenerlo explícito como pendiente bloqueante en el Roadmap de Negocio y el Registro de Deuda; no documentarlo como capacidad existente. Ev: `B §7.1`, `E §5`, PTSA H-005.

---

## Detalle — MEDIA (condensado)

- **AUD-017** No hay seed (`prisma.seed` sin config, sin `seed*.ts`); `npm run db:seed` falla hoy. Ev: `C fuentes`.
- **AUD-018** Dos crons `EVERY_DAY_AT_MIDNIGHT` borran `AuditEvent` con retención 90d vs 30d → retención efectiva 30d, truncando el log inmutable más de lo previsto. Ev: `B §7.5`.
- **AUD-019** `UserPaymentMethod` (PT-029, `schema.prisma:885-896`) ausente de `07-Database` e `inventory/entities.md`. Ev: `A gap 2`, `C`.
- **AUD-020** `10-Technical-Debt.md` lista como abiertos ND-002 (throttler, resuelto PT-030) y TD-003 (retiro mock, resuelto PT-029); `inventory/integrations.md:68,102` idem. Ev: `A gap 3`.
- **AUD-021** PTSA incoherente: CR-002/CR-009 significan reglas distintas en `F-1` vs `F6`; `H-005` (CFDI) enlazado a `P-009` (=Ledger) en vez de `P-012`; tarjetas `Productos/P-*` congeladas en `BORRADOR`/`confidence:0` pese a que F6 corrió. Ev: `A CONFLICT-01/04, gap 4`.
- **AUD-022** Conteo de módulos API: CLAUDE.md/06-Backend/inventory dicen "27" pero enumeran 23 (confundido con nº de modelos Prisma). Los 27 directorios de `src/api/src/modules/` sí existen (Graphify 27/27); el desajuste es entre el número citado y la tabla enumerada. Ev: `A CONFLICT-05`, `E §2`.
- **AUD-023** HeyBanco: 3er proveedor real (`heybanco.provider.ts`) no mencionado en CLAUDE.md ("PayPal + Mercado Pago") ni en `.env.example`; hiperarista Graphify etiqueta "Stripe" (obsoleto). Ev: `E §1, §5`.
- **AUD-024** Shipments: "Carrier tracking integration" es en realidad captura manual de `carrier`/`trackingNumber` (DTO); sin API de transportista. Ev: `E §5`.
- **AUD-025** Diagnostics: sólo `DevelopmentOnlyGuard`, comentario `TODO: restrict in production`; expone logs/audit/metrics. Ev: `B §7.10`.
- **AUD-026** CLIENT revalida el JWT con `jsonwebtoken.verify(token, JWT_SECRET)` (`client-auth.guard.ts:22`) → requiere `JWT_SECRET` idéntico en API y CLIENT; default `'change-me'`. Ev: `D §4`.
- **AUD-027** Dos rutas SMTP: `MAIL_*` (consumida por `notifications.module.ts`) vs `SMTP_*` (seed en `system-config`). Riesgo de drift. Ev: `E §4`.
- **AUD-028** CI ejecuta `npm run lint/test/build` en la raíz, pero el `package.json` raíz no define esos scripts (workspaces sólo `apps/*`+`packages/*`, no `src/api`/`src/admin`); husky sólo lint/typecheck de API. *(No verificado contra logs de CI reales.)* Ev: `E §7`.
- **AUD-029** No hay glosario único; términos (soft-close, BFF, held funds, producto-PTSA vs entidad) definidos ad hoc en múltiples docs. Ev: `A §2.d, gap 1`.

## Detalle — BAJA (condensado)

- **AUD-030** Convención `public/js/pages/*.js` de CLAUDE.md no existe; todo el JS es inline en plantillas. Ev: `D §6.9`.
- **AUD-031** Skew de estado: `DISCOVERY` marca PT-033/034 `DISCOVERY_PENDING` vs `HISTORY`/`HANDOFF` CLOSED; `PENDING_TASKS` con tareas en PENDING y DONE a la vez; CHANGELOG parado en 0.5.1 (aún describe el `web/` eliminado). Ev: `A gap 5-6`.
- **AUD-032** `auctions-gate.html` huérfano; enlace `/contact` sin ruta (`base.html:79`); "Ver sitio" admin apunta a `:5173` en vez de `:5174` (`admin.html:153`). Ev: `D §6.2,6.4,6.5`.
- **AUD-033** Endpoint manual `POST /orders` comentado/deshabilitado, servicio aún alcanzable (`orders.controller.ts:16-26`). Ev: `B §7.9`.
- **AUD-034** Versiones no unificadas: monorepo/admin `1.0.0`, api `0.5.1`, base/client/core `0.1.0`. Ev: `E §7`.
- **AUD-035** maxAge de cookie (7d/30d) vs TTL JWT (15m/7d) nunca reconciliados en un lugar → lectura potencialmente contradictoria. Ev: `A CONFLICT-07`.
- **AUD-036** Acoplamiento sorprendente: `admin/.../dispute-detail.html` usa `apiGet()`/`getToken()` definidos en `apps/client/src/app.controller.ts`. Ev: `E §1`.

---

*Fin del Registro de Hallazgos. Los hallazgos de dominio/seguridad (AUD-002..005, 009, 010, 013, 016) no deben cerrarse sin validación humana ni evidencia post-fix.*
