# CONTEXT_ANALYSIS.md — Análisis de contexto arquitectural
**FDGE V3 | Append por sesión**

---

## Sesión 2026-06-23 — Promoción masiva FPGE R-001 a R-007 → PT-026 a PT-032

### Contexto arquitectural compartido

Todos los PTs de esta sesión emergen de la auditoría PTSA S-001. El contexto arquitectural base está documentado en `docs/enterprise-documentation/` (Foundation VALIDATED 2026-06-23).

**Servicios afectados en esta sesión:**

| Servicio | PT(s) que lo tocan | Observación |
|---|---|---|
| `BidsService` | PT-026 | Modificación de lógica de soft-close |
| `PaymentsService` | PT-029, PT-031 | Añadir método + corregir logger |
| `WalletController` | PT-029 | Des-comentar validación + llamar nuevo método |
| `AppModule` (ThrottlerModule) | PT-030 | Cambio de storage backend |
| `CLIENT AppController` | PT-028 (investigación) | Read-only durante investigación |
| `PRD 02-PRD.md` | PT-032 | Corrección documental |

---

### Análisis por PT

#### PT-026 — BidsService soft-close

**Patrón correcto (ya existe en AuctionSchedulerService)**:
```typescript
// AuctionSchedulerService — patrón a replicar:
private getSoftCloseWindowSec(): number {
  const config = await this.systemConfigService.getConfig();
  return config.auctionSoftCloseWindowSec ?? 120;
}
```

**Cambio mínimo necesario en BidsService**:
- Inyectar `ConfigService` o `SystemConfigService`
- Reemplazar `EXTENSION_MS = 5 * 60 * 1000` por lectura de config × 1000
- El scheduler ya tiene el patrón correcto — replicar

**Riesgos**:
- NINGUNO significativo: cambio de valor de configuración, no de lógica. Test existente que fije la extensión a 300s fallará (red) → corrección esperada en tests.

**Dependencias**: `SystemConfigService` ya disponible en el módulo — solo añadir al constructor de `BidsService` si no está.

---

#### PT-027 — CFDI/PAC Integration

**Contexto MAJOR**:
- Módulo `CfdiModule` / `CfdiService` existe pero es stub completo
- Schema `cfdi_records` existe en `schema.prisma` con campos: `order_id`, `folio`, `uuid`, `xml_content`, `status`, `error_message`
- La integración requiere un PAC externo certificado por el SAT mexicano
- Impacto en: `OrdersService` (trigger de emisión de CFDI post-Order), `CfdiService` (implementación real), posiblemente un BullMQ job para emisión asíncrona

**Riesgo de regresión**: ALTO — tocar OrdersService puede afectar el flujo crítico de post-subasta. Requiere análisis de regresión exhaustivo en STATE 2.

**Dependencias externas**: Contrato con PAC (Finkok, SIFEI, o Edicom) — fuera del control del código.

---

#### PT-028 — CLIENT auth browser investigation

**Contexto de investigación**:
El patrón BFF documentado prohíbe tokens en JS browser. La implementación actual en server-side es correcta. La duda es el JS del browser.

**Arquitectura de referencia** (`06-Backend-Architecture.md`):
> "JWT tokens stored in HttpOnly cookies; Client-side JavaScript never has direct access to tokens"

Si H1 (segura) es confirmada: la arquitectura real cumple el invariante (cookies se envían automáticamente con `credentials: 'include'`).
Si H2 (insegura) es confirmada: requiere RFC (Request for Change) arquitectural — las páginas de wallet deben migrar a servidor o usar proxy BFF.

---

#### PT-029 — Withdraw payment method validation

**Contexto del modelo de datos**:
Schema a verificar: ¿existe tabla `payment_methods` o `user_payment_methods` en `schema.prisma`? 
Si existe → `getUserPaymentMethod()` es una query directa a esa tabla.
Si no existe → el PT incluye también crear el modelo de datos y su migration (scope aumenta a MAJOR).

**Dependencia crítica para STATE 2**: Verificar `schema.prisma` antes de diseñar la solución.

---

#### PT-030 — ThrottlerModule Redis

**Dependencia de npm**:
```bash
npm install @nestjs-throttler-storage-redis
```
(o `nestjs-throttler-storage-redis` dependiendo de versión compatible con `@nestjs/throttler` instalado)

**Cambio en AppModule**:
```typescript
// Antes:
ThrottlerModule.forRootAsync({ useFactory: ... })

// Después (patrón):
ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    throttlers: [...],
    storage: new ThrottlerStorageRedisService(redisOptions),
  }),
})
```

**Riesgo de regresión**: BAJO — el comportamiento observable (429) es idéntico. Riesgo en tests: si tests E2E lanzan múltiples instancias, el Redis compartido puede afectar los contadores entre tests. Verificar en `test:e2e`.

---

#### PT-031 — StructuredLogger en PaymentsService (TRIVIAL)

**Cambio**:
```typescript
// Antes:
import { Logger } from '@nestjs/common';
private readonly logger = new Logger(PaymentsService.name);

// Después:
import { StructuredLogger } from '../../common/observability';
private readonly logger = new StructuredLogger(PaymentsService.name);
```

Verificar path exacto de `StructuredLogger` en el proyecto (usar path relativo desde payments.service.ts).

---

#### PT-032 — PRD AC-3.2 correction (TRIVIAL)

**Cambio**:
- Archivo: `docs/enterprise-documentation/02-PRD.md`
- Línea: AC-3.2
- Antes: `AC-3.2: Held funds cannot exceed balance`
- Después: `AC-3.2: Held funds cannot exceed available balance at the time of locking (canLockFunds check). After locking, held_funds may exceed remaining balance.`

---

## Sesión 2026-06-23 — PT-033: Auth email links apuntan a CLIENT

### Contexto arquitectónico

El bug afecta exclusivamente el módulo de email transaccional y su interacción con el routing de servicios SSR. Ningún componente de negocio (bids, wallet, auctions) está involucrado.

**Mapa de dependencias relevante:**

```
AuthController
  → AuthService.register() / forgotPassword()
      → EmailService.sendVerificationEmail() / sendPasswordResetEmail()
          → this.frontendUrl + '/auth/verify-email?token=...'
          → this.frontendUrl + '/auth/reset-password?token=...'
          ← ConfigService.get('CLIENT_URL')  ← BUG: debería ser BASE_URL
```

**Rutas existentes por servicio:**

