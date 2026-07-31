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


---

## PT-114 — Analisis de contexto — El registro de comision (STATE 1-B)

### Componentes implicados

| Componente | Papel | Riesgo al tocarlo |
|---|---|---|
| `auction-scheduler.service.ts:145-166` | Orquesta el cierre dentro de UNA transaccion | **Alto**: aqui se mueve el dinero de cada venta |
| `wallet.service.ts:357-460` (`captureHeldFunds`) | Calcula la comision y asienta los tres movimientos | **Alto**: es la ruta del dinero |
| `commissions.service.ts:11` (`calculateForOrder`) | Crea el `CommissionRecord`, recalculando | Medio |
| `admin.service.ts:534` | El informe financiero, unico consumidor del producto | Bajo — solo lee |

### Restriccion de capas

`WalletModule` **no debe depender** de `CommissionsModule`: la cartera es infraestructura de dinero
y las comisiones son politica de negocio. Meter la creacion del registro dentro de
`captureHeldFunds` invertiria esa dependencia.

El orquestador (`auction-scheduler`) **si** puede depender de ambos: es su trabajo.

### Riesgos identificados

| Riesgo | Mitigacion |
|---|---|
| **Dos cifras distintas** de la misma comision | El registro debe nacer con la cifra que **ya se asento**, no recalculada |
| Que el registro quede fuera de la transaccion | Si el registro falla, la venta no puede quedar a medias: o ambos o ninguno |
| Que un reintento duplique el registro | `calculateForOrder` ya comprueba `findUnique` por `orderId`; hay que conservar esa idempotencia |
| Romper el cierre de subasta | Es la ruta del dinero. La verificacion es la fase `e2e` de la suite y una corrida completa |

---

## PT-127 — Análisis de contexto — El mecanismo de evolución del esquema (STATE 1-B)

Date: 2026-07-27
Fuentes consultadas: `docs/enterprise-documentation/07-Database-Architecture.md`,
`03-TRD.md`, `06-Backend-Architecture.md`, `CLAUDE.md`, `graphify-out/GRAPH_REPORT.md`,
`HISTORY.log` (PT-037, PT-070..PT-086, PT-117), `changes/PT-037-migration-reconciliation/`,
código: `entrypoint.dev.sh`, `Dockerfile`, `ci.yml`, `package.json`, `schema.prisma`.

### Components

| Componente | Papel en este PT |
|---|---|
| `src/api/prisma/schema.prisma` | **Fuente de verdad declarada** del modelo. 33 modelos, 23 enums |
| `src/api/prisma/migrations/` | 23 carpetas. **Artefacto desplegable — nunca ejecutado** |
| `src/api/scripts/entrypoint.dev.sh` | Aplica el esquema en desarrollo con `db push` (línea 52) |
| `src/api/Dockerfile` | Imagen de producción. **No aplica esquema** (`CMD ["node","dist/main"]`) |
| `.github/workflows/ci.yml` | Sin job de despliegue. `test-integration` no aplica esquema (PT-128) |
| `@prisma/client` generado | Consume `schema.prisma`; falla contra una base que no lo cumpla |

### Services

Ningún servicio de negocio cambia. El PT toca **infraestructura de datos**, no lógica. Los
consumidores del cliente Prisma afectados por el drift medido:

- `payments/payment-cycle.service.ts` — `payment_cycles.provider_ref`
- `wallet/` y métodos de pago — `user_payment_methods.type|card_last4|paypal_email`
- verificación de cuenta por microdepósito — tabla `account_verifications` completa
- `notifications/` — valor de enum `AUCTION_SOLD` (PT-117)

### Dependencies

```
schema.prisma  ──(prisma generate)──>  @prisma/client  ──>  toda la capa de datos
      │
      ├──(db push)──────────────────>  ironloot_db          [camino REAL, dev]
      └──(migrate deploy)───────────>  <ningun entorno>     [camino DESPLEGABLE, roto]
```

Dependencia externa: **PostgreSQL 16**. Necesaria una base sombra para `migrate diff
--from-migrations`. Está disponible (contenedor `ironloot-db` en marcha) — el mismo prerequisito
que PT-037 declaró y resolvió.

### Data Flow

El flujo relevante no es de datos de negocio sino **de esquema**:

```
Desarrollador edita schema.prisma
        │
        ├─ hoy:  reinicia el contenedor -> db push -> la base cambia. FIN.
        │        (no se genera migracion; nada la exige; nada la comprueba)
        │
        └─ deberia: prisma migrate dev -> migracion nueva -> la base cambia
                    y el fichero queda versionado en el repositorio
```

El hueco está exactamente en la primera rama: es un camino completo, cómodo, y que no deja rastro.

### Files Involved

**Se leerán y probablemente se modificarán:**
- `src/api/prisma/migrations/<nueva>/migration.sql` — nueva migración de reconciliación
- `src/api/scripts/entrypoint.dev.sh` — el punto de aplicación
- `src/api/package.json` — scripts `db:*`

**Se leerán, y sólo se tocan si la vía elegida lo exige:**
- `src/api/prisma/schema.prisma` — **objetivo, no se modifica**
- `.github/workflows/ci.yml` — coordinado con PT-128

### Risk Areas