| Ruta | BASE (:5174) | CLIENT (:5175) |
|---|---|---|
| `GET /auth/verify-email` | ✅ Existe (Public) | ❌ No existe → 404 |
| `GET /auth/reset-password` | ✅ Existe (Public) | ❌ No existe → 404 |
| `GET /auth/login` | ✅ Existe (Public) | ❌ No existe |
| `GET /auth/logout` | ❌ No existe | ✅ Existe |

**Comportamiento del ClientAuthGuard vs NotFoundExceptionFilter:**

En NestJS, la secuencia cuando una ruta no existe en CLIENT es:
1. Router no encuentra match → lanza `NotFoundException` *antes* de invocar guards
2. `NotFoundExceptionFilter` captura la excepción
3. Renderiza `pages/404.html` (extiende `layouts/client.html` → sidebar siempre visible)
4. **Los guards NO se ejecutan para rutas inexistentes** → ni ClientAuthGuard ni ningún otro

Esto significa que incluso usuarios no autenticados ven el 404 con sidebar en CLIENT.

**Variables de entorno relevantes:**

| Variable | Definida en | Servicio que la consume | Uso |
|---|---|---|---|
| `BASE_URL` | `docker-compose.yml:279` (servicio `client`) | CLIENT `app.controller.ts:6` | Redirect post-logout |
| `CLIENT_URL` | `docker-compose.yml:236` (servicio `base`) | BASE `app.controller.ts:5` | Links a CLIENT desde BASE |
| `CLIENT_URL` (incorrecta) | NO definida para el servicio `api` | `email.service.ts:17` | Construir auth email links |

La variable `BASE_URL` **no está definida en el bloque `environment` del servicio `api`** en docker-compose. El servicio `api` usa `env_file: ./src/api/.env` (archivo local, gitignored) — si ese archivo no define `BASE_URL`, `EmailService` usa el default `http://localhost:5173` (puerto incorrecto).

**BFF proxy y formularios de auth:**

Los templates de auth en BASE llaman al API vía ruta relativa (ej. `fetch('/api/v1/auth/verify-email', ...)`). El BFF proxy en `src/apps/base/src/main.ts` intercepta `/api/*` y reescribe la ruta:
- `pathRewrite: { '^/': '/api/' }` + Express mount en `/api`
- Browser: `POST /api/v1/auth/verify-email` → proxy recibe `/v1/auth/verify-email` → reescribe a `/api/v1/auth/verify-email` → API `http://localhost:3000/api/v1/auth/verify-email` ✓

Los formularios funcionan correctamente **cuando el usuario llega a BASE**. El problema es aguas arriba: el email no lleva al usuario a BASE.

**Archivos con riesgo extra (Convenciones 11):**

| Archivo | Riesgo | Consideración |
|---|---|---|
| `src/apps/base/src/main.ts` | HIGH | Bootstrap entry point — registrar filtro con `app.useGlobalFilters()` |
| `docker-compose.yml` | MEDIUM | Agregar var en bloque correcto (servicio `api`, no `base`) |

**Patrón correcto para registrar NotFoundExceptionFilter en BASE:**
```typescript
// src/apps/base/src/main.ts — agregar después de app.use(cookieParser())
import { NotFoundExceptionFilter } from './common/filters/not-found.filter';
// ...
app.useGlobalFilters(new NotFoundExceptionFilter());
```

Exactamente como ya está en `src/apps/client/src/main.ts:20-21`.

**Patrón correcto para EmailService:**
```typescript
// src/api/src/modules/notifications/email.service.ts:17
// ANTES (bug):
this.frontendUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:5173');
// DESPUÉS (corrección):
this.frontendUrl = this.configService.get<string>('BASE_URL', 'http://localhost:5174');
```

**Consideración de datos:** Usuarios que se registraron mientras el bug estaba activo permanecen en estado `PENDING_VERIFICATION`. La corrección del código no desbloquea esas cuentas retroactivamente. Se necesita un script de resend de verificación o un endpoint admin para re-enviar emails. Esto es out-of-scope de este PT pero debe registrarse.

**Sin cambios en schema, tests de integración ni módulos nuevos requeridos.**

---

## Sesión 2026-06-23 — PT-034: Login cross-subdomain cookie scope

### Contexto arquitectónico

El bug PT-034 emerge de la intersección entre el patrón BFF (BASE) y el patrón Direct API Call (CLIENT), que requieren compartir cookies HttpOnly entre subdominios distintos.

**Flujo completo bajo subdominios Docker:**

```
Browser → base.localhost/api/v1/auth/login
            ↓ BFF proxy (main.ts)
         api:3000/api/v1/auth/login
            ↓ 200 { accessToken, refreshToken, user }
         BFF responseInterceptor
            ↓ expressRes.cookie('access_token', token, COOKIE_OPTIONS)
            ↓ COOKIE_OPTIONS.domain = undefined (COOKIE_DOMAIN vacío)
            ← Cookie: access_token; Path=/; HttpOnly; SameSite=Lax
                        ← scope: base.localhost ÚNICAMENTE

Browser → client.localhost/dashboard
            ↓ NO envía access_token (subdomain diferente)
         ClientAuthGuard
            ↓ req.cookies.access_token = undefined
            ← res.redirect('http://base.localhost/auth/login')
```

**Diagnóstico de main.ts (BASE) — código relevante:**
```typescript
// src/apps/base/src/main.ts:22-29
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: (process.env.COOKIE_SAMESITE || 'Lax') as 'Lax' | 'Strict' | 'None',
  ...(cookieDomain ? { domain: cookieDomain } : {}),  // ← domain NO se incluye si cookieDomain es falsy
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};
```

Si `cookieDomain = process.env.COOKIE_DOMAIN || undefined` → `undefined` → `cookieDomain` es falsy → `domain` no se incluye en las opciones → cookie scoped al host exacto.

**Diagnóstico de ClientAuthGuard — código relevante:**
```typescript
// src/apps/client/src/common/guards/client-auth.guard.ts:15-17
const token = req.cookies?.['access_token'];
if (!token) {
  res.redirect(`${BASE_URL}/auth/login`);
  return false;
}
// Línea 22: jwt.verify(token, JWT_SECRET) — segunda falla potencial si JWT_SECRET no coincide
```

### Servicios afectados