| # | Riesgo | Mitigación prevista |
|---|---|---|
| R1 | El SQL escrito a mano no refleja el esquema | **Generarlo** con `migrate diff`, nunca escribirlo. Es la decisión D1 de PT-037 y funcionó |
| R2 | Aplicar la migración sobre la base de dev existente rompe datos | Probar primero en base sombra; la de dev se trata con `migrate resolve --applied` (baseline), que no ejecuta SQL |
| R3 | **Pérdida de datos reales de la auditoría** | `ironloot_db` contiene la salida real que sostiene la validación de 11 productos PTSA. Ninguna operación destructiva sobre ella sin copia previa |
| R4 | Colapsar las 23 migraciones pierde el historial | Es la vía B; se propone pero la decisión es humana |
| R5 | El drift vuelve en cuatro días, como ya pasó tras PT-037 | **El PT no está completo sin el mecanismo que lo detecte.** Es la lección explícita de PT-118 |

### Potential Intervention Points

1. **Generar la migración que falta** (`migrate diff --from-migrations --to-schema-datamodel`).
2. **Baselinear la base de desarrollo** (`migrate resolve --applied` ×23, o `migrate deploy` sobre
   base limpia).
3. **Cambiar el punto de aplicación** en `entrypoint.dev.sh`: `migrate deploy` en vez de `db push`.
4. **Añadir el control**: una comprobación que falle si `schema.prisma` y las migraciones divergen.
   Es el equivalente de `audit:check` (PT-118) para el esquema.

### Existing Constraints

- **PT-037 es precedente directo y su procedimiento está escrito.** No se parte de cero.
- **`ironloot_db` es dato de auditoría.** PTSA S-002 validó 11 productos sobre esa base.
- **`db push` es cómodo y hay que sustituirlo, no prohibirlo por documentación.** PT-037 intentó lo
  segundo (decisión D5: «documentar que `db push` es sólo para prototipado») y falló en cuatro días.
- **La corrección se coordina con PT-128**: el paso de esquema que le falta al job de CI es
  exactamente la prueba de que esta corrección funciona.

---

## PT-128 — Análisis de contexto — El pipeline de integración (STATE 1-B)

Date: 2026-07-27
Fuentes consultadas: `.github/workflows/ci.yml` completo, `src/api/package.json`,
`src/api/test/jest-e2e.json`, `src/api/test/e2e/` (17 ficheros), `HISTORY.log` (PT-118, PT-121),
`PTSA/audit-scope.yaml` (`ci_checkpoints`), `PTSA/Evidencias/E-018.md`.

### Components

| Componente | Papel |
|---|---|
| `ci.yml: lint` | Independiente. `lint:check` + `typecheck` de los cinco paquetes |
| `ci.yml: security-audit` | **Sin `needs`.** El checkpoint D2 de PT-118. Corre y da 0 avisos |
| `ci.yml: test-unit` | `needs: lint`. `npm run test` en los cinco paquetes |
| `ci.yml: test-integration` | `needs: lint`. **El defecto.** Postgres sin esquema + suite que no cierra |
| `ci.yml: build` | `needs: [test-unit, test-integration]` — **bloqueado** |
| `ci.yml: docker` | `needs: build` + `if: prod\|prep` — **bloqueado**, y además apunta a un fichero inexistente (PT-129) |

### Services

Ninguno en ejecución productiva. El job levanta `postgres:16-alpine` y `redis:7-alpine` como
servicios de GitHub Actions.

### Dependencies

```
lint ──┬── test-unit ──────────┐
       └── test-integration ───┴── build ── docker
       (security-audit, independiente)
```

La dependencia crítica: **dos jobs cuelgan de uno que no puede pasar.**

### Data Flow

```
checkout -> npm install -> [ FALTA: prisma generate ]
                        -> [ FALTA: aplicar esquema ]
                        -> jest e2e contra base vacia -> nunca termina
```

Dos huecos, no uno. `npm install` en la raíz dispara el `postinstall` que instala `src/api` y
`src/admin`, pero **ningún `prisma generate`**: el cliente puede quedar sin generar además de la
base sin esquema.

### Files Involved

- `.github/workflows/ci.yml` — el job
- `src/api/package.json` — el script `test:e2e`
- `src/api/test/e2e/*.e2e-spec.ts` — 17 ficheros, si el diagnóstico de manejadores lo exige
- posible `src/api/test/e2e/setup.ts` o `globalTeardown` — no existe hoy

### Risk Areas

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | `--forceExit` tapa el síntoma y deja fugas reales en producción | Diagnosticar con `--detectOpenHandles` **antes** de decidir. Si la fuga es real, cerrarla |
| R2 | Los 17 ficheros e2e fallan por razones ajenas (datos, orden, aislamiento) | Sólo se probó `auth` (2 suites, 9 tests). **El resto no se ha ejecutado nunca con éxito**: pueden aparecer fallos legítimos |
| R3 | Elegir `db push` en CI hace verde un pipeline que sigue sin probar las migraciones | **El paso debe ser `migrate deploy`**: así el job es a la vez la prueba de PT-127 |
| R4 | Alargar el job hasta agotar el tiempo del runner | Medido: `auth` tarda 22 s. 17 ficheros con `--runInBand` es del orden de minutos, no de horas |

### Potential Intervention Points

1. Añadir `prisma generate` + `prisma migrate deploy` al job, antes de los tests.
2. Diagnosticar y cerrar los manejadores abiertos; `--forceExit` sólo como último recurso, y dicho.
3. Añadir al pipeline los checkpoints que hoy sólo corre el auditor a mano: `audit:domain` (D1.N1)
   y `audit:observability` (D3). `audit-scope.yaml` los declara desde PT-120 y PT-121.

### Existing Constraints

- **`security-audit` no se toca**: es lo único del pipeline que funciona y es de PT-118.
- **El job debe fallar de verdad si algo va mal.** Es la lección de PT-118 escrita en
  `audit-scope.yaml`: un control que se compara contra una línea base viva, no contra un umbral que
  obliga a desactivarlo.
- **Depende de PT-127**: si `migrate deploy` no produce un esquema correcto, este job no puede
  pasar. **Orden de ejecución obligado: PT-127 antes que PT-128.**

---

## PT-129 — Análisis de contexto — Las imágenes de despliegue (STATE 1-B)

Date: 2026-07-27
Fuentes consultadas: los seis `Dockerfile*` del repositorio, `docker-compose.yml`,
`src/api/src/main.ts`, `src/api/src/modules/health/`, `ci.yml`, `06-Backend-Architecture.md`,
`PTSA/Evidencias/E-021.md`.

### Components

| Componente | Estado |
|---|---|
| `src/api/Dockerfile` | Producción, multi-stage, usuario no-root. **Healthcheck a `/health` -> 404** |
| `src/api/Dockerfile.dev` | Desarrollo. Sin `HEALTHCHECK` propio; lo pone `docker-compose` |
| `src/admin/Dockerfile.dev` | **Sólo desarrollo** |
| `src/apps/base/Dockerfile.dev` | **Sólo desarrollo** |
| `src/apps/client/Dockerfile.dev` | **Sólo desarrollo** |
| `src/nginx/Dockerfile` | Producción. Sin healthcheck |
| `docker-compose.yml` | Define los healthchecks correctos (`/api/v1/health`, `< 500`) |

### Services

Los cuatro servicios NestJS. Sólo el API tiene imagen de producción; los otros tres no existen como
artefacto desplegable.

### Dependencies

```
main.ts: setGlobalPrefix('api') + versionado  ->  /api/v1/*
                                                     │
        Dockerfile (produccion)  --pide-->  /health   X  404
        docker-compose (desarrollo) --pide--> /api/v1/health  OK
```

La ruta es una **dependencia implícita** entre el arranque de NestJS y el healthcheck de la imagen.
Nada la verifica; por eso llevan divergiendo desde que se introdujo el prefijo.

### Data Flow

No hay flujo de datos. El flujo relevante es el del ciclo de vida del contenedor:

```
docker run -> start-period 5s -> healthcheck cada 30s -> 404 -> exit 1 -> retries 3
           -> UNHEALTHY permanente, con la aplicacion sirviendo trafico correctamente
```

### Files Involved

- `src/api/Dockerfile` — corrección del healthcheck
- `src/admin/Dockerfile`, `src/apps/base/Dockerfile`, `src/apps/client/Dockerfile` — **nuevos**
- `.github/workflows/ci.yml:201-207` — la ruta del job `docker`
- `docs/enterprise-documentation/06-Backend-Architecture.md` — si se documenta el despliegue

### Risk Areas

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Escribir tres Dockerfiles de producción **nuevos, sin precedente** en el repositorio | Copiar el patrón del de API (multi-stage, `npm prune --production`, usuario no-root) y **probar que cada imagen arranca** |
| R2 | Los servicios SSR necesitan `views/` y `public/` en la imagen; olvidarlos da un 500 silencioso | Verificación obligatoria: arrancar cada imagen y pedir una página real, no sólo el healthcheck |
| R3 | Duplicar el criterio del healthcheck en dos sitios y volver a divergir | Una sola definición. Si vive en la imagen, `docker-compose` la hereda |
| R4 | `@ironloot/core` es un paquete del workspace: el build de producción debe resolverlo | El `entrypoint.dev.sh` lo enlaza a mano en desarrollo (líneas 29-41). **En producción no hay equivalente**: hay que resolverlo en el build |

R4 es el riesgo real de este PT y no estaba en el hallazgo. Se registra aquí.

### Potential Intervention Points

1. `src/api/Dockerfile`: `/health` -> `/api/v1/health`, y alinear el criterio con desarrollo.
2. Tres `Dockerfile` de producción nuevos, con `@ironloot/core` resuelto en el build.
3. `ci.yml`: corregir la ruta, o construir los cuatro.
4. **Que el pipeline arranque la imagen al menos una vez** — sin esto, el hallazgo vuelve.

### Existing Constraints

- **`docker-compose` no cambia de comportamiento.** Es el entorno de desarrollo de todos los días.
- **Depende de PT-128** para el punto 4: sin pipeline en verde no hay dónde arrancar la imagen.
- El healthcheck de producción exige `=== 200` y el de desarrollo `< 500`. **Hay que decidir cuál es
  el correcto**, no copiar uno sobre otro sin pensarlo: `< 500` distingue «degradado» de «muerto»,
  que es la distinción útil cuando `/health/detailed` reporta una dependencia caída.

---

## PT-130 — Análisis de contexto — La coherencia entre documentación y código (STATE 1-B)

Date: 2026-07-27
Fuentes consultadas: los cinco documentos de `coverage_targets.docs`, los cinco `package.json`,
`src/api/src/main.ts`, `test/unit/documentacion/`, `HISTORY.log` (PT-090, PT-103, PT-126),
`PTSA/Evidencias/E-020.md`.

### Components

| Componente | Papel |
|---|---|
| `docs/enterprise-documentation/03-TRD.md` | Tabla de stack con **citas a fichero:línea** |
| `docs/enterprise-documentation/06-Backend-Architecture.md` | Árbol de servicios con versiones |
| `CLAUDE.md` | Instrucciones vinculantes. Documenta rutas de `health` |
| `02-PRD.md`, `09-Security-Architecture.md` | Los otros dos del alcance. **Sin revisar** |
| `test/unit/documentacion/` | **Ya existe**: `contexto-de-construccion.spec.ts` |

### Services

Ninguno. Es documentación y una prueba.

### Dependencies