| Servicio | Rol en el bug | Cambio necesario |
|---|---|---|
| BASE (`src/apps/base/`) | Escribe cookie sin domain | Necesita `COOKIE_DOMAIN` configurado |
| CLIENT (`src/apps/client/`) | Lee cookie, falla, redirige | No requiere cambio de código |
| docker-compose.yml | Variables de entorno | Añadir default `.localhost` para Docker dev |
| `.env.example` | Documentación de env vars | Actualizar comentario/default |

### Causa secundaria: JWT_SECRET posible mismatch

La API lee `JWT_SECRET` de `./src/api/.env` (via `env_file:` en docker-compose).
CLIENT lee `JWT_SECRET` de `${JWT_SECRET}` (variable del host `.env` raíz).
Son archivos distintos — si los valores difieren, `jwt.verify()` en `ClientAuthGuard:22` lanzará excepción → `catch` → `clearCookie` → `redirect('/auth/login')`.

Esta segunda causa solo se manifiesta si se corrige la causa primaria (COOKIE_DOMAIN). Debe verificarse durante la implementación.

### Archivos con riesgo extra (11-Conventions.md §5)

| Archivo | Riesgo | Consideración |
|---|---|---|
| `docker-compose.yml` | MEDIUM | Cambio en environment de `base` service; no afecta healthchecks ni start order |
| `src/apps/base/src/main.ts` | HIGH | Solo se verifica que `COOKIE_OPTIONS` sea correcto; no se cambia lógica del proxy BFF |

### Sin cambios requeridos en
Schema Prisma · módulos API · templates Nunjucks · lógica de negocio · ThrottlerModule · EmailService

### Consideraciones de despliegue
En producción (ej. `www.ironloot.com` + `app.ironloot.com`), `COOKIE_DOMAIN` debe ser `.ironloot.com`. El patrón de fix debe ser agnóstico al entorno — el valor viene siempre de la variable de entorno, nunca hardcodeado.

---

## Sesión 2026-06-23 — PT-035: Implementación del Sistema de Diseño Iron Loot

### Contexto arquitectónico

PT-035 es un cambio exclusivamente visual (CSS + HTML + assets estáticos). Afecta a los tres sitios SSR del monorepo. Cero impacto en backend, schema, DTOs o servicios.

**Mapa de archivos afectados por sitio:**

```
BASE (src/apps/base/)
  public/
    css/base.css                    ← Reescritura completa (design tokens + selectores)
    images/                         ← NUEVA CARPETA
      logo-horizontal.png           ← Recortado de docs/design/logos.png
      logo-isotipo.png              ← Recortado de docs/design/logos.png
      logo-3d.png                   ← Copia de docs/design/logos3d.png
  views/
    layouts/base.html               ← Navbar con logo imagen, footer 4-col, Google Fonts
    pages/home.html                 ← Reescritura completa (6 secciones según Index.png)
    pages/auctions/list.html        ← Layout split sidebar+grid según list.png
    pages/auctions/detail.html      ← Layout split descripción+panel-puja
    pages/auth/login.html           ← Card centrado, logo, inputs gold focus
    pages/auth/register.html        ← Mismo patrón
    pages/auth/recovery.html        ← Mismo patrón
    pages/auth/reset-password.html  ← Mismo patrón
    pages/auth/verify-email*.html   ← Mismo patrón
  src/main.ts                       ← CSP: añadir Google Fonts a styleSrc + fontSrc

CLIENT (src/apps/client/)
  public/
    css/client.css                  ← Reescritura completa (tokens + sidebar Iron Black)
    images/                         ← NUEVA CARPETA
      logo-isotipo.png              ← Para sidebar brand
  views/
    layouts/client.html             ← Sidebar Iron Black, logo isotipo, sin emojis
  src/main.ts                       ← CSP: añadir Google Fonts

ADMIN (src/admin/)
  public/
    css/admin.css                   ← Actualizar --primary, --sidebar-bg; añadir Montserrat
    images/                         ← NUEVA CARPETA
      logo-horizontal.png           ← Para sidebar brand admin
  views/
    layouts/admin.html              ← Logo imagen en sidebar brand (verificar existencia)
  src/main.ts                       ← CSP: añadir Google Fonts
```

### Design tokens (canónicos)

```css
:root {
  /* Paleta Iron Loot (docs/design/Modo_Luz.md) */
  --color-iron-black: #151515;
  --color-gunmetal:   #31363F;
  --color-gold:       #C89B3C;
  --color-gold-hover: #a8832e;   /* darkened ~15% para hover */
  --color-white:      #F6F6F6;
  --color-surface:    #FFFFFF;

  /* Tipografía */
  --font-heading: 'Montserrat', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, sans-serif;
}
```

### Secciones del HOME (Index.png) — estructura identificada en el mockup

| # | Sección | Fondo | Datos dinámicos |
|---|---|---|---|
| 1 | **Navbar** | `#151515` | — (estático) |
| 2 | **Hero** | `#F6F6F6` | — (logo 3D + headline estático) |
| 3 | **Pilares de confianza** | `#FFFFFF` | — (3 items estáticos) |
| 4 | **Grid subastas activas** | `#F6F6F6` | `{{ auctions }}` del controlador |
| 5 | **Cómo funciona** | `#151515` | — (3 pasos estáticos) |
| 6 | **Partners / aliados** | `#FFFFFF` | — (placeholders estáticos) |
| 7 | **Newsletter CTA** | `#F6F6F6` | — (formulario decorativo) |
| 8 | **Footer 4 columnas** | `#151515` | — (estático) |

### CSP — cambio mínimo necesario en cada main.ts

Los tres `main.ts` tienen una sección `helmet()` con CSP. El cambio es exclusivo a dos directivas:

```typescript
// Antes (ejemplo BASE):
styleSrc: ["'self'", "'unsafe-inline'"],
fontSrc:  ["'self'"],

// Después:
styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
fontSrc:  ["'self'", 'https://fonts.gstatic.com'],
```

**CRÍTICO**: El resto del objeto CSP (scriptSrc, frameSrc, objectSrc, imgSrc, etc.) no se toca.

### Archivos de main.ts — riesgo HIGH (11-Conventions.md §5)

- `src/apps/base/src/main.ts`: contiene lógica de proxy BFF + COOKIE_OPTIONS. Solo se modifica el bloque CSP.
- `src/apps/client/src/main.ts`: contiene ClientAuthGuard. Solo se modifica el bloque CSP.
- `src/admin/src/main.ts`: contiene session config. Solo se modifica el bloque CSP.

Verificar `npm run build` en cada app tras modificar su `main.ts`.

### Logos — estrategia de extracción