```
package.json (x5)  ─────>  la verdad sobre versiones
main.ts             ─────>  la verdad sobre rutas
        ↑
        └── hoy nada las compara con lo que los documentos afirman
```

### Data Flow

No aplica. El flujo es de **autoría**: alguien cambia el código, y la segunda escritura —el
documento— es opcional porque nada la exige.

### Files Involved

- `docs/enterprise-documentation/03-TRD.md`
- `docs/enterprise-documentation/06-Backend-Architecture.md`
- `CLAUDE.md`
- `src/api/test/unit/documentacion/<nueva>.spec.ts` — **nueva prueba**

### Risk Areas

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | La prueba se vuelve frágil y alguien la desactiva | Comprobar **sólo afirmaciones citadas con fichero:línea o versión explícita**, no prosa. Y con caso de control, como el resto de pruebas de este tipo en el repositorio |
| R2 | Barrer los cinco documentos saca más casos de los previstos y el PT crece | Se acota: **este PT corrige lo encontrado y deja el mecanismo**. Lo que aparezca de más se registra, no se arrastra |
| R3 | `docs/` está gitignored… | **Ya no**: H-009 se corrigió y los cinco están seguidos por git. Comprobado en S-002 |

R3 merece nota: `coherencia-deuda-tecnica.spec.ts` **no corre en CI** justamente porque `docs/`
estaba fuera de git. Esa razón ya no existe, así que la prueba nueva **sí puede correr en CI** — y
conviene revisar si la vieja también.

### Potential Intervention Points

1. Corregir las tres afirmaciones falsas conocidas.
2. Barrer los cinco documentos del alcance en busca de más.
3. Escribir la prueba que compara versiones citadas contra `package.json` y rutas citadas contra el
   prefijo global.
4. Revisar si `coherencia-deuda-tecnica.spec.ts` ya puede entrar en CI.

### Existing Constraints

- **El patrón existe y se copia**: `coherencia-deuda-tecnica.spec.ts`,
  `plantillas-sin-js-inline.spec.ts`, `estilos-fuera-de-plantillas.spec.ts`. Los tres con casos de
  control.
- **`CLAUDE.md` es instrucción vinculante para todo agente futuro.** Un dato falso ahí cuesta más
  que en un documento de arquitectura.
- Depende de PT-128 para el punto 4 (meter la prueba en CI de forma que sirva de algo).

---

## PT-135 — Análisis de contexto — El lock que perdió Linux (STATE 1-B)

Date: 2026-07-28
Fuentes consultadas: `docs/implementation/HANDOFF.md`, `HISTORY.log` (PT-126, PT-127, PT-129),
`docs/implementation/evidence/PT-129/self-review.md`, `src/api/Dockerfile`, `src/api/Dockerfile.dev`,
`src/api/scripts/entrypoint.dev.sh`, `docker-compose.yml`, `src/api/package-lock.json` (HEAD y
`6d1b4ef^`), `CLAUDE.md` § Key Technical Decisions, y el estado real de Docker (contenedores,
imágenes, volúmenes, log del API).

### Components

| Componente | Papel en este defecto |
|---|---|
| `src/api/package-lock.json` | **Origen**. Perdió 15 entradas de plataforma en PT-126 |
| `src/api/Dockerfile.dev:24` | `RUN npm install` — reifica el lock podado. **Donde se manifiesta** |
| `src/api/Dockerfile:62` | El parche `--no-save ...-musl` que tapa el gemelo en producción |
| `docker-compose.yml:117` | `- /app/node_modules` — volumen anónimo. **El que lo tapaba hasta hoy** |
| `docker-compose.yml:18,61,258,302` | `condition: service_healthy` — el multiplicador: 1 defecto → 5 contenedores |
| `notifications.module` → mailer → `@css-inline` | La cadena de carga. Cuelga de `app.module`: sin ella no hay arranque |
| `entrypoint.dev.sh` | **Descartado como causa**: sus cuatro pasos se completan y lo declaran |

### Services

Ninguno del dominio. No se toca `src/api/src/`. Es cadena de suministro y empaquetado.

### Dependencies

```
package-lock.json (generado en Windows)
        │
        ├──> Dockerfile.dev  `npm install`  ──> node:20-slim (glibc) ──> pide -gnu  ──> ✗ MUERE
        │                                                                   (no hay parche)
        └──> Dockerfile      `npm install`  ──> node:20-alpine (musl) ──> pide -musl ──> ✓ vive
                                                                            (Dockerfile:62 lo baja a mano)
                                                                            ^
                                              el parche es lo único que separa
                                              a producción del mismo fallo
```

### Data Flow

No hay flujo de datos. El flujo relevante es **de instalación**, y tiene un punto ciego:

```
alguien ejecuta `npm install` en Windows
        └─> el lock queda con el árbol de SU plataforma
                └─> se comparte por git como si fuera reproducible
                        └─> el contenedor instala menos de lo que necesita
                                └─> y no falla en `npm install`: falla en `require`, al arrancar
```

El volumen anónimo insertaba una caché en medio de esa cadena, así que el fallo **no aparecía cuando
se causaba** (PT-126, ayer) sino cuando alguien reconstruía (hoy). Es exactamente la propiedad que
hizo invisibles a H-014 y H-017: **el momento del daño y el momento del síntoma están separados**.

### Files Involved

- `src/api/package-lock.json` — y, según H5, los de `src/apps/base`, `src/apps/client`, `src/admin`,
  `src/packages/core`
- `src/api/Dockerfile.dev`
- `src/api/Dockerfile` — al menos el comentario de la línea 53-62, que hoy afirma algo falso
- `src/api/test/unit/documentacion/` o `.../infraestructura/` — **la guarda que falta**, si se decide