`docs/design/logos.png` es una sprite sheet con variantes (horizontal, vertical, isotipo, monocromático). `docs/design/logos3d.png` contiene dos renders 3D (con base, sin base).

Opciones para extraer assets:
1. **Recorte manual**: el desarrollador recorta y exporta los PNG individuales antes de la implementación.
2. **Uso directo**: en el Proposal Package se documentará si se usa el PNG completo o se recorta. Los logos PNG individuales deben estar disponibles antes de STATE 4.

### Sin impacto en

- `src/api/` (ningún archivo backend)
- `src/packages/core/` (dominio compartido)
- `src/api/prisma/schema.prisma`
- Archivos `.env` o `docker-compose.yml`
- Tests unitarios o e2e (no hay tests para CSS/templates por convención del proyecto)

---

## PT-036 — Análisis de contexto (AUD-004, STATE 1-B)

**Fecha**: 2026-07-23 | **Tipo**: BUG (seguridad) | **Complejidad**: STANDARD

### Componentes / servicios / dependencias

| Elemento | Ubicación | Rol en el bug |
|---|---|---|
| AdminAuthController | `src/api/src/modules/admin/admin-auth.controller.ts:16` | Login admin; `@SkipThrottle()` (:15); defaults `admin`/`admin` (:42-43) |
| validateStartupConfig | `src/api/src/main.ts:19-48` | Gate de secretos en prod; **omite** ADMIN_USERNAME/PASSWORD |
| PLACEHOLDER_SECRETS | `src/api/src/main.ts:10-17` | Set de placeholders; patrón a reutilizar |
| AdminController | `src/api/src/modules/admin/admin.controller.ts:33` | `@SkipThrottle()` en ~60 ops admin (colateral) |
| AdminDualAuthGuard / AdminApiKeyGuard | `.../guards/*.ts` | Validan JWT admin o `x-admin-key` (no directamente el login) |
| ThrottlerGuard (global) | `common/config` | Rate limit global 100/min; desactivado por `@SkipThrottle` en login |

### Flujo de datos

`POST /api/v1/admin/auth/login` → (sin throttle) → compara `body` vs `ADMIN_USERNAME/PASSWORD` (default admin/admin) → si `ADMIN_TOTP_SECRET` set, exige TOTP → firma JWT admin (8h, `role:admin`, `type:admin-session`). El JWT resultante es aceptado por `AdminDualAuthGuard` en todas las rutas `/admin/*`.

### Riesgos y análisis de regresión (preliminar; el detalle va a STATE 2)

- **R1**: Añadir `ADMIN_USERNAME/PASSWORD` al gate de arranque **bloqueará** despliegues de producción que hoy dependan de los defaults → **efecto intencionado**, pero requiere aviso/documentación (checklist de despliegue, `6-devops`).
- **R2**: Re-activar throttle en el login admin podría afectar automatizaciones legítimas que reintenten; mitigar con un límite razonable (p. ej. 5–10/min) y no tocar el `@SkipThrottle` de las operaciones admin de alto volumen salvo decisión explícita en STATE 2.
- **R3**: El entorno de desarrollo debe seguir funcionando con defaults (el gate sólo aplica `env==='production'`, `main.ts:20`).
- **Sin regresión** esperada en: BD, dominio core, módulos de negocio, otros flujos de auth de usuario.

### Acoplamiento (Graphify)

Comunidad "Auth & Identity (2)" (Graphify): `AdminApiKeyGuard`, `AdminDualAuthGuard`, `AdminJwtGuard`, `DiagnosticsModule`. El login admin es un nodo de entrada de baja fan-in; el cambio es local al módulo admin + `main.ts`. Radio de impacto **mínimo** (no toca el god-object `AdminController/Service` en su lógica, sólo su decorador de throttle si se decide en STATE 2).

### Restricciones

- Alinear con el patrón existente `PLACEHOLDER_SECRETS`/`validateStartupConfig` (no inventar un mecanismo nuevo).
- Mantener dev operable con defaults; el gate sólo en producción.
- Tests-first (STATE 4): el fix debe poder verificarse (gate rechaza defaults en prod; login limitado).

### Confidencias

Root Cause **97%** | Architecture **95%** | Solution **90%**. Investigation Gate: NO.

---

## PT-037 — Análisis de contexto (AUD-001, STATE 1-B)

**Fecha**: 2026-07-23 | **Tipo**: BUG/REFACTOR | **Complejidad**: MAJOR

### Componentes / servicios / dependencias (Graphify)

| Elemento | Grado | Rol |
|---|---|---|
| `prisma.service.ts` | 49 | Hub de acceso a datos; todas las tablas pasan por aquí |
| `system-config.service.ts` (tabla `system_config`) | 17 | **Crítico runtime**: soft-close, moderación, KYC gates, incremento |
| `CommissionsService`/`RefundsService` (commission_*, refund_requests) | 19/11 | Dinero |
| `CfdiService`/`KycService` (cfdi_records, kyc_submissions) | 18/15 | Compliance |
| `CmsService`/`SeoService`/`WatchlistService`/`ModerationService` | 11/11/9/8 | Contenido/moderación/watchlist |

Consumidores en **API** (`api/src/modules/*`) y en la **app Admin** (`admin/src/modules/*`). Radio de impacto de la ausencia: amplio y transversal.

### Flujo del problema

`prisma migrate deploy` (entorno limpio) → aplica 14 migraciones → 17 tablas → los servicios anteriores fallan al consultar tablas inexistentes. El dev actual funciona porque `db push` creó las 11 tablas directamente (estado no versionado).

### Riesgos y análisis de regresión (preliminar; detalle en STATE 2 — MAJOR obligatorio)

- **R1 (integridad de reconciliación)**: la migración de reconciliación debe reproducir **exactamente** el DDL que `db push` aplicó (tipos, defaults, índices, FKs). Divergencia posible ya conocida: `payments.currency` default (AUD-008). Riesgo de que un `CREATE TABLE` nuevo difiera del estado real.
- **R2 (entornos existentes)**: en la BD dev/compartida las tablas **ya existen** → la migración debe marcarse como aplicada sin re-ejecutarse (`prisma migrate resolve --applied`) para no fallar por "objeto ya existe". Estrategia de baseline requerida.
- **R3 (shadow DB)**: generar la migración con `migrate diff`/`migrate dev` requiere DB + shadow DB (Docker) — no disponible offline; se hará en STATE 4 (o spike STATE 2).
- **Sin regresión** en: lógica de negocio, core, frontends (solo se añade DDL faltante que ya existe en dev).