### Risk Areas

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **Parchear `Dockerfile.dev` con `--no-save ...-gnu` y llamarlo resuelto.** Es el camino de una línea, copia lo que ya hay en producción, y deja el lock roto para el siguiente | Es tratar el síntoma. El lock es el defecto; el parche es lo que ha permitido que durase un día sin que nadie lo viera |
| R2 | Regenerar el lock en Linux y que se muevan **más** versiones de las previstas | Regenerarlo dentro del contenedor y **diffear sólo las entradas de plataforma**; si se mueve otra cosa, se registra y se decide, no se arrastra |
| R3 | **`msgpackr` degradado en silencio.** No rompe: por eso nadie lo notará | Verificar explícitamente si el acelerador carga, y **medirlo**, no suponerlo |
| R4 | La misma poda en los otros cuatro proyectos (H5), sin manifestarse todavía | Comprobar los cinco lock **antes** de diseñar. Un solo barrido |
| R5 | Reconstruir la imagen sin limpiar el volumen anónimo y creer que se arregló — o al revés, que sigue roto | El volumen viejo **tapa** el defecto y el nuevo lo destapa. Cualquier verificación tiene que declarar con qué volumen se hizo. Es la trampa nº 2 del HANDOFF, en otra forma |
| R6 | La imagen de producción **ya** depende de un parche cuyo comentario miente sobre por qué es necesario | Corregir el comentario forma parte de la corrección: `CLAUDE.md` lo dice — una cita falsa se lee con confianza |

### Potential Intervention Points

Dos caminos, y la elección es de STATE 2:

**Camino A — arreglar el lock (trata la causa).** Regenerar `package-lock.json` en Linux, dentro del
contenedor, para que vuelva a declarar las 17 entradas de plataforma. Ventaja: el lock vuelve a ser
un contrato reproducible en las tres plataformas, y el parche de `Dockerfile:62` deja de ser
necesario. Coste: el lock se mueve, y hay que revisar el diff.

**Camino B — parchear `Dockerfile.dev` (trata el síntoma).** Añadir
`npm install --no-save @css-inline/css-inline-linux-x64-gnu`, gemelo de la línea 62 de `Dockerfile`.
Ventaja: una línea, arranca hoy. Coste: **el lock sigue roto**, y el siguiente paquete nativo que
alguien añada repetirá el episodio. Y ya se sabe que repite: esta es la tercera vez.

**Lo que hace falta en ambos casos**, y es la parte que este repositorio no suele dejarse:

1. **Comprobar los otros cuatro lock** (H5) antes de decidir el tamaño del PT.
2. **Verificar `msgpackr`**: si el acelerador nativo carga o si llevamos un día en JavaScript puro.
3. **Una guarda.** Hoy nada comprueba que el lock declare las plataformas que las imágenes
   necesitan. Es medible en una prueba: leer los `optionalDependencies` de cada paquete nativo y
   exigir que las entradas del árbol cubran `linux-x64-gnu` y `linux-x64-musl`. Con caso de control,
   como todas las guardas de este repositorio (RULE-14).
4. **Corregir el comentario de `Dockerfile:53-62`**, que atribuye el fallo a npm-sobre-alpine cuando
   la causa era el lock. Una explicación falsa con aval de comentario es peor que ninguna.

### Existing Constraints

- **`docker-compose` es el entorno de todos los días.** Cambiar el volumen anónimo por uno nombrado
  o quitarlo tiene consecuencias que exceden este defecto: fuera de alcance salvo decisión explícita.
- **`src/api/scripts/` no está montado como volumen** (HANDOFF, trampa nº 2): tocar el entrypoint o
  el Dockerfile exige `docker-compose build api`. Aquí es inevitable de todas formas.
- **Editar `schema.prisma` exige migración** (RULE-10): no aplica, no se toca el esquema — y conviene
  decirlo porque la migración es lo que uno mira primero al ver este log.
- **Un control que nadie ha visto fallar no es un control**: la guarda del punto 3 se prueba en los
  dos sentidos o no se escribe.
- **Toda cita a fichero:línea es verificable y por eso puede mentir con aval** (H-016). El
  comentario de `Dockerfile:56` es un caso vivo de eso, encontrado por accidente al investigar esto.

### Update U-001 — dos restricciones vinculantes del ACK humano (2026-07-28)

El ACK de STATE 2 corrigió dos supuestos del análisis. **Las dos son restricciones, no preferencias**,
y cambian el diseño:

1. **No debe existir ningún `npm install` en la máquina local.** Se desarrolla en Docker; **toda**
   operación de npm —incluida la generación del lock— se ejecuta **en el contenedor**.
   - Consecuencia inmediata: el mecanismo M2 del plan (regenerar el lock en el host con
     `--package-lock-only`) **queda descartado**, no como peor opción sino como prohibido.
   - Consecuencia de fondo: el riesgo R1 estaba mal formulado. No es «el desarrollador podría
     ejecutar `npm install` en Windows y romper el lock»: es que **ese comando no debería poder
     ejecutarse allí**, y hoy nada lo impide. La invariante existe y no tiene mecanismo. Eso convierte
     la guarda de plataforma en **dos** guardas: una que vigila el contenido del lock y otra que
     impide generarlo donde no debe.
   - Y explica el defecto entero: el lock de HEAD sólo pudo salir de un `npm install` en Windows
     (PT-126). **La invariante ya se violó una vez, y nadie se enteró hasta que un contenedor murió.**