### Restricciones

- La migración debe ser **no-op** contra la BD dev existente (idempotencia vía baseline).
- Prohibir `db push` fuera de prototipado (convención + posible eliminación del script).
- Coordinar con AUD-008 (fijar default `payments.currency` en la misma o subsiguiente migración) y AUD-017 (seed).

### Confidencias

Root Cause **97%** | Architecture **92%** | Solution **70%** (mecanismo/baseline a validar con DB). Investigation Gate: NO (causa raíz conocida); **spike de solución** en STATE 2.

---

## PT-038 — Análisis de contexto (AUD-003, STATE 1-B)

**Fecha**: 2026-07-23 | **Tipo**: BUG | **Complejidad**: MAJOR

### Componentes (Graphify)

| Elemento | Grado | Rol |
|---|---|---|
| `getToken()` / `apiGet()` (`client/src/app.controller.ts`) | 23 / 19 | Path de **lectura** BFF server-side (funciona) |
| `Client Layout` | 19 | Layout base del portal |
| Páginas de escritura (Deposit 5, Dispute 5, Withdraw 4, Edit Auction 4, …) | 4–8 | Las 8 escrituras rotas |
| `BFF HTTP Proxy (http-proxy-middleware)` | 5 | **Vive en BASE**, no en CLIENT (referencia del fix) |

Radio del fix: `client/src/main.ts` (añadir proxy, bajo acoplamiento como en BASE) + 8 plantillas (cambio local por página). El API y el dominio no se tocan.

### Flujo del problema

Escritura UI → `fetch(API + '/api/v1/...', {credentials:'include'})` cross-origin → API (`JwtAuthGuard`) busca `Authorization: Bearer` → ausente (cookie httpOnly ilegible por JS) → 401. En profile/settings/edit/onboarding, además, método/ruta no existen → 404.

### Riesgos y análisis de regresión (preliminar; MAJOR → detalle en STATE 2)

- **R1**: añadir el proxy `/api` a CLIENT podría colisionar con rutas SSR existentes (`/api/...` no se usa hoy en CLIENT para render). Mitigar: montar el proxy solo en `/api` (como BASE), sin afectar las rutas de página.
- **R2**: cambiar los `fetch` a relativos requiere que el proxy reescriba el path igual que BASE (`pathRewrite`). Verificar paridad con BASE.
- **R3**: corregir método/ruta (PUT→PATCH, `/users/profile`→`/users/me`) debe alinear exactamente con `Catalogo-de-API`; probar cada endpoint.
- **R4 (CSRF)**: al introducir un proxy same-origin con cookie, revisar la postura CSRF (relacionado con AUD-014) — mantener el mismo criterio que BASE (Bearer + sameSite) documentado.
- **Regresión**: las **lecturas** server-side (`apiGet`) no se tocan → sin regresión. Cambio localizado al portal privado.

### Restricciones

- Reutilizar el patrón de BASE (`createProxyMiddleware` + inyección de `Authorization`), no inventar.
- `http-proxy-middleware` ya está en `CLIENT/package.json`.
- Tests-first: smoke de que una escritura autenticada llega al API con `Bearer` (o al menos test del wiring del proxy).

### Confidencias

Root Cause **96%** | Architecture **92%** | Solution **85%**. Investigation Gate: NO.

---

## PT-048 — Análisis de contexto — Contrato CLIENT↔API en escrituras del portal

**Flujo de datos afectado**: Navegador (JS inline en plantilla CLIENT) → `fetch('/api/v1/...')` → proxy BFF CLIENT (inyecta `Bearer` desde cookie HttpOnly) → API NestJS `ValidationPipe (whitelist + forbidNonWhitelisted)` → DTO. El fallo ocurre en el `ValidationPipe`, antes del servicio de dominio.

**Boundary del contrato**: los DTOs son la fuente de verdad del contrato HTTP. El frontend construye el body a mano (JS inline en `.html`), sin tipos compartidos → nada evita la deriva. **Constraint arquitectónico**: no existe un paquete de tipos/contrato compartido entre CLIENT y API (`src/packages/core` es dominio, sin DTOs HTTP).

**Servicios/módulos**: WalletModule (`wallet.service.deposit`), UsersModule (`users.service.enableSeller`), AuctionsModule (`auctions.service.create`). Los servicios no llegan a ejecutarse (rechazo en pipe).

**Impacto en modelo de datos**: ninguno directo por este bug (las escrituras se rechazan). La corrección de crear-subasta con `condition` SÍ tocaría el schema Prisma si se decide persistir la condición.

**Dependencias entre hallazgos**: PT-048 desbloquea el fondeo y la creación de subastas → prerequisito del E2E y de poder ejercitar los módulos ADMIN dependientes de datos. BUG-QA-02 (auditoría) es ortogonal.

**Riesgo de regresión**: cambiar DTOs puede afectar Swagger/otros consumidores; cambiar solo el frontend evita ese riesgo pero exige respetar la semántica real de cada endpoint (sobre todo `referenceId` en depósito).

## PT-058 — Análisis de contexto (BUG-QA-N01 wallet 404)
- **Data flow**: `CLIENT AppController.{dashboard,wallet,auctionDetail}` → `apiGet('/api/v1/wallet')` (404) → `null` → plantilla `default('0.00')`.
- **Ruta correcta**: `GET /api/v1/wallet/balance` → `WalletBalanceDto {available, held, currency, isActive}` (`wallet.controller.ts:46`).
- **Mapeo requerido**: plantillas esperan `wallet.balance` y `wallet.held_funds` → mapear `available→balance`, `held→held_funds`.
- **Riesgos**: bajo. Sólo cambia el path + mapeo en CLIENT. Regresión posible si alguna plantilla usa otros campos de `wallet` (verificado: sólo `balance` y `held_funds`).
- **Restricciones**: mantener Pattern 3 (CLIENT llama API directo). No tocar API ni BD.

## PT-059 — Análisis de contexto (BUG-QA-N02 bids/my 404)
- **Data flow**: `AppController.{dashboard,myBids}` → `apiGet('/api/v1/bids/my…')` (404) → `null` → tabla vacía.
- **Rutas correctas**: `GET /api/v1/bids/my-active` (dashboard) y `GET /api/v1/bids/my-history` (/my-bids). Ambas → `Bid[]`.
- **Mapeo**: envolver `Bid[]` en `{ items: Bid[] }`; derivar `bid.isWinning = Number(amount) === Number(auction.currentPrice)`.
- **Nota**: la API `my-history` no pagina (devuelve todo). El parámetro `page` de `/my-bids` queda sin paginación server-side (enhancement fuera de alcance).
- **Riesgos**: bajo. Solo CLIENT. Dashboard no renderiza bids hoy (solo enlace), así que el cambio ahí solo elimina el 404.

## PT-063 — Contexto (@Public webhook)
- **Flujo**: pasarela → `POST /payments/webhook/:provider` → APP_GUARD (JwtAuthGuard) → 401 (sin JWT).
- **Fix**: `@Public()` salta el guard; la firma HMAC (provider.handleWebhook) valida autenticidad.
- **Riesgo**: nulo — el endpoint ya validaba firma; solo se corrige que era inalcanzable. Regresión: ninguna (otros endpoints ya usan @Public para lo público).

## PT-064 — Contexto (parser UUID + case)
- **#6**: `DEP-<uuid>-<ts>` → regex `^DEP-(.+)-\d+$` captura el UUID completo. Riesgo: nulo (solo afecta el parseo de la referencia de depósito).
- **#2**: mapa de alias provider → enum. Cubre MERCADO_PAGO/HEY_BANCO (con y sin guion/underscore).
- **Tests**: `webhook-credit.spec.ts` (2 casos, RED→GREEN).

## PT-065 — Contexto (provider MP)
- createPayment: `notification_url` (env) + `redirectUrl` según `MERCADO_PAGO_SANDBOX`.
- handleWebhook: detecta ID `^(ORD|PAY)` → fetch Orders API; else Payments API legacy.
- Riesgo: bajo; retrocompatible (Payments API legacy sigue soportada). Evidencia funcional fuerte.

## PT-067 — Contexto (órdenes historial)
- Data flow: `app.controller.{orders,wonAuctions,sellerOrders}` → `apiGet('/api/v1/orders?...')` (array) → plantilla `orders.items` (vacío).
- Fix: `toItems()` → `{items}`. Riesgo bajo; no toca API. Regresión: verificado que las plantillas solo usan `.items`.

## PT-068 — Contexto (/seller/auctions)
- CLIENT: `auctions?role=seller` → `?mine=true` + `toItems`. La plantilla `seller/auctions.html` itera `auctions.items`.
- Reutiliza el helper `toItems` (PT-067). Sin cambios en API. El caso `{data}→{items}` ya está cubierto por list-view.spec.

---

## PT-076 — Análisis de contexto — Activación real de PayPal (STATE 1-E)

**Fecha**: 2026-07-25 | **Tipo**: FEATURE | **Complejidad**: STANDARD (ruta A) / MAJOR (ruta B)

### Componentes
- `payments.controller.ts:45-56` — `POST /payments/webhook/:provider`, `@Public` (PT-063). Punto de entrada del IPN.
- `payments.service.ts:184-247` — `handleWebhook()`: normaliza alias de proveedor, delega en el provider, extrae `userId` de la referencia y acredita wallet.
- `payments.service.ts:249-254` — `getAvailableProviders()`: **MERCADO_PAGO y PAYPAL están hardcodeados**; solo STRIPE y HEY_BANCO pasan por `checkStatus()`. Origen del síntoma.
- `providers/paypal.provider.ts` — integración WPS + verificación IPN. Único fichero PayPal del repo.
- `payments.module.ts` — `PaypalProvider` ya registrado como provider Nest; no hace falta cableado nuevo.
- `apps/client/views/pages/wallet/deposit.html:15` — `<option value="PAYPAL">` estático, no derivado de la API.

### Data flow (depósito PayPal)
```
CLIENT /wallet/deposit → API POST /payments/initiate (provider=PAYPAL)
  → PaypalProvider.createPayment() → URL WPS (cmd=_xclick, business, invoice=DEP-<userId>-<ts>)
  → usuario paga en sandbox.paypal.com
  → PayPal POST → notify_url = ${API_BASE_URL}/payments/webhook/PAYPAL
  → PaypalProvider.handleWebhook() → POST a ipnpb.sandbox.paypal.com (cmd=_notify-validate)
  → validateIpnResponse() [CORE] → si VERIFIED y payment_status=Completed → WebhookResult
  → payments.service extrae userId de `invoice` → walletService.deposit()
```

### Dependencias
- `@ironloot/core` — `buildIpnVerificationPayload()` / `validateIpnResponse()`. La I/O vive en el provider; CORE solo define estructura y validación (respeta la regla de CORE sin HTTP).
- `WalletModule` (forwardRef) — `deposit()` es quien materializa el saldo y el asiento de ledger.
- `webhook-retry.producer/worker` (BullMQ) — cola de reintentos de webhook ya existente.
- PayPal sandbox — dependencia externa; sin credenciales no es verificable.

### Hallazgos de la lectura (no son el objetivo, se registran)
1. `PAYPAL_CLIENT_SECRET` está declarado en `.env.example:122` pero **no se lee en ningún punto del código**. Configuración muerta.
2. `checkStatus()` (`paypal.provider.ts:17`) valida `PAYPAL_CLIENT_ID`, pero `createPayment()` (`:35`) exige `PAYPAL_BUSINESS_EMAIL`. Gate incoherente: el proveedor puede reportarse sano y reventar al usarse.
3. `paypal.provider.ts:40` usa `CLIENT_URL || 'http://localhost:5173'`. El 5173 era el `web/` SSR eliminado en la reestructuración a `src/`. En `.env` sí existe `CLIENT_URL`, así que el fallback no se dispara hoy — defecto latente, no activo.
4. `payments.service.ts:223-226` **ya contempla `mc_gross`** (campo de importe del IPN de PayPal). La ruta de acreditación no necesita cambios.
5. Cero tests del proveedor PayPal en todo el repo.
6. `10-Technical-Debt.md:17` afirma "Only Mercado Pago and PayPal are operational" — falso para PayPal. Discrepancia documental.
7. No hay control de idempotencia por `txn_id` en `handleWebhook()`. Con MP no se manifestó; PayPal reenvía IPNs de forma agresiva ante ausencia de HTTP 200.

### Riesgos
- **R-01 (bloqueante para pruebas)**: `notify_url` sale de `API_BASE_URL`; en local es `localhost` y PayPal no puede alcanzarlo. Requiere túnel, como ya se hizo con MP.
- **R-02 (dinero)**: sin idempotencia, un reenvío de IPN acredita dos veces.
- **R-03 (regresión)**: `payments.service.ts` es código compartido con MercadoPago, ya validado con pago real (PT-063/064/065). Todo cambio ahí exige regresión de MP.