2. **No se puede dejar deuda.** En particular, la alternativa C —el lock seguido por git contra
   `.gitignore:40`— **no puede quedar abierta: es obligatorio trabajarla dentro de este PT.**
   - Consecuencia: PT-135 deja de ser «arreglar un lock» y pasa a **decidir la política de
     reproducibilidad de dependencias de la plataforma**. Eso lo reclasifica a **MAJOR**.
   - Y arrastra a los otros tres puntos que el plan había declarado abiertos: `msgpackr` compilando
     desde fuente, `npm ci` en CI, y el estado del lock de `src/admin`. Ninguno puede quedar como
     nota.

### Existing Constraints — añadidas por U-001

- **Prohibido `npm install` en el host.** Cualquier paso del plan que lo requiera es inválido por
  construcción, no discutible.
- **Cero deuda diferida.** Todo lo que la investigación destape se resuelve dentro del PT o se
  demuestra que no es deuda. «Registrado para más adelante» no es una salida disponible.
- **`docker compose run` es el nuevo camino de cualquier operación npm**, y hay que resolver un
  detalle: el servicio `api` tiene `ENTRYPOINT ["./scripts/entrypoint.dev.sh"]`, así que un
  `docker compose run api npm ...` ejecutaría el entrypoint con argumentos. Exige `--entrypoint`.

---

## PT-136 · PT-137 · PT-138 · PT-139 · PT-140 · PT-141 — Análisis de contexto — La capa de verificación y sus registros

Date: 2026-07-28
Variantes: **STATE 1-B** para PT-136…PT-139 (BUG) · **STATE 1-R** para PT-140 y PT-141 (REFACTOR)

Fuentes consultadas y **verificadas en la fuente real**, no en otro documento:
`.github/workflows/ci.yml` · `gh api repos/a81Biz/IronLoot/actions/runs` · `git branch -r` ·
`git rev-list --left-right --count master...origin/master` · `docs/implementation/PENDING_TASKS.md` ·
`HANDOFF.md` · `HISTORY.log` · `ROADMAP.md` · `PTSA/PENDIENTES.md` · `PTSA/Hallazgos/H-*.md` ·
`PTSA/ESTADO_ACTUAL.md` · `docs/enterprise-documentation/10-Technical-Debt.md` y su `README.md` ·
`docs-v2/README.md` · `CLAUDE.md` · `src/api/src/app.module.ts` ·
`src/api/src/common/redis/throttler-redis.module.ts` · `docker-compose.yml` · `.env.example` ·
`src/admin/views/pages/{reconciliation,refunds}.html` · `src/admin/views/layouts/admin.html` ·
`tests/qa-browser-suite/71-paypal-guaranteed.js` · ejecución real de la suite unitaria del API
(**93 suites / 691 tests / 0 fallos / 13 s**) y de `audit:check`, `audit:schema` y
`audit:observability` dentro del contenedor.

### Components

| Componente | Papel |
|---|---|
| `.github/workflows/ci.yml:4-7` | **La causa raíz de PT-136.** Dispara en `dev/qa/prep/prod`; la única rama que existe es `master` |
| Los 8 jobs de CI | `lint` · `security-audit` · `schema-drift` · `test-unit` · `test-integration` · `observabilidad` · `build` · `docker`. Los registros dicen «siete» |
| `security-audit`, `schema-drift`, `observabilidad` | Los tres **sin `needs`** a propósito (H-015). El razonamiento es correcto; nunca se comprobó que el workflow arrancara |
| Los 11 mecanismos de `ESTADO_ACTUAL.md:63-71` | Todos escritos, todos probados a mano, **ninguno ejecutado por CI jamás** |
| `src/api/src/app.module.ts:61`, `throttler-redis.module.ts:31` | PT-137: leen `REDIS_HOST`; el compose declara `REDIS_URL` |
| Los 8 `*.spec.ts` que resuelven `RAIZ` | PT-138: no pueden correr donde RULE-15 dice que se ejecuta npm |
| `src/admin/views/layouts/admin.html:13,162,171` | PT-139: declara `head`, `content`, `scripts`. **No declara `title`** |
| Los 12 almacenes de pendientes | PT-140: ninguno declara precedencia sobre otro |
| `docs/enterprise-documentation/` vs `docs-v2/` | PT-141: los dos se declaran oficiales |

### Services

**Ninguno del dominio queda tocado por PT-136, PT-138, PT-140 ni PT-141.** PT-137 toca configuración
de infraestructura (`app.module`, throttler). PT-139 toca dos plantillas y su JavaScript de sitio.
El producto —subastas, pujas, monedero, pagos— no entra en ninguno de los seis.

### Dependencies

```
PT-136  (CI se ejecuta)
   │
   ├──> es requisito de PT-140: la guarda de coherencia de registros nacería
   │    igual que las once anteriores — escrita y sin correr sola nunca
   │
   ├──> es requisito de la guarda de PT-139 (bloques de plantilla)
   │
   └──> cierra el criterio 10 de PT-135, hoy inalcanzable

PT-141.A (decision documental)  ──> deja de pagarse la doble escritura en cada PT
PT-141.B (regenerar Foundation) ──> depende de PT-136..139: un snapshot no debe
                                    documentar defectos conocidos como diseño

PT-137, PT-138, PT-139  ──  independientes entre si
```

### Data Flow

El flujo relevante no es de datos: es **de verificación**, y tiene el mismo punto ciego tres veces.

```
se escribe un control  ──>  se ejecuta a mano una vez  ──>  se declara «vigilado en CI»
                                                                    │
                                                                    └──> y CI no se ejecuta nunca
                                                                          (PT-136)

se cierra un trabajo  ──>  se escribe en 1 de los 12 registros  ──>  los otros 11 siguen diciendo PENDING
                                                                          (PT-140)
```