### Restricciones
- MXN como moneda global del proyecto.
- CORE no puede hacer HTTP (la I/O se queda en el provider).
- La ruta del webhook debe seguir siendo `@Public`: la verificación de firma es el único control.
- Secretos solo en `src/api/.env` (gitignored).

### Confianza
- Architecture Confidence: **92%** — todos los puntos del flujo leídos y citados.
- Implementation Confidence: **80%** (ruta A) / **55%** (ruta B).

---

## PT-080 — Analisis de contexto — Modularidad de pasarelas (STATE 1-R)

**Fecha**: 2026-07-25 | **Tipo**: REFACTOR | **Complejidad**: MAJOR
**Fuentes consultadas**: graphify-out/GRAPH_REPORT.md + graph.json, docs-v2 (SAD, SDD, ADR,
Reglas), docs/enterprise-documentation (06-Backend-Architecture, 11-Conventions), CORE.

### Arquitectura prevista vs. implementada

| Elemento previsto | Donde esta | Estado real |
|---|---|---|
| Puerto `IPaymentProvider` | `core/src/integrations/payment-provider.interface.ts:13` | Definido, **0 usos** |
| Evento `PaymentCompletedEvent` | `core/src/events/payment-completed.event.ts` | Definido, **nunca emitido** |
| `PaymentAlreadyProcessedException` | `api/src/common/observability/exceptions.ts:270` | Definido, **nunca lanzado** |
| `ProcessPaymentUseCase` | `06-Backend-Architecture.md:169` | **Fuente inexistente**; solo `dist/` obsoleto |
| Tabla `payments` | `schema.prisma` | **0 filas** tras 2 depositos reales acreditados |
| `reconcilePayments` | `admin.service.ts:923` | Existe; consulta la tabla vacia -> no puede funcionar |

### Acoplamiento medido

`PaymentsService`: god node con 29 aristas (top-9 del grafo, GRAPH_REPORT.md:172).
Puntos que hay que editar para anadir o quitar una pasarela: **5**
(`initiatePayment` switch, `handleWebhook` if/else, `providerAliases`, `getAvailableProviders`,
`reconcilePayments` tipado en duro).

### Contrato duplicado

`api/src/modules/payments/interfaces/payment-provider.interface.ts` reimplementa el puerto de
CORE con otra forma (`createPayment`/`verifyPayment`/`handleWebhook` frente a
`initiatePayment`/`validateWebhook`/`getTransactionStatus`). PT-076 y PT-078 modificaron el
duplicado de la API sin conocer el puerto de CORE.

### Restricciones

- RULE-02 (`11-Conventions.md:238`): CORE no puede importar NestJS/Prisma/Express/Redis.
  El puerto debe quedar libre de framework; la I/O permanece en los adaptadores de la API.
- RULE-04: nunca confiar en payloads de webhook sin validar. La verificacion de firma sigue
  siendo responsabilidad del adaptador.
- RULE-05: el ledger es insert-only.
- ADR-008 (parcial / AUD-012): los use-cases de CORE no estan cableados. PT-080 no los
  resucita; se limita al puerto y al registro.

### Riesgos

- **R-1 (alto)**: `payments.service.ts` esta en la ruta del dinero y es el fichero mas tocado.
  Mitigacion: arnes de verificacion real contra MercadoPago (`mp-deposit.cjs`), ya ejecutado
  con exito el 2026-07-25 (evidencia PT-078).
- **R-2 (medio)**: adoptar el puerto de CORE puede arrastrar cambios en los cuatro adaptadores.
- **R-3 (bajo)**: la deuda de `Payment.orderId` obligatorio bloquea registrar depositos en la
  tabla `payments`; se difiere a PT-081.

### Confianza

Architecture Confidence: **90%** · Solution Confidence: **75%**.

---

## PT-102 — Análisis de contexto — La puja en vivo apagada (STATE 1-B)

**Fecha**: 2026-07-27 · Origen: F-34

### Componentes implicados

| Componente | Papel | Riesgo al tocarlo |
|---|---|---|
| `src/apps/client/views/pages/auction/detail.html` | Declara el orden de los `<script>` | **Bajo**. Cambiar el orden es reversible y observable |
| `src/apps/client/public/js/pages/pages-auction-detail.js` | Abre el socket, pinta precio y lista | **Medio**. Contiene además la cuenta atrás y el envío de la puja: tocar de más rompe cosas que hoy funcionan |
| `src/apps/client/test/` | Cuatro specs, entre ellas `plantillas-sin-js-inline.spec.ts` | Bajo — es donde va la guarda estática |
| `tests/qa-browser-suite/` | Suite de navegador, 168 casos | **Medio**. Añadir una fase con dos navegadores alarga la corrida y puede volverla inestable |
| `src/apps/client/src/main.ts` | CSP: `connectSrc`, `scriptSrc` | Bajo, pero **no tocar sin motivo**: `script-src 'self' https://cdn.socket.io` ya es correcto |

### Flujo de datos, tal como debe quedar

```
detail.html
  └─ <script src=cdn.socket.io>        define window.io
  └─ <script src=pages-auction-detail> usa io('/auctions')
        │
        ├─ CLIENT (:5175) reenvía /socket.io/ ─► API (:3000) namespace /auctions
        │
        └─ bid:new ──► #currentPrice, #bidList
```

El origen es **relativo** (PT-098): una URL relativa no puede apuntar a un host que el navegador
no resuelve. Esa decisión se conserva intacta.

### Dependencias

- **socket.io 4.7.5 desde CDN**, con `integrity` SRI (PT-089). Si el CDN cae, la puja en vivo cae
  — hoy en silencio, que es parte de lo que este PT corrige.
- El namespace `/auctions` del API es **público de solo lectura**: no hace falta token, lo que
  simplifica la prueba.
- `nginx` ya negocia el *upgrade* para los tres sitios. Verificado; no se toca.

### Convenciones aplicables (`11-Conventions.md`)

- El JavaScript de navegador vive en `public/js/pages/` con un fichero por página. Se respeta.
- **Nada de JS inline en plantillas** (PT-096, y el guardia que lo vigila). El arreglo **no puede**
  consistir en devolver el código a la plantilla: sería revertir PT-096 y reintroducir TD-005/010.
- Los tests de CLIENT viven en `src/apps/client/test/` y corren con `jest`.

### Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| Arreglar el orden y no cerrar las tres redes → la regresión vuelve | Las tres se cierran en este PT: orden, `catch` que avisa, prueba de dos navegadores |
| Una prueba de dos navegadores es **frágil** por naturaleza (depende de tiempos) | Espera activa con reintentos y presupuesto amplio, nunca `sleep` fijo. Y una guarda **estática** del orden que no depende de la red: es la que protege de verdad contra este fallo concreto |
| Añadir una fase a la suite alarga la corrida | Va como fase propia, aislada, reutilizando actores existentes |
| Tocar `pages-auction-detail.js` de más | El cambio se limita al bloque del socket; la cuenta atrás y el envío de puja no se tocan |

### Restricciones

- **No revertir PT-096.** El JS no vuelve a la plantilla.
- **No cambiar la CSP.** `script-src 'self' https://cdn.socket.io` ya permite lo necesario;
  tocarla sería ampliar superficie sin causa.
- **No convertir el fallo en excepción no capturada**: si el CDN cae, la página debe seguir
  sirviendo para pujar por HTTP. Lo que cambia es que **se entere alguien**.

---

## PT-103 — Análisis de contexto — El registro de deuda desincronizado (STATE 1-B)

**Fecha**: 2026-07-27 · Origen: F-33

### Componentes implicados

| Componente | Papel | Riesgo al tocarlo |
|---|---|---|
| `docs/enterprise-documentation/10-Technical-Debt.md` | El registro. Cuatro filas mienten | **Bajo**. Es prosa; el riesgo es escribir otra afirmación sin comprobar |
| `docs/implementation/HISTORY.log` | Declara los cierres. **Append-only** | **Alto si se edita**: FDGE prohíbe reescribir la historia. Aquí sólo se lee |
| `docs/implementation/PENDING_TASKS.md` | Lo reconstruyó PT-090 | Bajo. Conviene comprobar que sigue coherente |
| `docs/implementation/MATRIZ-DEUDA-TECNICA.md` | Tiene su propia tabla de estados | Bajo |
| Una guarda nueva (test) | Cruza `HISTORY.log` con el registro | **Medio**: si es demasiado estricta, falla por prosa legítima y acaba desactivada |

### Flujo que se quiere fijar

```
PT cierra una deuda
   ├─► codigo            (obligado: no compila si te equivocas)
   ├─► HISTORY.log       (obligado por FDGE STATE 7)
   └─► 10-Technical-Debt (NADA lo obligaba)  ← el hueco de F-33
```

La guarda cierra la tercera flecha: si `HISTORY.log` declara cerrada una deuda y el registro la
mantiene abierta, la suite falla.

### Dependencias

- Ninguna de código. Es documentación más un test.
- **`docs/` está en `.gitignore`**: la guarda no puede exigir que los ficheros existan.
- El test se apoya en dos convenciones de redacción ya vigentes:
  - `HISTORY.log`: línea `Deuda cerrada: TD-XXX, TD-YYY…`.
  - `10-Technical-Debt.md`: `### TD-XXX — título` seguido de `**Status:** …`.

### Convenciones aplicables

- `HISTORY.log` es **append-only**. Se lee; no se corrige aunque se encontrara un error.
- El registro de deuda **cita el código** (PT-090 impuso esa forma): cada estado nuevo debe decir
  qué PT lo cerró y qué se puede leer para comprobarlo.
- Tests en RED antes que la corrección (RULE-06).

### Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| La guarda es frágil ante la prosa y alguien acaba borrándola | Reconocer sólo formas explícitas y **acotadas**; ante la duda, no acusar. Una guarda que da falsos positivos se desactiva, y entonces no protege nada |
| La guarda no corre en CI porque `docs/` no está versionado | Se asume y se **declara**: se salta cuando faltan los ficheros. Protege a quien tiene los documentos, que es quien puede romperlos |
| Corregir las filas «de memoria» y volver a mentir | Cada estado nuevo se comprueba **contra el código**, no contra `HISTORY.log`. Es lo que hizo PT-090 y por eso su corrección aguantó |
| Tocar `HISTORY.log` | Prohibido. Sólo lectura |

### Restricciones

- **No editar `HISTORY.log`.**
- **No declarar cerrada ninguna deuda sin comprobarla en el código**, aunque `HISTORY.log` lo diga.
  Si al comprobar apareciera una que no está realmente cerrada, eso es un hallazgo nuevo, no una
  fila que se corrige.
- La guarda debe fallar **contra el estado actual** antes de corregir las filas.

---

## PT-110 — Analisis de contexto — Vulnerabilidades y superficie de sockets (STATE 1-B)

### Componentes implicados

| Componente | Papel | Riesgo al tocarlo |
|---|---|---|
| `src/api/package.json` | Declara dependencias y podria declarar `overrides` | **Medio**: un override mal puesto rompe la resolucion entera |
| `auctions.gateway.ts` · `events.gateway.ts` | Los dos namespaces publicos | **Alto**: son la puja en vivo. PT-102 acaba de arreglarla; romperla otra vez seria la tercera |
| `src/nginx/nginx.conf` | Unica capa donde hoy se puede acotar conexiones sin tocar la app | Medio |
| La suite (fase 32) | Prueba que la puja llega al otro navegador | Es la red que protege este cambio |

### Dependencias y restricciones

- **socket.io no fija `engine.io` en su `dependencies`** declaradas (`npm view` devuelve vacio):
  se resuelve transitivamente. Un `overrides` es la via limpia para forzar la version parcheada.
- La suite de navegador **es** la verificacion: no hay test unitario que demuestre que el
  WebSocket sigue vivo tras cambiar la biblioteca que lo implementa.
- `[A1]` de PTSA: no se puede afirmar explotabilidad sin demostrarla. El PT arregla lo que puede
  medirse (version fuera del rango vulnerable), no lo que se supone.

### Riesgos identificados

| Riesgo | Mitigacion |
|---|---|
| Subir `engine.io` rompe la puja en vivo | Fase 32 de la suite, dos navegadores reales, antes y despues |
| `npm audit fix --force` rompe la ruta del dinero | **No se usa.** Solo se sube lo acotado y se mide |
| Acotar conexiones deja fuera a usuarios legitimos | Un limite generoso y medido, no un numero inventado |
| Quedan 22 avisos sin arreglar | Se declaran, con su motivo. Un hallazgo parcialmente resuelto que se declara cerrado es F-33 otra vez |