Es el mismo defecto en dos planos: **el momento en que algo se declara verdadero y el momento en que
alguien lo comprueba están separados, y nada cierra la distancia**. Es la propiedad que hizo
invisibles a H-014, H-015, H-017 y a F-33/F-34.

### Files Involved

- **PT-136**: `.github/workflows/ci.yml`; guarda nueva sobre las ramas del disparador.
- **PT-137**: `src/api/src/app.module.ts`, `src/api/src/common/redis/throttler-redis.module.ts`,
  `src/api/src/common/config/configuration.ts`, `src/api/src/common/redis/distributed-lock.service.ts`,
  `docker-compose.yml`, `.env.example`, `CLAUDE.md`; guarda nueva sobre variables de entorno.
- **PT-138**: `docker-compose.yml`, `src/api/scripts/observability-check.ts`,
  `src/api/scripts/audit-check.ts`, los 8 `*.spec.ts` que leen la raíz.
- **PT-139**: `src/admin/views/pages/reconciliation.html`, `src/admin/views/pages/refunds.html`,
  `src/admin/public/js/pages/`; guarda nueva sobre bloques de plantilla.
- **PT-140**: `PENDING_TASKS.md`, `HISTORY.log`, `PTSA/PENDIENTES.md`, `ROADMAP.md`, `CLAUDE.md`;
  guarda nueva de coherencia de registros.
- **PT-141**: `CLAUDE.md`, `docs-v2/transversal/Registro-Maestro-de-ADR.md`,
  `docs/enterprise-documentation/`, `PTSA/` (las dos citas rotas).

### Risks

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **Al arrancar CI por primera vez, los 8 jobs salen rojos.** Precedente literal: PT-128 ejecutó los 17 ficheros e2e por primera vez y 42 de 80 tests fallaron | Es el resultado esperado, no el fracaso. Rojo y visible es lo que se compra. Se mide antes con `act` o con una rama de prueba, y lo que aparezca se registra como PT propio, no se parchea dentro de PT-136 |
| R2 | `npm ci` gobernado por los locks de PT-135 **estrena en CI** | Ya ensayado en contenedor (exit 0). No lo sustituye, y por eso es criterio explícito |
| R3 | Marcar hecho en PT-140 algo que no lo está | Cada cambio de estado lleva cita `fichero:línea` verificada. Es la disciplina de PT-090, ahora con guarda |
| R4 | Montar la raíz del monorepo en `api` (PT-138) altera el arranque o el watch | Se comprueba el ciclo completo levantar → healthy → recargar antes de darlo por bueno |
| R5 | Unificar Redis (PT-137) rompe el rate limiting sin que se note | El throttler es defensa de los endpoints de auth. Se ejerce con peticiones reales, no sólo con la suite |
| R6 | Regenerar Foundation (PT-141.B) rompe las citas que vigila la guarda de PT-130 | Las dos guardas documentales se ejecutan antes y después. **H-016 volvería con aval si no** |
| R7 | Retirar `dev/qa/prep/prod` cierra la puerta a un flujo de entornos futuro | Se añade con su ADR el día que exista. Declarar hoy ramas que nadie ha creado es exactamente lo que produjo PT-136 |

### Constraints

- **`HISTORY.log` es append-only.** Las entradas que faltan de PT-129 y PT-130 se añaden al final,
  fechadas hoy y diciendo a qué fecha corresponden. No se reordena.
- **`[R44]` de PTSA sigue vigente**: el agente no cierra hallazgos. H-005 sigue siendo del humano.
- **RULE-14**: toda guarda nueva —y estos seis PT entregan cuatro— se prueba en los dos sentidos con
  casos de control.
- **RULE-15**: npm no se ejecuta en el host. PT-138 existe precisamente porque esa regla y la forma
  de correr ocho guardas no encajan todavía.
- **Cerrar es dos escrituras** (código + registro), y PT-140 es el PT que convierte esa regla en
  mecanismo en vez de nota.
- **Ninguno de los seis toca `src/api/src/` salvo PT-137**, y ahí sólo configuración de conexión.

### Lo que ya se midió y no hace falta volver a medir

| | |
|---|---|
| Suite unitaria del API | **93 suites / 691 tests / 0 fallos** (13 s). Confirma la cifra de `HANDOFF.md:7` |
| `master` vs `origin/master` | `0731161` en ambos; `0 0` ahead/behind. **Ya está empujado** |
| Ejecuciones de CI | **0** en toda la historia del repositorio |
| Hallazgos PTSA activos | **1** (H-005). Los otros 19 cerrados, verificado leyendo los 20 ficheros |
| Ramas sin fusionar | Ninguna |

---

## PT-142 · PT-143 — Análisis de contexto — Lo que la primera corrida de CI destapó (STATE 1-B)

Date: 2026-07-28
Origen: triaje de PT-136.5, corrida 30408275255. Los dos clasificados como **defecto del
repositorio** por la regla escrita en `changes/PT-136-ci-que-se-ejecuta/design.md` § D3.

Fuentes consultadas y verificadas: log completo del job `Integration Tests` ·
`src/api/src/modules/system-config/system-config.service.ts` ·
`src/api/src/modules/wallet/wallet.service.ts` · `src/api/prisma/schema.prisma:761` ·
`src/api/test/core/auth-helper.ts` · barrido de `findUnique|findFirst` seguido de `.create(` en todo
`src/api/src/`.

### Components

| Componente | Papel |
|---|---|
| `system-config.service.ts:189-205` | **PT-142, sitio 1.** `seed()` en `onModuleInit`: corre en cada arranque |
| `wallet.service.ts:27-33` | **PT-142, sitio 2.** `getWallet()` crea el monedero de forma perezosa |
| `wallet.service.ts:151-152` | **PT-142, sitio 3.** Depósito: crea el monedero dentro del asiento |
| `wallet.service.ts:412-415` | **PT-142, sitio 4.** Cierre de subasta: monedero del vendedor |
| `schema.prisma:761` | `userId @unique` — la restricción que convierte la carrera en error |
| `auth-helper.ts:105-115` | **PT-143.** Limpieza que borra usuarios con subastas |
| Jest en paralelo + base vacía | El disparador de los dos. Ninguna de las dos condiciones se da en desarrollo |

### Services

**PT-142 toca `WalletModule` y `SystemConfigModule`.** El primero es el dinero: saldo, fondos
retenidos y ledger. Ningún cambio de contrato ni de datos — sólo cómo se crea una fila que puede no
existir.

**PT-143 no toca `src/`**: es infraestructura de pruebas.

### Dependencies

```
PT-136 (CI corre)  ──>  destapa PT-142 y PT-143
                            │
PT-142  ──> desbloquea `build` y `docker`, que nunca se han ejecutado
        ──> y sin el, el criterio 1 de PT-136 no se cierra jamas

PT-143  ──> independiente. La suite puede seguir roja en paralelo sin
            bloquear a nadie mas de lo que ya bloquea
```

### Data Flow

El flujo que importa es el de creación perezosa, y tiene una ventana:

```
peticion A: findUnique(wallet) -> null ──┐
peticion B: findUnique(wallet) -> null ──┤   las dos ven "no existe"
peticion A: create(wallet)     -> OK   ──┤
peticion B: create(wallet)     -> P2002 ─┘   una pierde
```

**Estar en una transacción no cierra la ventana**: *read committed* no impide que dos transacciones
lean la ausencia de la misma fila. La transacción da atomicidad, no exclusión sobre algo que aún no
existe.

El caso concreto que preocupa: un usuario **sin monedero** cuya notificación de depósito llega
mientras carga su panel. `getWallet()` y la acreditación corren a la vez y **la acreditación puede
perder**. Es lo que PT-087 construyó el ciclo de pago para impedir.

### Risks

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | `upsert` cambia el comportamiento observable del monedero | No debería: el resultado es el mismo. Se ejerce el ciclo de pago real, no sólo la suite |
| R2 | Hay un quinto sitio que el barrido no vio (otro nombre, otro orden) | El barrido se repite con `findFirst` y con `count`; lo que quede se declara |
| R3 | Reproducir la carrera es difícil y se «arregla» sin prueba que falle | **Prueba concurrente explícita**: N creaciones simultáneas del mismo monedero. Sin RED no hay GREEN |
| R4 | PT-143 opción [A] (`--runInBand`) tienta porque es una línea | Descartada por escrito: haría verde una suite que sigue sin poder correr en paralelo |
| R5 | La limpieza de `auth-helper` borra sobre una base equivocada | Ya es riesgo hoy. PT-143 lo acota |

### Constraints

- **El monedero es dinero.** Cualquier cambio ahí se ejerce contra el ciclo de pago real, no sólo
  contra la suite (lección de PT-087 y de la validación por navegador).
- **Tests primero (RED)**: la prueba concurrente tiene que fallar antes de tocar el servicio.
- `Payment.reference` sigue siendo la clave de idempotencia del asiento; PT-142 no la toca.
- **PT-143 no puede usar `--runInBand` como solución**, sólo como medida temporal si se declara.

## PT-200 — contexto

**Componentes**: `docs/implementation/HANDOFF.md` · `docs-v2/README.md` ·
`docs-v2/5-qa/Master-Test-Plan.md` · `docs/enterprise-documentation/10-Technical-Debt.md` ·
`src/api/test/unit/documentacion/afirmaciones-de-estado-verificadas.spec.ts`.

**Consultado**: `CLAUDE.md` § *Dónde vive un pendiente* (HANDOFF es derivado de `PENDING_TASKS.md`, y
**estado actual, no historia**) · `11-Conventions.md` RULE-31/33/34/35/**38** · el Registro Maestro de ADR
(49 decisiones; ninguna cubre esto) · `HISTORY.log` PT-188/189/191/197/198.

**Dependencias**: la guarda nueva lee `docs-v2/transversal/Registro-de-Hallazgos.md`, que es la fuente que
manda para los veredictos (RULE-38), y `11-Conventions.md`, `PTSA/Hallazgos/`, `HISTORY.log` y
`10-Technical-Debt.md` para las cifras que `HANDOFF` declara.

**Riesgo principal — y es el que ya mordió cinco veces hoy**: una guarda sobre prosa produce falsos
positivos, y *un falso positivo enseña a desconfiar de la guarda*, que es la forma silenciosa de perderla.
Mitigación declarada en el plan: la guarda lee **sólo la cabecera de estado** de `HANDOFF` (las líneas que
declaran una cifra con formato fijo), no el cuerpo; y la de veredictos exige **un solo `AUD` en la línea**,
porque una línea con varios atribuye la palabra al que no es — que es el falso positivo que produjo mi
primera medición, cuatro de cinco.

**Restricción**: `HISTORY.log` es append-only. Lo que se retira de `HANDOFF` **no se pierde**: ya está en
`HISTORY.log`, que es el registro que manda para el trabajo terminado. Esto es lo que hace que recortar
`HANDOFF` sea seguro y no una pérdida de información.
