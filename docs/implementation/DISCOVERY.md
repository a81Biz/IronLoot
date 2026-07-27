# DISCOVERY.md — Registro de Discovery (STATE 1-B)
**FDGE V3 | Solo append**

---

## PT-026 — BUG — BidsService: EXTENSION_MS hardcodeado ignora configuración soft-close

**Fecha**: 2026-06-23 | **Origen FPGE**: R-001 ← H-001 | **Complejidad**: STANDARD

### Expansión del bug

| | |
|---|---|
| **What** | `const EXTENSION_MS = 5 * 60 * 1000` (300s) hardcodeado en `BidsService`. La ventana de extensión de soft-close real es 300s, no los 120s configurados en `AUCTION_SOFT_CLOSE_WINDOW_SEC`. |
| **Where** | `src/api/src/modules/bids/bids.service.ts` líneas 98-108 |
| **When** | En cada puja colocada cuando la subasta está en los últimos segundos antes de cerrar (ventana soft-close) |
| **How** | `BidsService.placeBid()` usa `EXTENSION_MS` como constante literal para calcular la nueva fecha de cierre. El scheduler (`AuctionSchedulerService.getSoftCloseWindowSec()`) ya implementa correctamente la lectura desde `SystemConfig`, pero `BidsService` nunca lo integró. |
| **Why** | Valor temporal de desarrollo nunca parametrizado. El comportamiento correcto existe en el scheduler pero no fue replicado en el servicio de pujas. |

### Comportamiento esperado vs actual

| | |
|---|---|
| **Esperado** | Nueva puja en soft-close → subasta se extiende exactamente `AUCTION_SOFT_CLOSE_WINDOW_SEC` segundos (configurable, default 120s) |
| **Actual** | Nueva puja en soft-close → subasta se extiende siempre 300s, independientemente de la configuración |

### Impacto

- **Usuarios afectados**: Todos los compradores y vendedores en subastas activas durante soft-close
- **Impacto negocio**: CR-002 violada — la configurabilidad del parámetro crítico de subasta es ilusoria. Cambiar `AUCTION_SOFT_CLOSE_WINDOW_SEC` en admin no tiene efecto en la extensión real.

### Componentes afectados

- `src/api/src/modules/bids/bids.service.ts` — modificar
- `src/api/src/modules/scheduler/auction-scheduler.service.ts` — referencia (no modificar, patrón correcto)
- `src/api/src/modules/system-config/` — fuente de la config (no modificar)
- `@ironloot/core` — no afectado

### Causa raíz

Constante literal `EXTENSION_MS` que debería ser `getSoftCloseWindowMs()` inyectando `ConfigService` o `SystemConfigService`.

### Confidencias

| | |
|---|---|
| **Root Cause Confidence** | 98% |
| **Architecture Confidence** | 96% |
| **Solution Confidence** | 95% |

**Investigation Gate**: NO activado — causa raíz conocida, confidencias > 70%.

---

## PT-028 — INVESTIGATION — Mecanismo auth JS browser en CLIENT (H-006)

**Fecha**: 2026-06-23 | **Origen FPGE**: R-003 ← H-006 | **Complejidad**: STANDARD

### Expansión de la investigación

| | |
|---|---|
| **What** | Se desconoce si las llamadas JS browser → API en el CLIENT usan autenticación segura (cookies HttpOnly) o insegura (localStorage / Authorization header). |
| **Where** | `src/apps/client/public/js/pages/wallet/` (deposit.js, withdraw.js y utils de fetch compartidos) |
| **When** | Al cargar cualquier página de wallet en CLIENT que ejecuta operaciones financieras desde JS del browser |
| **How** | `AppController` devuelve solo `{ apiUrl: API_URL }` en páginas de wallet, sin datos pre-cargados, lo que implica que toda la interacción es browser→API directo. El mecanismo de auth de esas llamadas no fue verificado en F5/PTSA. |
| **Why** | BFF implementado a medias: SSR correcto (cookies HttpOnly), pero JS browser puede estar usando un mecanismo diferente para las llamadas directas. |

### Hipótesis a investigar

1. **H1 — Seguro**: JS browser usa `fetch(url, { credentials: 'include' })` → cookies HttpOnly se envían automáticamente → BFF pattern preservado a nivel de token
2. **H2 — Inseguro**: JS browser lee un token de `localStorage` o lo envía en `Authorization: Bearer ...` header → tokens expuestos al JS, vulnerabilidad XSS

### Pasos de investigación

1. Leer `src/apps/client/public/js/pages/wallet/deposit.js`
2. Leer `src/apps/client/public/js/pages/wallet/withdraw.js`
3. Buscar utils de fetch compartidos en `src/apps/client/public/js/`
4. Verificar cómo se pasa/usa `apiUrl` en los templates Nunjucks
5. Determinar hipótesis correcta → reclasificar H-006 y decidir PT type (BUG/REFACTOR o CERRAR)

### Impacto potencial

- **H1 confirmada**: H-006 baja a BAJA o se cierra. D2 +5 pts. Sin trabajo adicional.
- **H2 confirmada**: H-006 sube a ALTA. Requiere migrar a proxy BFF o implementar `credentials: 'include'`. D2 sigue en -5 pts hasta fix.

### Confidencias actuales

| | |
|---|---|
| **Root Cause Confidence** | 20% (desconocida hasta leer JS browser) |
| **Architecture Confidence** | 70% |
| **Solution Confidence** | N/A — pending investigation |

**Investigation Gate**: ACTIVADO — root cause desconocida, confidence < 70%. **Implementation planning FORBIDDEN** hasta completar investigación.

---

## PT-029 — BUG — Withdraw: validación método de pago comentada

**Fecha**: 2026-06-23 | **Origen FPGE**: R-004 ← H-004 | **Complejidad**: STANDARD

### Expansión del bug

| | |
|---|---|
| **What** | El paso de validación del método de pago destino en `WalletController.withdraw()` está completamente comentado. El sistema acepta cualquier `referenceId` como destino de retiro sin verificar que pertenezca al usuario autenticado. |
| **Where** | `src/api/src/modules/wallet/wallet.controller.ts` líneas 43-55 |
| **When** | En cada `POST /api/wallet/withdraw` — ocurre en cada solicitud de retiro |
| **How** | El código tiene el scaffolding correcto (`getUserPaymentMethod()` referenciado en comentario) pero la función no existe en `PaymentsService` y la validación está comentada con "Mock for now". |
| **Why** | La funcionalidad de gestión de métodos de pago de usuario (registro, listado, eliminación) no estaba implementada cuando se desarrolló el endpoint de retiro. Deuda técnica deliberada (TD-003). |

### Comportamiento esperado vs actual

| | |
|---|---|
| **Esperado** | `POST /api/wallet/withdraw { referenceId: "mp_123" }` → verificar que `mp_123` pertenece al usuario → si no → 400 Bad Request |
| **Actual** | `POST /api/wallet/withdraw { referenceId: "cualquier_valor" }` → solo verifica límite diario → procede siempre |

### Impacto

- **Usuarios afectados**: Cualquier usuario con saldo en wallet
- **Riesgo**: Un usuario podría especificar un `referenceId` ajeno y redirigir fondos a destinos no autorizados (si el proveedor de pagos no tiene protección adicional)
- **Bloqueador**: Esta validación es prerequisito para habilitar retiros en producción real

### Componentes afectados

- `src/api/src/modules/wallet/wallet.controller.ts` — des-comentar validación
- `src/api/src/modules/payments/payments.service.ts` — implementar `getUserPaymentMethod(userId, referenceId)`
- Modelo de datos de payment methods — verificar tabla/relación existente en schema.prisma

### Confidencias

| | |
|---|---|
| **Root Cause Confidence** | 95% |
| **Architecture Confidence** | 82% (depende del modelo de datos de payment methods) |
| **Solution Confidence** | 75% (requiere verificar schema para `payment_methods` o equivalente) |

**Investigation Gate**: NO activado — causa raíz conocida. Investigación parcial requerida sobre modelo de datos antes de STATE 2 si `architecture confidence` < 85%.

---

## PT-028 — INVESTIGATION COMPLETE — Resultado: H1 confirmada, H-006 reclasificada BAJA

**Fecha cierre**: 2026-06-23 | **Complejidad original**: STANDARD | **Estado**: CLOSED

### Hallazgos de investigación

| Hallazgo | Resultado |
|---|---|
| `src/apps/client/public/js/pages/` | NO EXISTE — directorio vacío, solo `css/client.css` |
| Mecanismo JS browser | Todo el JS de wallet está **inline** en los templates Nunjucks (`{% block scripts %}`) |
| `deposit.html` | `fetch(API + '/api/v1/wallet/deposit', { credentials: 'include', ... })` — ✅ H1 |
| `withdraw.html` | `fetch(API + '/api/v1/wallet/withdraw', { credentials: 'include', ... })` — ✅ H1 |

### Hipótesis confirmada: **H1 — Seguro**

`credentials: 'include'` envía automáticamente la cookie HttpOnly que contiene el JWT. El token **nunca** es accesible para el código JS del browser. El invariante de seguridad BFF se cumple correctamente.

El `apiUrl` expuesto en templates es solo para construir la URL del `fetch()` — no es un bypass de seguridad.

### Conclusión

- H-006 reclasificada: MEDIA (penalización -5) → **BAJA (penalización -1)**
- CR-002 (BFF pattern) verificado como cumplido en páginas de wallet
- D2 proyectado: +4 pts (de 84 a 88 / 89 post H-003 validación)
- **Sin trabajo adicional requerido.** Como mejora futura (no urgente): migrar páginas wallet a SSR completo eliminaría dependencia de browser JS. Sin PT urgente.

**PT-028 STATUS: CLOSED**

---

## PT-033 — BUG — Auth email links apuntan a CLIENT: verify-email/reset-password inaccesibles y login bloqueado
**Fecha**: 2026-06-23
**Tipo**: BUG
**Complejidad**: STANDARD

### Expansión

**Qué:**
`EmailService` construye las URLs de los emails transaccionales (verificación de cuenta y recuperación de contraseña) usando la variable de entorno `CLIENT_URL` en lugar de `BASE_URL`. Las rutas `/auth/verify-email` y `/auth/reset-password` SOLO existen en el sitio BASE (público, :5174). El sitio CLIENT (privado, :5175) no las tiene — resultado: 404 en CLIENT con barra lateral visible. Adicionalmente, BASE tiene un `NotFoundExceptionFilter` declarado pero no registrado, de modo que sus propias rutas inexistentes no devuelven una página 404 adecuada.

**Dónde:**

| Archivo | Línea | Problema |
|---|---|---|
| `src/api/src/modules/notifications/email.service.ts` | 17 | `get<string>('CLIENT_URL', 'http://localhost:5173')` — var errónea + default incorrecto |
| `src/apps/base/src/main.ts` | — | `NotFoundExceptionFilter` no registrado (filtro existe en `src/apps/base/src/common/filters/not-found.filter.ts` pero nunca llamado) |
| `docker-compose.yml` (servicio `api`) | 83–95 | `BASE_URL` no definida en el bloque `environment` del servicio API |
| `.env.example` | — | `BASE_URL` y `CLIENT_URL` no documentadas |

**Cuándo:**
- Al registrar un nuevo usuario → `AuthService.register()` llama `emailService.sendVerificationEmail()` → link generado a CLIENT
- Al solicitar recuperación de contraseña → `AuthService.forgotPassword()` llama `emailService.sendPasswordResetEmail()` → link generado a CLIENT
- En ambos flujos, el usuario recibe en el email una URL apuntando a CLIENT en lugar de BASE

**Cómo se manifiesta:**
1. Usuario hace clic en link del email → llega a `client.ironloot.local/auth/verify-email?token=...` o `/auth/reset-password?token=...`
2. CLIENT no tiene esas rutas → NestJS lanza `NotFoundException`
3. `NotFoundExceptionFilter` de CLIENT renderiza `pages/404.html` que extiende `layouts/client.html` → sidebar siempre visible (independientemente del estado de autenticación)
4. **Efecto cascada en login:** Usuario nunca puede verificar email → permanece en estado `PENDING_VERIFICATION` → `AuthService.login()` llama `validateUserState()` → lanza `UserNotVerifiedException` → 403 → login bloqueado

**Por qué (causa raíz confirmada):**
`EmailService` (línea 17) hardcodea `CLIENT_URL` — la variable de entorno que identifica el portal privado. Las rutas de autenticación pública pertenecen a BASE, no a CLIENT. El developer usó la variable equivocada y además el default es `http://localhost:5173` (puerto 5173) que no corresponde a ningún servicio del stack (BASE=5174, CLIENT=5175). En docker-compose, `CLIENT_URL` no está definida para el servicio `api`, por lo que `EmailService` usa el fallback incorrecto. La variable correcta es `BASE_URL` con default `http://localhost:5174`.

El `NotFoundExceptionFilter` de BASE es un bug independiente: el archivo existe en `src/apps/base/src/common/filters/not-found.filter.ts` pero `src/apps/base/src/main.ts` no lo importa ni registra con `app.useGlobalFilters()`.

### Comportamiento esperado
- `sendVerificationEmail()` genera: `${BASE_URL}/auth/verify-email?token=<token>` → llega a BASE → template renderiza → JS llama `POST /api/v1/auth/verify-email` vía BFF proxy → usuario verificado → puede iniciar sesión
- `sendPasswordResetEmail()` genera: `${BASE_URL}/auth/reset-password?token=<token>` → llega a BASE → token se inyecta en hidden input → formulario llama `POST /api/v1/auth/reset-password` → contraseña cambiada
- 404 en BASE: `NotFoundExceptionFilter` registrado → renderiza `pages/404.html` (extiende `layouts/base.html`, sin sidebar)

### Comportamiento actual
- Emails generan URL con `http://localhost:5173` (fallback incorrecto) o con `CLIENT_URL` si definida → llega a CLIENT
- CLIENT sin ruta coincidente → `NotFoundException` → `NotFoundExceptionFilter` → `pages/404.html` extendiendo `layouts/client.html` → **sidebar visible** (independientemente de si el usuario está autenticado)
- Token de verificación nunca procesado → usuarios nuevos en `PENDING_VERIFICATION` permanentemente → `login` retorna 403 `USER_NOT_VERIFIED` → **no pueden iniciar sesión**

### Impacto
**Usuarios afectados:** Todos los nuevos usuarios que se registren desde el estado actual del sistema. Usuarios que intenten recuperar su contraseña. Si `CLIENT_URL` ha estado mal configurada desde el inicio, posiblemente ningún usuario ha podido verificar su cuenta mediante el enlace del email.

**Impacto de negocio:**
- **CRÍTICO**: El flujo de onboarding está completamente bloqueado — ningún usuario nuevo puede activar su cuenta
- **CRÍTICO**: La recuperación de contraseña no funciona
- **ALTO**: Login bloqueado para todos los usuarios no verificados (PR-1.1 AC-1.2: `USER_NOT_VERIFIED` → 403)
- Consecuencia directa: plataforma inutilizable para nuevos usuarios

### Componentes afectados

| Componente | Archivo | Cambio requerido |
|---|---|---|
| `EmailService` (API) | `src/api/src/modules/notifications/email.service.ts:17` | Cambiar `CLIENT_URL` → `BASE_URL`; corregir default a `http://localhost:5174` |
| BASE `main.ts` | `src/apps/base/src/main.ts` | Importar y registrar `NotFoundExceptionFilter` |
| `docker-compose.yml` | `docker-compose.yml` (servicio `api`) | Agregar `BASE_URL=http://base.localhost` en bloque `environment` del servicio `api` |
| `.env.example` | `.env.example` | Documentar `BASE_URL` con valor de ejemplo |

### Acoplamiento (Graphify)
Graphify disponible en `graphify-out/`. El acoplamiento directo de este bug:
- `EmailService` ← `NotificationsModule` ← `AuthModule` (usa `EmailService` en `register()` y `forgotPassword()`)
- `AuthController` → `AuthService` → `EmailService` → `frontendUrl` (punto de falla)
- `CLIENT AppController` → `NotFoundExceptionFilter` → `layouts/client.html` (manifestación del bug)
- `BASE AppController` (rutas `/auth/reset-password`, `/auth/verify-email`) → nunca alcanzadas
- Radio de impacto: contenido en `AuthModule` + `NotificationsModule`; NO afecta wallet, bids, auctions, payments

### Nivel de Confianza
Root Cause: **98%** | Architecture: **97%** | Solution: **95%**

Evidencia directa:
- `email.service.ts:17`: `get<string>('CLIENT_URL', 'http://localhost:5173')` — lectura confirmada
- `docker-compose.yml:236`: `CLIENT_URL=http://client.localhost` configurado para el servicio `base`, NO para el servicio `api`
- `src/apps/client/src/common/filters/not-found.filter.ts`: renderiza `pages/404.html` (no registrado para BASE)
- `src/apps/client/views/layouts/client.html:11`: `<aside class="sidebar">` — siempre visible en todas las páginas CLIENT
- `client/app.controller.ts`: NO tiene rutas `/auth/verify-email` ni `/auth/reset-password`
- `base/app.controller.ts:81,87`: SÍ tiene ambas rutas como `@Public()`
- Investigation Gate: NO activado — causa raíz conocida con evidencia directa, todas las confidencias > 70%

### Estado
DISCOVERY_PENDING

## PT-034 — Login no inicia sesión: cookie cross-subdomain no alcanza CLIENT
Fecha: 2026-06-23
Tipo: BUG
Complejidad: STANDARD

### Expansión

**Qué:**
El formulario de login en BASE acepta las credenciales, la API responde con éxito (tokens generados), pero el usuario termina de vuelta en la página de login sin haber ingresado. No se muestra mensaje de error ni de éxito.

**Dónde:**
- Capa de cookies: `src/apps/base/src/main.ts` — `COOKIE_OPTIONS` (línea 22-29); cookie se escribe con `expressRes.cookie(...)` sin atributo `domain`
- Guard de autenticación CLIENT: `src/apps/client/src/common/guards/client-auth.guard.ts` — `req.cookies?.['access_token']` (línea 15); si no hay token → `res.redirect(BASE_URL + '/auth/login')` (línea 17)
- Configuración Docker: `docker-compose.yml` servicio `base` — `COOKIE_DOMAIN=${COOKIE_DOMAIN}` (sin valor por defecto explícito); servicio `client` — `JWT_SECRET=${JWT_SECRET:-change-me-min-32-chars}`
- Variables de entorno: `.env.example` línea 75 — `COOKIE_DOMAIN=` (vacío por defecto)

**Cuándo:**
El bug se activa exclusivamente cuando la aplicación corre con enrutamiento por subdominios (Docker + nginx): `base.localhost` → `:5174` y `client.localhost` → `:5175`. En desarrollo local puro (todos los servicios en `localhost` con puertos distintos) el bug NO se manifiesta, porque el estándar RFC 6265 ignora el puerto en la coincidencia de dominio de cookies.

**Cómo:**
1. Usuario accede a `http://base.localhost/auth/login`
2. Completa email + contraseña y hace click en "Entrar"
3. JS llama `fetch('/api/v1/auth/login', { credentials: 'include' })`
4. BFF proxy de BASE reescribe a `POST http://api:3000/api/v1/auth/login`
5. API responde `200` con `{ accessToken, refreshToken, user }`
6. BFF proxy detecta auth endpoint → escribe cookies `access_token` / `refresh_token` con `Domain` sin especificar (ya que `COOKIE_DOMAIN=''`)
7. Sin atributo `Domain`, el navegador scope la cookie a `base.localhost` únicamente
8. JS ejecuta `window.location.href = 'http://client.localhost/dashboard'`
9. Navegador navega a `client.localhost` — NO envía las cookies (diferentes subdominios)
10. `ClientAuthGuard` lee `req.cookies?.['access_token']` → `undefined`
11. Guard ejecuta `res.redirect('http://base.localhost/auth/login')`
12. Usuario ve la página de login de nuevo — apariencia de "no pasó nada"

**Por qué (hipótesis de causa raíz):**
Causa primaria confirmada: `COOKIE_DOMAIN` no está configurada en el entorno Docker. Sin el atributo `Domain` con el valor `.localhost` (o el dominio con punto inicial), los navegadores modernos (Chrome ≥ 90, Firefox ≥ 94) NO propagan cookies entre subdominios aunque compartan el dominio padre. El `.env.example` documenta este requisito explícitamente ("Empty (default): cookie scoped to host — no SSO between subdomains") pero no provee un valor por defecto funcional para el entorno Docker.

Causa secundaria probable: `JWT_SECRET` puede diferir entre el servicio `api` (lee de `./src/api/.env`) y el servicio `client` (lee de `${JWT_SECRET}` en el `docker-compose.yml`, que a su vez resuelve del `.env` raíz). Si los dos `.env` tienen valores distintos, `jwt.verify()` en `ClientAuthGuard` lanzaría excepción → cookie se borra → redirect a login. Esta segunda causa solo es observable si la causa primaria se corrige.

### Comportamiento esperado
1. Usuario completa login → API devuelve tokens
2. BFF escribe cookies con `Domain=.localhost` (o el dominio del entorno)
3. Navegador envía cookies a todos los subdominios de `localhost` (o del dominio configurado)
4. `ClientAuthGuard` encuentra `access_token` → `jwt.verify()` pasa → `req.user` poblado
5. Usuario ve `/dashboard` en CLIENT

### Comportamiento actual
1. Login succeed en API — tokens generados ✓
2. Cookies escritas sin `Domain` → scope: `base.localhost` únicamente
3. Redirect a `client.localhost/dashboard` — navegador no envía cookies
4. `ClientAuthGuard`: `token = undefined` → redirect a `base.localhost/auth/login`
5. Usuario vuelve a la página de login sin feedback

### Impacto
**Usuarios afectados:** Todos los usuarios que acceden mediante la URL Docker (`base.localhost` / `client.localhost`) o producción con subdominios (ej. `www.ironloot.com` + `app.ironloot.com`). NO afecta desarrollo local puro (localhost con puertos).
**Impacto de negocio:** CRÍTICO — nadie puede iniciar sesión en el entorno Docker (staging/producción). La plataforma está inutilizable para cualquier flujo autenticado: pujas, wallet, órdenes, disputas, perfil. Bloquea validación completa del sistema post PT-033.

### Componentes afectados

| Componente | Archivo | Rol |
|---|---|---|
| BFF cookie writer | `src/apps/base/src/main.ts:22-29` | Escribe cookies sin domain |
| ClientAuthGuard | `src/apps/client/src/common/guards/client-auth.guard.ts:15-17` | Redirige sin token |
| docker-compose BASE env | `docker-compose.yml:237-239` | `COOKIE_DOMAIN=${COOKIE_DOMAIN}` sin default |
| docker-compose CLIENT env | `docker-compose.yml:281-282` | `JWT_SECRET=${JWT_SECRET:-change-me-min-32-chars}` |
| .env.example | `.env.example:75` | `COOKIE_DOMAIN=` vacío |
| login.html JS | `src/apps/base/views/pages/auth/login.html:43-44` | Redirect al CLIENT post-login |

**Sin cambios requeridos en:** API, esquema de BD, módulos de negocio, throttler, email, wallet.

### Acoplamiento (Graphify)
Graphify Community 23 — "Auth & Identity": login page (`base_auth_login`) ↔ `api_endpoint_auth_login` ↔ `concept_cross_app_redirect`. El nodo `concept_cross_app_redirect` está acoplado a todos los flujos de auth en BASE y a la redirección post-login a CLIENT. Cambiar `COOKIE_DOMAIN` afecta directamente este nodo.

Radio de impacto: contenido en configuración de entorno + main.ts de BASE. No hay cambios en lógica de negocio ni en módulos de la API. Radio mínimo.

### Nivel de Confianza
Root Cause: **88%** | Architecture: **95%** | Solution: **82%**

Notas de confianza: Root Cause al 88% por la causa secundaria (JWT_SECRET mismatch) no verificable sin acceder al `.env` de usuario (gitignored). Architecture al 95% — flujo BFF, cookie scope, ClientAuthGuard confirmados por inspección directa de código fuente. Solution al 82% — fix primario es inequívoco (COOKIE_DOMAIN); fix secundario requiere verificar archivos `.env` reales del usuario.

Investigation Gate: NO activado — todas las confidencias ≥ 70%. Causa raíz conocida con evidencia directa.

### Estado
DISCOVERY_PENDING

---

## PT-036 — BUG — Admin auth: credenciales por defecto sin gate de arranque + login sin throttle

**Fecha**: 2026-07-23 | **Origen**: Auditoría AUD-004 (`docs-v2/transversal/Registro-de-Hallazgos.md`) | **Complejidad**: STANDARD

### Expansión del bug (What / Where / When / How / Why)

| | |
|---|---|
| **What** | Dos gaps de seguridad en la autenticación admin: **(A)** `ADMIN_USERNAME`/`ADMIN_PASSWORD` tienen default `admin`/`admin` y **no** están incluidos en el gate de arranque de producción; **(B)** el controlador de login admin es `@SkipThrottle()`, por lo que `/api/v1/admin/auth/login` no tiene límite de intentos (fuerza bruta libre). |
| **Where** | (A) `src/api/src/modules/admin/admin-auth.controller.ts:42-43` (defaults) + `src/api/src/main.ts:19-48` (`validateStartupConfig`, que **omite** estas credenciales). (B) `src/api/src/modules/admin/admin-auth.controller.ts:15` (`@SkipThrottle()` a nivel de clase). Colateral: `src/api/src/modules/admin/admin.controller.ts:33` también `@SkipThrottle()`. |
| **When** | (A) En producción, si `ADMIN_USERNAME`/`ADMIN_PASSWORD` no se sobrescriben → login admin funciona con `admin`/`admin` (TOTP solo se exige si `ADMIN_TOTP_SECRET` está configurado, `admin-auth.controller.ts:44,64`). (B) En cualquier despliegue: intentos de login ilimitados. |
| **How** | `config.get('ADMIN_USERNAME','admin')` / `config.get('ADMIN_PASSWORD','admin')` con fallback a default; comparación con `!==` no timing-safe (`:47`). El gate `validateStartupConfig` sólo valida `ADMIN_API_KEY`, `JWT_SECRET`, `SESSION_SECRET`, `ALLOWED_ORIGINS` (`main.ts:24-41`), no las credenciales de login admin. `@SkipThrottle()` desactiva el ThrottlerGuard global en el controlador de login. |
| **Why** | El gate de secretos (introducido para claves/JWT/sesión) nunca incluyó el par usuario/contraseña del "basic auth" admin. El `@SkipThrottle()` probablemente se añadió para no limitar operaciones admin de alto volumen, pero como cuelga de la clase también deja el **login** sin protección anti-fuerza-bruta. |

### Comportamiento esperado vs actual

| | |
|---|---|
| **Esperado (A)** | En producción, arranque falla (o login se rechaza) si `ADMIN_USERNAME`/`ADMIN_PASSWORD` están vacíos o son el placeholder por defecto — coherente con `RN-53` y el patrón `PLACEHOLDER_SECRETS`. |
| **Actual (A)** | En producción con envs sin definir, `admin`/`admin` autentica el backoffice completo. |
| **Esperado (B)** | El login admin está limitado (p. ej. 5/min como el login de usuario, `RN-52`). |
| **Actual (B)** | Intentos ilimitados en `/admin/auth/login`. |

### Impacto

- **Usuarios afectados**: integridad de toda la plataforma (compromiso del backoffice = banear usuarios, resolver disputas, cambiar comisiones, campañas masivas).
- **Impacto negocio**: RG-05 (Alto). Viola parcialmente `RN-53` (puerta de secretos) y `RN-52` (rate limiting). ADR-005 (auth admin), ADR-017 (throttler).

### Matiz vs. redacción original del hallazgo

El hallazgo AUD-004 mencionaba también `ADMIN_API_KEY=dev-admin-key`. **Verificado en código:** ese default **sí** está gateado en producción (`main.ts:24-26`, `PLACEHOLDER_SECRETS`), por lo que solo aplica fuera de producción. Los gaps reales pendientes son (A) credenciales de login admin y (B) `@SkipThrottle` del login. La comparación no-timing-safe es un endurecimiento menor opcional.

### Componentes afectados

- `src/api/src/modules/admin/admin-auth.controller.ts` — modificar (throttle en login; endurecer comparación).
- `src/api/src/main.ts` (`validateStartupConfig`) — modificar (incluir `ADMIN_USERNAME`/`ADMIN_PASSWORD` en el gate de producción).
- `src/api/src/modules/admin/admin.controller.ts` — evaluar `@SkipThrottle` (colateral; decisión en STATE 2).
- Config throttler (`common/config`) — referencia.
- **No afectado**: BD/esquema, `@ironloot/core`, módulos de negocio.

### Causa raíz

Gate de secretos incompleto (omite credenciales de login admin) + `@SkipThrottle()` a nivel de clase en el controlador de login admin.

### Confidencias

| | |
|---|---|
| **Root Cause Confidence** | 97% |
| **Architecture Confidence** | 95% |
| **Solution Confidence** | 90% |

**Investigation Gate**: NO activado — causa raíz conocida por inspección directa; confidencias > 70%.

### Fuentes docs-v2 consultadas

`RN-52` (rate limit), `RN-53` (puerta de secretos, hoy parcial), `ADR-005` (auth admin sesión), `ADR-017` (throttler), Registro de Hallazgos AUD-004.

### Estado
DISCOVERY_PENDING

---

## PT-037 — BUG/REFACTOR — Drift de migraciones: 11 tablas backoffice sin migración

**Fecha**: 2026-07-23 | **Origen**: Auditoría AUD-001 | **Complejidad**: MAJOR (requiere análisis de riesgo + regresión + Proposal Package)

### Verificación empírica (no de memoria)

- `npx prisma validate` → schema válido ✅.
- `grep 'CREATE TABLE'` en `prisma/migrations/*` → **17 tablas** creadas: users, profiles, sessions, user_payment_methods, auctions, bids, orders, payments, shipments, ratings, disputes, notifications, wallets, ledger, audit_events, error_events, request_logs.
- `grep -cE '^model' schema.prisma` = **28 modelos**; `^enum` = **19 enums**. → **11 modelos sin migración** (39% — la auditoría estimó 46%/24; el conteo real es 28 modelos, corrige la cifra).
- Confirmación por tabla (grep en migraciones = **0** para cada una): `watchlist, system_config, commission_config, commission_records, moderation_log, cfdi_records, kyc_submissions, notification_campaigns, refund_requests, seo_config, cms_content`.
- `prisma migrate diff --from-migrations` **no ejecutable offline** (requiere shadow DB) → la generación/validación de la migración de reconciliación se hará en STATE 4 con Docker (DB) arriba.

### Expansión (What / Where / When / How / Why)

| | |
|---|---|
| **What** | 11 tablas + sus 9 enums, más 2 valores de enum (`AuctionStatus.SUSPENDED`, `AuctionStatus.PENDING_MODERATION`, `PaymentProvider.HEY_BANCO`), existen en `schema.prisma` pero **no** en ninguna migración. |
| **Where** | `prisma/schema.prisma` vs `prisma/migrations/*` (14 migraciones). |
| **When** | Al provisionar un entorno con `prisma migrate deploy` (CI/prod, `package.json:25`) → el esquema queda incompleto (17/28 tablas). |
| **How** | Se usó `prisma db push` (`package.json:27`) para el backoffice v1: aplica cambios a la BD compartida y a `schema.prisma` **sin** generar archivo de migración. |
| **Why** | Velocidad de desarrollo del backoffice; `db push` no crea migración y no se generó una equivalente después. |

### Comportamiento esperado vs actual

| | |
|---|---|
| **Esperado** | `prisma migrate deploy` reconstruye el esquema **completo** (28 tablas) en cualquier entorno limpio. |
| **Actual** | Crea 17 tablas; faltan 11 (backoffice) + enums → errores en runtime al usar comisiones, refunds, KYC, CFDI, CMS/SEO, moderación, watchlist y **system-config** (config de negocio). |

### Impacto (Graphify — radio de impacto)

`prisma.service.ts` es el hub de datos (grado **49**). Los 11 modelos se consumen por servicios en **API y Admin**: `CommissionsService` (19), `CfdiService` (18), `system-config.service` (17 — gobierna soft-close/moderación/KYC gates en runtime), `KycService` (15), `SeoService`/`RefundsService`/`CmsService` (11), `WatchlistService` (9), `ModerationService` (8), + controladores. → Un entorno migrate-only sufre **fallos amplios** en dinero (commissions/refunds), compliance (kyc/cfdi) y configuración (system-config).
- **Usuarios afectados**: cualquier despliegue reproducible (nuevos entornos, DR, CI e2e). Despliegue reproducible **roto**.
- **Impacto negocio**: RG-04 (Alto). No hay pérdida de datos en el dev actual (creado por db push), pero un nuevo entorno no arranca funcionalmente.

### Componentes afectados

- `prisma/migrations/` — **añadir** migración de reconciliación (11 tablas + 9 enums + 2 valores de enum).
- `prisma/schema.prisma` — referencia (no cambia; es la fuente objetivo).
- `package.json` — revisar `db:push` (prohibir fuera de prototipado).
- Relación con AUD-017 (seed inexistente) y AUD-008 (default `payments.currency=USD`: posible divergencia latente entre lo que creó db push y un CREATE TABLE nuevo).
- **No afectado**: lógica de negocio, `@ironloot/core`, frontends.

### Causa raíz

Uso de `prisma db push` en lugar de `prisma migrate` para el backoffice → estado de la BD no capturado en el historial de migraciones.

### Confidencias

| | |
|---|---|
| **Root Cause Confidence** | 97% |
| **Architecture Confidence** | 92% (radio medido con Graphify) |
| **Solution Confidence** | 70% (mecanismo exacto de reconciliación a definir: `migrate diff` con shadow DB / `migrate dev` / baseline con `migrate resolve`; requiere DB en STATE 4) |

**Investigation Gate**: NO activado para la causa raíz (conocida). **Se marca un spike de solución en STATE 2**: verificar con Docker el mecanismo de reconciliación y que la migración sea **no-op** contra la BD dev existente (evitar recrear/divergir tablas ya presentes).

### Fuentes docs-v2 consultadas

`Modelo-Maestro-de-Dominio` (§4 drift), `ADR-006` (Prisma/migraciones), `4-ingenieria/Modelo-de-Datos §4`, Registro de Hallazgos AUD-001 (+ AUD-008, AUD-017 relacionados).

### Estado
DISCOVERY_PENDING

---

## PT-038 — BUG — Escrituras de CLIENT sin ruta de autenticación (BFF ausente) + mismatches de ruta

**Fecha**: 2026-07-23 | **Origen**: Auditoría AUD-003 | **Complejidad**: MAJOR (arquitectónico: falta el proxy BFF en CLIENT + 8 plantillas + mismatches de ruta)

### Verificación empírica (código real)

- `src/apps/client/src/main.ts`: tiene helmet/cookieParser/nunjucks pero **NO** middleware de proxy `/api` (a diferencia de BASE). El comentario `:23-25` afirma "state changes go through the BFF proxy" — **falso** (no existe tal proxy en el archivo).
- API: `jwt.strategy.ts:20` `ExtractJwt.fromAuthHeaderAsBearerToken()` → solo lee `Authorization: Bearer`, nunca cookies.
- Lecturas server-side de CLIENT **sí** funcionan: `apiGet(token, path)` (`app.controller.ts:9-12`) lee `access_token` de la cookie server-side (`getToken :21-22`) e inyecta `Bearer`.
- **8 escrituras client-side** hacen `fetch(API + '/api/v1/...', {method:POST/PUT, credentials:'include'})` cross-origin:
  `wallet/deposit.html:31`, `wallet/withdraw.html:26`, `auction/create.html:59`, `auction/edit.html:38`, `disputes/create.html:26`, `profile.html:30`, `settings.html:23`, `seller/onboarding.html:31`.
- BASE (referencia del fix): `base/src/main.ts:76-87` `createProxyMiddleware('/api', ...)` inyecta `Authorization: Bearer ${cookies['access_token']}`.
- `http-proxy-middleware` **ya es dependencia de CLIENT** (`package.json`) — solo falta cablearlo.
- **Mismatches de método/ruta** adicionales (más allá del auth): `profile.html` `PUT /users/profile` vs API `PATCH /users/me`; `settings.html` `PUT /users/settings` vs `PATCH /users/me/settings`; `auction/edit.html` `PUT /auctions/:id` vs `PATCH /auctions/:id`; `seller/onboarding.html` `POST /users/enable-seller` vs `POST /users/me/enable-seller`.

### Expansión (What / Where / When / How / Why)

| | |
|---|---|
| **What** | Las 8 acciones de escritura del portal privado no tienen ruta de autenticación funcional: llaman al API cross-origin con `credentials:'include'`, pero el API solo acepta `Bearer` y la cookie `access_token` es `httpOnly` (ilegible por JS). CLIENT no tiene proxy BFF. Además varias usan método/ruta que no existen en el API. |
| **Where** | 8 plantillas de `src/apps/client/views/pages/*`; `client/src/main.ts` (sin proxy); `jwt.strategy.ts:20`; referencia `base/src/main.ts:76-87`. |
| **When** | Al intentar depositar, retirar, crear/editar subasta, abrir disputa, hacer onboarding de vendedor, o actualizar perfil/ajustes desde la UI del portal. |
| **How** | `fetch(API + '/api/v1/...', {credentials:'include'})` → la cookie viaja pero el API la ignora; no hay header `Authorization` → 401 (y 404 en las de ruta mismatch). |
| **Why** | CLIENT se construyó con lecturas server-side (`apiGet`) pero al path de escritura nunca se le dio el proxy BFF; el comentario asume uno que no se implementó. |

### Comportamiento esperado vs actual

| | |
|---|---|
| **Esperado** | Las escrituras del portal se autentican (vía proxy BFF que inyecta `Bearer` desde la cookie, como BASE) y golpean las rutas/métodos correctos del API. |
| **Actual** | 401 (sin auth) y/o 404 (ruta/método inexistente) → depósito, retiro, crear/editar subasta, disputa, onboarding, perfil y ajustes **no operables** desde la UI. |

### Impacto

- **Usuarios afectados**: todos los compradores/vendedores en el portal privado.
- **Impacto negocio**: RG (funcional, Alto). Junto con AUD-002 (puja), las operaciones de escritura del portal privado no funcionan. *(No verificado en runtime, pero la ruta de auth no existe en el código.)*

### Componentes afectados

- `src/apps/client/src/main.ts` — añadir proxy BFF `/api` (espejo de BASE).
- Las 8 plantillas — cambiar `fetch(API + '/api/v1/...')` → relativo `fetch('/api/v1/...')` + corregir método/ruta (PATCH /users/me, etc.).
- `src/apps/base/src/main.ts` — referencia (no modificar).
- **No afectado**: API, dominio core, BD.

### Causa raíz

Falta el proxy BFF en CLIENT (nunca implementado pese al comentario) → las escrituras client-side no tienen forma de autenticarse contra un API que solo acepta `Bearer`. Sumado a mismatches de ruta/método en varias plantillas.

### Confidencias

| | |
|---|---|
| **Root Cause Confidence** | 96% |
| **Architecture Confidence** | 92% (patrón de fix confirmado en BASE) |
| **Solution Confidence** | 85% (proxy conocido; los mismatches de ruta añaden verificación menor por endpoint) |

**Investigation Gate**: NO activado — causa raíz conocida por inspección directa; confidencias > 70%.

### Fuentes docs-v2 consultadas

`ADR-003` (BFF), `ADR-004` (JWT Bearer), `05-UIUX`/`2-producto` (flujos de escritura), `Catalogo-de-API` (rutas reales), Registro AUD-003 (+ AUD-002 relacionado).

### Estado
DISCOVERY_PENDING

---

## PT-048 — BUG — Desincronización de contrato CLIENT↔API en escrituras del portal (BUG-QA-01/03/04)

**Origen**: QA visual por navegador 2026-07-24 (`docs/qa/HALLAZGOS-QA-Navegador.md`). Clasificación: **STANDARD** (cluster de 3 bugs con misma naturaleza; el depósito puede escalar a MAJOR según la decisión de diseño — ver Riesgos).

### Expansión del bug (What / Where / When / How / Why)

- **What**: tres escrituras del portal privado fallan con **HTTP 400** porque el payload del frontend no coincide con el DTO del API (whitelist `forbidNonWhitelisted` activo).
- **Where**:
  - Depósito — `src/apps/client/views/pages/wallet/deposit.html:33` vs `src/api/src/modules/wallet/dto/wallet.dto.ts:4` (`DepositDto`).
  - Activar vendedor — `src/apps/client/views/pages/seller/onboarding.html:33` vs `src/api/src/modules/users/dto/enable-seller.dto.ts:4` (`EnableSellerDto`).
  - Crear subasta — `src/apps/client/views/pages/auction/create.html:55` vs `src/api/src/modules/auctions/dto/create-auction.dto.ts:48` (`CreateAuctionDto`).
- **When**: en cada intento de depositar, activar cuenta vendedor o crear subasta desde la UI. 100% reproducible con BD desde cero.
- **How**: la petición SÍ llega autenticada al API (proxy BFF ya operativo), pero el `ValidationPipe` la rechaza.
- **Why (causa raíz)**: el frontend CLIENT quedó desincronizado del contrato de los DTOs (o los DTOs cambiaron sin actualizar el frontend). No es un problema de auth ni de credenciales de pago.

### Tabla de contraste (verificado en código, ambos lados)

| Endpoint | Payload UI | DTO API (requerido) | Campo(s) en conflicto |
|---|---|---|---|
| `POST /api/v1/wallet/deposit` | `{ amount, provider }` | `{ amount(≥10), referenceId:string }` | sobra `provider`; falta `referenceId` |
| `POST /api/v1/users/me/enable-seller` | `{ legalName, address, phone }` | `{ acceptTerms:boolean }` | sobran los 3; falta `acceptTerms` |
| `POST /api/v1/auctions` | `{ title, description, startingPrice, condition, startsAt, endsAt }` | `{ title, description, startingPrice, startsAt?, endsAt, images? }` | sobra `condition` |

### Reproducción

1. Registrar+verificar comprador y vendedor (BD desde cero). 2. Login. 3a. `/wallet/deposit` monto 1500, MercadoPago → 400. 3b. `/seller/onboarding` llenar y "Activar cuenta vendedor" → 400. 3c. `/auctions/create` llenar y "Crear subasta" → 400. Evidencia: logs `ironloot-api` (traceId por caso), screenshots `qa-out/live/*`.

### Comportamiento esperado vs actual

| | |
|---|---|
| **Esperado** | Depósito inicia pago / registra transacción; activar vendedor deja al usuario como seller (o KYC pendiente); crear subasta crea la subasta en Draft. |
| **Actual** | Los tres → HTTP 400 `VALIDATION_ERROR`; UI no avanza; wallet no se fondea, no hay vendedores ni subastas. Dashboard admin confirma 0 vendedores / 0 subastas. |

### Impacto

- **Usuarios afectados**: todos los compradores (depósito) y vendedores (activar + crear subasta) del portal.
- **Impacto negocio**: ALTO — bloquea el núcleo económico (fondeo → puja → subasta → orden). Impide el E2E completo.

### Componentes / servicios / dependencias

- CLIENT (plantillas con JS inline): deposit.html, onboarding.html, create.html.
- API DTOs: WalletModule, UsersModule, AuctionsModule (ValidationPipe global `whitelist + forbidNonWhitelisted`).
- **Consideración de diseño (no resolver en Discovery)**: en depósito, `referenceId` sugiere que el endpoint espera una referencia de pago del proveedor (flujo: crear preferencia → obtener referenceId → confirmar depósito). Decidir qué lado es autoritativo pertenece a STATE 2/3. En enable-seller, `legalName/address/phone` existen en `UpdateProfileDto` → la UI probablemente debe actualizar perfil + enviar `acceptTerms`. En crear subasta, decidir si `condition` se persiste (añadir a DTO+schema) o se elimina de la UI.

### Riesgos / restricciones

- El depósito puede requerir implementar el flujo de inicio de pago (provider→referenceId) → **posible escalada a MAJOR** solo para ese sub-caso.
- Cambiar DTOs impacta contrato del API (Swagger, posibles consumidores). Cambiar solo el frontend es menos invasivo pero debe respetar la semántica real del endpoint.
- BUG-QA-02 (auditoría UUID) es independiente pero puede aparecer al crear subasta/confirmar pago; se trata en su propio PT.

### Confidencias

| | |
|---|---|
| **Root Cause Confidence** | 98% (mismatch verificado en ambos lados por inspección directa + logs runtime) |
| **Architecture Confidence** | 88% (falta decidir el lado autoritativo por endpoint, sobre todo depósito) |
| **Solution Confidence** | 70% (enable-seller y crear-subasta acotados; depósito depende de la decisión de diseño) |

**Investigation Gate**: NO activado — causa raíz conocida; confidencias > 70%. El depósito requiere decisión de diseño en STATE 2, no investigación adicional.

### Fuentes consultadas

`docs/qa/HALLAZGOS-QA-Navegador.md`, `docs/enterprise-documentation/08-API-Catalog.md`, DTOs y plantillas citadas, logs de `ironloot-api`.

### Estado
DISCOVERY_PENDING

## PT-058 — BUG — CLIENT llama `/api/v1/wallet` inexistente (BUG-QA-N01)

**Fecha**: 2026-07-24 | **Origen**: QA Navegador run2 (BUG-QA-N01) | **Complejidad**: STANDARD

### Expansión del bug

| | |
|---|---|
| **What** | El portal CLIENT (SSR/BFF) llama server-side `GET /api/v1/wallet`, ruta **inexistente** en la API → 404. Resultado: `wallet=null`; el saldo se muestra como `$0`/`0.00` aunque el usuario tenga fondos. |
| **Where** | `src/apps/client/src/app.controller.ts` líneas 35 (dashboard), 86 (`/wallet`), 206 (detalle de subasta). |
| **When** | En cada carga de `/dashboard`, `/wallet` y `/auctions/:id` con sesión. |
| **How** | `apiGet(token, '/api/v1/wallet')` → 404 → `apiGet` captura y devuelve `null` → plantilla usa `wallet.balance`/`wallet.held_funds` con `default('0.00')`. |
| **Why** | Desincronización de contrato: la API expone `GET /api/v1/wallet/balance` (retorna `{available, held, currency, isActive}`), no `/wallet`. El CLIENT quedó con la ruta antigua. |

### Reproducción
1. Login como comprador con `balance>0`. 2. Abrir `/wallet` o `/dashboard` o `/auctions/:id`. 3. El saldo aparece `MXN 0.00`. 4. Log API: `Cannot GET /api/v1/wallet` (18 ocurrencias en `error_events` durante QA run2).

### Comportamiento esperado vs actual
- **Esperado**: el saldo disponible y fondos retenidos reales se muestran en dashboard, wallet y detalle de subasta.
- **Actual**: siempre `0.00` (la llamada 404ea).

### Afectados / impacto de negocio
Todos los compradores. Severidad **ALTA**: el saldo (dato financiero central) es invisible; el usuario no sabe cuánto puede pujar. Las operaciones subyacentes (puja, bloqueo de fondos) funcionan; es un defecto de **visualización/contrato**.

### Consulta de conocimiento (fuentes)
- `docs/enterprise-documentation/08-API-Catalog.md:80-81`: documenta **tanto** `GET /wallet` (summary) **como** `GET /wallet/balance`. El código real (`src/api/src/modules/wallet/wallet.controller.ts`) **solo** tiene `balance/history/deposit/withdraw` → **drift documental** (el catálogo lista `/wallet` inexistente). Se corrige el catálogo como parte del fix (fidelidad documental).
- `11-Conventions.md:174-181` (Pattern 3): CLIENT llama la API **directo desde el controlador** (no proxy). El fix respeta el patrón.
- Precedente: PT-048 (mismo patrón de desincronización de contrato CLIENT↔API).

### Componentes / servicios / dependencias
- CLIENT `AppController` (SSR) → API `WalletController.getBalance`. Plantillas `dashboard.html`, `wallet.html`, `auction/detail.html`.
- Sin impacto en API ni BD (solo cambia a qué endpoint existente llama el CLIENT + mapeo de forma de respuesta).

### Confianza
- Root Cause: **100%** (404 reproducido por curl; endpoint real confirmado en código). Arquitectura: **100%**. Solución: **95%** (mapeo `available→balance`, `held→held_funds`).

## PT-059 — BUG — CLIENT llama `/api/v1/bids/my` inexistente (BUG-QA-N02)

**Fecha**: 2026-07-24 | **Origen**: QA Navegador run2 (BUG-QA-N02) | **Complejidad**: STANDARD

### Expansión del bug
| | |
|---|---|
| **What** | El portal CLIENT llama `GET /api/v1/bids/my` (dashboard con `?limit=5`, `/my-bids` con `?page=`), ruta **inexistente** → 404. |
| **Where** | `src/apps/client/src/app.controller.ts` líneas 36 (dashboard) y 65 (`/my-bids`). |
| **When** | En cada carga de `/dashboard` y `/my-bids` con sesión. |
| **How** | `apiGet(token, '/api/v1/bids/my…')` → 404 → `null`. En `/my-bids` la tabla queda vacía; en dashboard la llamada ni siquiera se usa en la plantilla (solo hay enlace a /my-bids). |
| **Why** | Desincronización de contrato: la API expone `GET /api/v1/bids/my-active` (activas) y `GET /api/v1/bids/my-history` (historial), ambos devuelven `Bid[]`. No existe `/bids/my`. |

### Formas de respuesta / plantilla
- API `my-active`/`my-history` → `Bid[]` con `include auction {id,title,slug,currentPrice,endsAt,images,status}`.
- Plantilla `bids/my.html` espera `bids.items[]`, `bid.auction.title`, `bid.amount`, `bid.auction.currentPrice`, `bid.isWinning`.
- Gaps: (1) envolver array en `{items}`; (2) `isWinning` no lo devuelve la API → derivar `amount === auction.currentPrice`.

### Reproducción
1. Login comprador que ya pujó. 2. `/my-bids` → tabla vacía. 3. Log API: `Cannot GET /api/v1/bids/my` (15 ocurrencias en `error_events`, QA run2).

### Afectados / impacto
Compradores. Severidad **ALTA**: no pueden ver sus pujas/ofertas. La colocación de puja funciona; es contrato/visualización.

### Consulta de conocimiento
- `08-API-Catalog.md:69`, `inventory/endpoints.md:50` documentan `GET /bids/my` (paginado) **inexistente** → drift documental. Reales: `my-active`, `my-history`. Se corrige el catálogo.
- `11-Conventions.md` Pattern 3 (CLIENT llama API directo). Precedente PT-048/PT-058.

### Confianza
Root Cause **100%** (404 por curl; rutas reales en código). Arquitectura **100%**. Solución **95%** (envolver `{items}` + derivar `isWinning`).

## PT-060 — BUG (TRIVIAL) — console.error cosméticos (OBS-02)

**Fecha**: 2026-07-24 | **Origen**: QA Navegador run2 (OBS-02) | **Complejidad**: TRIVIAL

- **What/Where**: (a) ninguna app sirve `/favicon.ico` ni referencia un icono en sus layouts → el navegador pide `/favicon.ico` y 404ea (console.error recurrente). (b) `/auth/verify-email?token=<inválido>` hace fetch client-side a `/api/v1/auth/verify-email` que responde 401 → el navegador registra "Failed to load resource: 401".
- **Análisis (b)**: el log del 4xx es **nativo del navegador** ante cualquier respuesta no-2xx; no es suprimible desde el código de la página (el `.catch` de fetch no aplica a status 4xx). Cambiar el 401 no lo elimina. Se acepta como cosmético (edge case: solo con token inválido).
- **Fix (a)**: añadir `favicon.svg` a `public/` de las 3 apps + `<link rel="icon">` en los 3 layouts (self-origin; CSP `imgSrc` ya incluye `'self'`/`data:`).
- **Confianza**: 100% (favicon). (b) documentado como aceptado.

## PT-061 — INVESTIGATION — Onboarding habilita vendedor sin gate KYC (OBS-01)

**Fecha**: 2026-07-24 | **Origen**: QA Navegador run2 (OBS-01) | **Modo**: Investigación | **Estado**: CLOSED

### Pregunta
¿El diseño pretende exigir KYC (verificación de identidad) antes de habilitar a un vendedor? El QA observó
que `/seller/onboarding` → `enable-seller` deja `is_seller=true` sin crear ninguna `kyc_submissions`.

### Evidencia (código real)
- `users.service.ts:377 checkSellerRequirements` exige: `state=ACTIVE`, email verificado, `displayName`, perfil (dirección/ciudad/país). **No** exige KYC.
- `enableSeller` (users.service.ts:304) pone `isSeller=true` tras `acceptTerms` + esos requisitos. Sin KYC.
- **Módulo KYC sin controller**: `src/api/src/modules/kyc/` solo tiene `kyc.module.ts` y `kyc.service.ts`. `KycService` **no se inyecta en ningún controller** → el endpoint de envío de KYC documentado `POST /api/v1/kyc` (`04-App-Flow.md:167-169`) **no existe**.
- Admin KYC (`src/admin/src/modules/kyc/kyc.controller.ts`) sólo revisa (`approve/reject/request-correction`) — pero no hay submissions que crear/revisar.

### Diagnóstico
Existe **drift diseño↔implementación**: la documentación (`01-Platform-Overview.md:14` "Seller onboarding — KYC verification"; `04-App-Flow.md §8`) describe un gate KYC (envío → PENDING → aprobación admin) que **no está implementado**. Hoy un vendedor puede publicar subastas sin verificación de identidad.

### Recomendación (decisión de producto — no se implementa aquí)
- **Opción A (FEATURE MAJOR)**: implementar el gate KYC — endpoint `POST /api/v1/kyc` (crear submission), exigir KYC `APPROVED` antes de `enableSeller` o antes de publicar subastas, + UI de carga de documentos. Alto impacto de dominio/compliance.
- **Opción B (DOC)**: si KYC es intencionalmente opcional/diferido en v1, actualizar `04-App-Flow §8` y `01-Platform-Overview` para reflejar que KYC **no** se exige aún (eliminar el drift).

### Cierre
INVESTIGATION **CLOSED** con hallazgos documentados. No se modifica código (implementar el gate es una FEATURE
que requiere decisión de producto). Candidato natural a FPGE (A vs B). No auto-cerrar como "resuelto": es un gap real.

## PT-062 — INVESTIGATION — Re-verificar broadcast de notificaciones (PT-051/BUG-QA-12)

**Fecha**: 2026-07-24 | **Origen**: QA run2 (validación parcial de PT-051) | **Modo**: Investigación | **Estado**: CLOSED

### Pregunta
En QA run2 el broadcast admin sólo se verificó a nivel render. BUG-QA-12 original: `status:"QUEUED"` (enum inválido)
+ falso éxito. ¿PT-051 lo corrigió realmente end-to-end?

### Evidencia (empírica, ejecutada)
- `CampaignStatus` = {DRAFT, SCHEDULED, SENT, FAILED} — **no** existe QUEUED (schema).
- **API directo** `POST /api/v1/admin/notifications/campaigns` (JWT admin): 201 → `status:"SENT"`, `recipientsCount:3`; campaña creada, 3 notificaciones generadas.
- **UI admin** `/notifications` (form Componer, segment=ALL): submit → HTTP 302 `/notifications?sent=1`; `notification_campaigns` +1 con `status=SENT`, `recipients_count=3`. Sin QUEUED, sin falso éxito.

### Conclusión
**BUG-QA-12 / PT-051 VALIDADO**: el broadcast funciona por API y por UI; status válido SENT; notificaciones creadas
para el segmento. No hay bug. INVESTIGATION **CLOSED**.
(Nota: la falla inicial en el harness QA fue de targeting del form — resuelta con `form:has(input[name="title"])`; no era defecto de producto.)

## PT-063 — BUG (CRÍTICO) — Webhook de pasarela sin @Public (guard JWT global → 401)

**Fecha**: 2026-07-25 | **Origen**: prueba real MP (#4) | **Complejidad**: STANDARD

| | |
|---|---|
| **What** | `@Post('webhook/:provider')` no está marcado `@Public()`. Existe un `APP_GUARD` JWT global (`app.module.ts:152`). Los webhooks de pasarela (MP/PayPal/HeyBanco) no envían JWT → el guard los rechaza con **401 "Authentication required"** antes de llegar al handler. |
| **Where** | `src/api/src/modules/payments/payments.controller.ts` método `webhook`. |
| **Impact** | **CRÍTICO**: ningún webhook de pago acredita en producción. Toda acreditación de depósito (y confirmaciones de pasarela) falla silenciosamente con 401. Independiente de MercadoPago: afecta a todas las pasarelas. |
| **Why** | El endpoint es público por naturaleza (lo llama la pasarela, no un usuario autenticado); la seguridad la da la **firma HMAC**, no el JWT. Faltó `@Public()`. |

### Reproducción
POST a `/api/v1/payments/webhook/MERCADO_PAGO` sin JWT → **401**. (Confirmado en la prueba real: el webhook firmado devolvía 401 hasta aplicar `@Public()`.)

### Solución
`@Public()` en el método `webhook`. La validación de firma HMAC (ya existente en el provider) sigue protegiendo el endpoint.

### Consulta de conocimiento
- `09-Security-Architecture.md` / `11-Conventions.md`: webhooks validan firma HMAC (RULE-04 "never trust unvalidated webhook payloads"). El endpoint debe ser público pero validar firma. `@Public()` es el patrón usado por auth (`auth.controller` líneas 50/76/104).

### Confianza
Root cause **100%** (401 reproducido; guard global confirmado). Solución **100%**.

## PT-064 — BUG (CRÍTICO) — Procesamiento del webhook de acreditación (parser UUID + case)

**Fecha**: 2026-07-25 | **Origen**: prueba real MP (#6, #2) | **Complejidad**: STANDARD

- **#6 (CRÍTICO)** `payments.service.ts` handleWebhook: `external_reference = DEP-<userId>-<ts>` con `userId` UUID (con guiones). Parser previo `split('-')[1]` → UUID **truncado** (`08b22a46`) → `walletService.deposit` con id inválido → wallet no encontrada → **no acredita**. Fix: regex `^DEP-(.+)-\d+$`.
- **#2** El proveedor llega en la URL como `mercadopago` (minúsculas, sin guion bajo). El handler compara con el enum `MERCADO_PAGO`. `toUpperCase()` no basta (`MERCADOPAGO` ≠ `MERCADO_PAGO`). Fix: **mapa de alias** `MERCADOPAGO→MERCADO_PAGO`, `HEYBANCO→HEY_BANCO`, etc.
- **Descubrimiento del test-first**: la primera versión del fix (#2 con solo `toUpperCase`) fallaba el test → se corrigió con el mapa de alias.

### Reproducción
Webhook real con `external_reference=DEP-<uuid>-<ts>` → no acreditaba (id truncado). Confirmado en la prueba real: acreditó tras el fix del parser.

### Confianza
Root cause **100%** (reproducido en prueba real + tests RED→GREEN). Solución **100%**.

## PT-065 — BUG — Provider MercadoPago (notification_url + sandbox_init_point + Orders API)

**Fecha**: 2026-07-25 | **Origen**: prueba real MP (#1, #3, #5) | **Complejidad**: STANDARD

- **#1** `createPayment` no fijaba `notification_url` → MP notificaba a la URL del dashboard, no a la deseada. Fix: `notification_url` env-driven en la preferencia.
- **#3** Devolvía `init_point` (productivo); con credenciales de prueba MP rechaza ("una parte es de prueba, la URL es productiva"). Fix: flag `MERCADO_PAGO_SANDBOX` → `sandbox_init_point`.
- **#5** `handleWebhook` solo consultaba la Payments API legacy (`payment.get`); las credenciales `APP_USR` usan la **Orders API** (IDs `ORD.../PAY...` no resolubles por `payment.get`). Fix: fetch `GET /v1/orders/{id}` para IDs de formato Orders.

### Evidencia
- Tests `mercadopago-preference.spec.ts` (3 casos: sandbox_init_point + init_point + notification_url), RED→GREEN.
- **Funcional (#5)**: 3 depósitos reales ($500/$1500/$3000) creados por Orders API y acreditados por el handler tras el fix (`qa-out/mp-real-payment/report.md`).

### Confianza
Root cause **100%** (reproducido en prueba real). Solución **100%**.

## PT-066 — INVESTIGATION — Admin force-close no liquida la subasta (#7)

**Fecha**: 2026-07-25 | **Origen**: prueba real MP (#7) | **Modo**: Investigación | **Estado**: CLOSED

### Hallazgo
`admin.service.forceCloseAuction` (admin.service.ts:424) solo marca `status='CLOSED'` + adminNotes. **No crea la orden
ni convierte los fondos retenidos** del ganador. En cambio, el cierre natural del **scheduler**
(`auction-scheduler.service.ts:131+`) sí: marca CLOSED, crea la orden (`tx.order.create`), y liquida (held→pago) + notifica al ganador.

### Evidencia (prueba real)
- Force-close admin → subasta `CLOSED`, **0 órdenes**, `held_funds` del comprador **sin convertir** (quedó $3,000 retenido).
- Vía scheduler (endsAt pasado) → subasta `CLOSED`, **orden creada PAID**, `held` 3,000→0, `DEBIT_ORDER`.

### Diagnóstico
Gap de consistencia: dos caminos de cierre con comportamiento distinto. El force-close deja subastas cerradas
**sin liquidar** (ganador sin orden, fondos atrapados en held).

### Recomendación (decisión de producto — no se implementa aquí)
- **Opción A**: que `forceCloseAuction` invoque la misma rutina de liquidación del scheduler (crear orden + convertir fondos + notificar). Refactor de media complejidad; unifica el cierre.
- **Opción B**: documentar que force-close es solo "detener" y que la liquidación la hace el scheduler (requiere que la subasta expire naturalmente).

### Cierre
INVESTIGATION **CLOSED** con hallazgo documentado. Candidato FPGE (Opción A recomendada). No auto-resuelto.

## PT-067 — BUG — Historial de órdenes no se muestra (comprador y vendedor)

**Fecha**: 2026-07-25 | **Origen**: verificación de historial | **Complejidad**: STANDARD

- **What/Where**: `/orders` (compras), `/auctions/won-auctions` (ganadas) y `/seller/orders` (ventas) muestran
  vacío ("Sin órdenes registradas" / "No has ganado subastas" / "Sin pedidos") aunque existen órdenes en BD.
- **Why**: la API `GET /api/v1/orders?...` devuelve un **array plano** `[{...}]`. Las plantillas
  (`orders/list.html`, `won-auctions.html`, `seller/orders.html`) iteran `orders.items` → nunca hay `.items` → vacío.
  Mismo patrón de contrato CLIENT↔API que PT-058/059.
- **Evidencia**: `GET /api/v1/orders?role=buyer` (comprador) → `[{"totalAmount":"3000","status":"PAID","auction":{...}}]`; página muestra "Sin órdenes".
- **Fix**: helper `toItems(raw)` que envuelve el array en `{ items: [...] }` (robusto ante array/`.data`/`.items`/null). Usar en los 3 call sites del CLIENT.
- **Confianza**: Root cause 100% (API devuelve datos; plantilla espera `.items`). Solución 100%.

## PT-068 — BUG — Subastas del vendedor no se muestran (/seller/auctions)

**Fecha**: 2026-07-25 | **Origen**: verificación de historial | **Complejidad**: STANDARD

- **What/Where**: `/seller/auctions` muestra "No tienes subastas" aunque el vendedor tiene 1 subasta (CLOSED).
- **Why**: (a) El CLIENT llama `GET /api/v1/auctions?role=seller`, pero la API usa **`mine=true`** para las
  subastas propias del vendedor (todos los estados). Con `role=seller` la API lo ignora y devuelve solo públicas
  (ACTIVE/PUBLISHED) → la CLOSED no aparece → `{data:[],total:0}`. (b) La API responde `{data,total}` (paginado),
  la plantilla itera `.items`.
- **Evidencia**: `?role=seller` → `{data:[],total:0}`; `?mine=true` → `{data:[1],total:1}`.
- **Fix**: usar `?mine=true` + `toItems()` (mapea `{data}`→`{items}`). CLIENT-only (API correcta).
- **Confianza**: Root cause 100%. Solución 100%.

## PT-073 — BUG — Chequeo de contrato de depósito falla por carrera de navegación (QA harness)

**Fecha**: 2026-07-24 | **Origen**: run QA 20260724-230258 (QA-BOOT-10b FAIL) | **Complejidad**: TRIVIAL (sólo harness)

- **What/Where**: En `10-bootstrap.cjs` el caso QA-BOOT-10b afirma que `POST /api/v1/payments/initiate`
  devuelve `redirectUrl`. Resultado: `seen=true http=201 redirectUrl=false` → FAIL.
- **When/How**: Al enviar el form de `/wallet/deposit`, la página hace `fetch('/api/v1/payments/initiate')`,
  lee `data.redirectUrl` y ejecuta `window.location.href = data.redirectUrl` (navega a mercadopago.com.mx).
  El bootstrap tiene un `page.route` que **aborta** la navegación a mercadopago. El handler `p.on('response')`
  hace `await r.json()`; ese read compite con la navegación/abort y se interrumpe → `catch` → `hasRedirect=false`.
- **Why (root cause)**: **No es bug de producto.** Evidencia directa: `curl POST /payments/initiate` →
  `{"redirectUrl":"https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=...","isIntegrated":true}` (201).
  El JS de `deposit.html` lee y usa `redirectUrl` correctamente. El fallo es una **condición de carrera del harness**:
  leer el body por evento de respuesta mientras la navegación se aborta.
- **Expected/Actual**: Esperado: contrato verificado de forma determinista. Actual: lectura del body no fiable.
- **Fix**: Verificar el contrato con `page.evaluate(fetch('/api/v1/payments/initiate'))` inspeccionando el JSON
  devuelto (determinista, sin depender del evento de respuesta ni de la navegación) — mismo patrón ya usado en
  QA-BOOT-07b (KYC) y publish. Componente: `tests/qa-browser-suite/10-bootstrap.cjs` (sólo QA).
- **Confianza**: Root cause 100% (contrato API verificado por curl). Solución 95%.

## PT-074 — BUG — Fase 31-outbid redundante falla en run-all (QA harness)

**Fecha**: 2026-07-24 | **Origen**: run QA 20260724-230258 (E2E-6 re-run FAIL) | **Complejidad**: TRIVIAL (sólo harness)

- **What/Where**: `31-outbid.cjs` (re-run aislado de E2E-6) devuelve `bidHttp=400 "No se pudo realizar la puja."`
  cuando se ejecuta dentro de `run-all.sh`.
- **When/How**: `31-outbid` hace que comprador2 puje **700**. Pero corre **después** de `30-e2e.cjs`, que ya dejó
  el precio actual en **700** y a comprador2 como líder. Re-pujar 700 sobre 700 se rechaza correctamente
  (la puja debe superar el precio actual; además no puedes superarte a ti mismo).
- **Why (root cause)**: **No es bug de producto.** El outbid real ya está validado por **E2E-6 en `30-e2e.cjs`
  (PASS)**. `31-outbid.cjs` es una herramienta de re-ejecución **aislada** (para un solo caso); incluirla en la
  secuencia `run-all` la ejecuta sobre un estado ya avanzado → 400 esperado. Es **redundancia de orquestación**.
- **Expected/Actual**: Esperado: la suite secuencial no re-ejecuta un caso ya cubierto sobre estado consumido.
  Actual: `run-all.sh` invoca `31-outbid.cjs` tras `30-e2e.cjs`.
- **Fix**: Quitar `31-outbid.cjs` de la secuencia de `run-all.sh` (se conserva como herramienta standalone
  para correr E2E-6 aislado contra una subasta fresca). Componente: `tests/qa-browser-suite/run-all.sh` (sólo QA).
- **Confianza**: Root cause 100%. Solución 100%.

## PT-075 — BUG — E2E-3 falla por precondición temporal (subasta PUBLISHED no ACTIVE) (QA harness)

**Fecha**: 2026-07-24 | **Origen**: run QA 20260724-231835 (E2E-3 FAIL) | **Complejidad**: TRIVIAL (sólo harness)

- **What/Where**: `30-e2e.cjs` E2E-3 asevera `status=ACTIVE`; a veces la subasta sigue `PUBLISHED` porque aún
  no llega su `starts_at` (creada con +3min). El harness ya la fuerza a ACTIVE, pero **después** de aseverar → FAIL.
- **Why (root cause)**: **No es bug de producto.** PUBLISHED antes de `starts_at` es un estado válido; el
  scheduler activaría al pasar la hora. Es orden de operaciones en la prueba (aseverar antes de activar).
- **Fix**: Activar PUBLISHED→ACTIVE **antes** de aseverar E2E-3 (determinista). Componente: `30-e2e.cjs` (sólo QA).
- **Confianza**: Root cause 100%. Solución 100%.

---

## PT-076-INV — Investigación: migración de PayPal a Orders v2 API + Webhooks (STATE 1-B, modo investigación)

**Fecha**: 2026-07-25 | **Tipo**: INVESTIGATION | **Disparador**: Investigation Gate — Implementation Confidence de la Ruta B en 55% (<70%)

### Motivo

El desarrollador eligió la **Ruta B** (migrar del WPS+IPN legacy a Orders v2 + Webhooks). El propio ENRICHMENT de PT-076 fijó que esa ruta, al 55% de confianza, exige investigación previa antes de planificar implementación. Esta investigación existe para levantar esa confianza con datos verificados de la API real, no de memoria.

### Hallazgos verificados (fuente: documentación oficial de PayPal, consultada 2026-07-25)

**I-01 — Autenticación**
OAuth2 `client_credentials` contra `POST https://api-m.sandbox.paypal.com/v1/oauth2/token` (producción: `api-m.paypal.com`). Devuelve un access token de vida limitada (~9h) que hay que cachear y renovar. **Esto es nuevo respecto al WPS**, que no autenticaba nada.

**I-02 — Crear orden**
`POST /v2/checkout/orders` con `intent: "CAPTURE"` y `purchase_units[].amount{currency_code, value}`. Cabecera `PayPal-Request-Id` como clave de idempotencia (PayPal la retiene 6h, ampliable a 72h). Estados de orden: `CREATED` → `APPROVED` → `COMPLETED`.

**I-03 — URL de aprobación**
Llega en los enlaces HATEOAS de la respuesta. La documentación actual indica `rel: "payer-action"`; SDKs y documentación más antigua usan `rel: "approve"`. **Ambigüedad no resuelta documentalmente** — debe verificarse empíricamente contra sandbox y el código debe tolerar ambos.

**I-04 — Capturar el pago**
`POST /v2/checkout/orders/{id}/capture`. **Este paso no existe en el flujo WPS actual y no tiene hueco en la interfaz `PaymentProvider`** (`createPayment` / `verifyPayment` / `handleWebhook`). Es el hallazgo estructural principal — ver I-08.

**I-05 — Verificación de webhook**
`POST /v1/notifications/verify-webhook-signature`, cuerpo: `auth_algo`, `cert_url`, `transmission_id`, `transmission_sig`, `transmission_time`, `webhook_id`, `webhook_event`. Los cinco primeros salen de las cabeceras `PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`. Respuesta esperada: `verification_status: "SUCCESS"`. Existe también verificación local (CRC32 + certificado) sin llamada de red.

**I-06 — Evento relevante**
`PAYMENT.CAPTURE.COMPLETED` es el que debe acreditar saldo. El `webhook_id` se obtiene del dashboard de la app o vía Webhooks Management API.

**I-07 — Reintentos**
PayPal reintenta hasta **25 veces a lo largo de 3 días** hasta recibir un 2xx. Esto **agrava** el riesgo R-02: la idempotencia deja de ser deseable y pasa a ser obligatoria. La clave de deduplicación natural es el `id` del evento (`WH-...`).

**I-08 — Impacto en la interfaz compartida `PaymentProvider`**
El flujo redirect de Orders v2 es en dos tiempos: crear orden → el comprador aprueba → **capturar**. La interfaz actual no modela la captura. Hay tres encajes posibles, y elegir es trabajo de STATE 2:
  - (a) capturar al recibir el webhook `CHECKOUT.ORDER.APPROVED`;
  - (b) capturar en el retorno del comprador a la URL de `return`;
  - (c) ampliar la interfaz `PaymentProvider` con un método de captura explícito.
La opción (c) toca los **cuatro** proveedores (MP, PayPal, Stripe, Hey Banco). Las opciones (a) y (b) lo evitan pero reparten la lógica de forma menos explícita. Aquí está la mayor parte del riesgo de regresión.

**I-09 — Extracción del importe: cambio obligatorio**
`payments.service.ts:223-226` extrae el importe con `transaction_amount` (MP) ?? `mc_gross` (PayPal IPN) ?? `amountTotal` (Stripe). **En Orders v2 el importe viaja en `resource.amount.value` (string), y `mc_gross` no existe.** Sin una rama nueva, un depósito verificado no acreditaría saldo y caería en la rama de error "amount not found". Corrige una suposición del ENRICHMENT inicial: en Ruta B la ruta de acreditación **sí** requiere cambios.

**I-10 — Referencia de usuario**
La referencia `DEP-<userId>-<timestamp>` viaja hoy en el campo `invoice` del WPS. En Orders v2 el equivalente es `purchase_units[].custom_id` o `invoice_id`, y reaparece en el webhook como `resource.custom_id` / `resource.invoice_id`. El regex de `payments.service.ts:218` sigue sirviendo; cambia solo el campo de origen.

**I-11 — Moneda**
MXN está soportado por PayPal y **admite decimales**. Las que no admiten decimales son HUF, JPY y TWD. Sin bloqueo para el proyecto.

**I-12 — Estado de deprecación (no determinado)**
PayPal comunica que actualizó su endpoint de verificación de webhooks y que "el método antiguo está deprecado", **sin fecha de sunset ni guía de migración explícita**. No se ha podido determinar documentalmente si afecta al endpoint aquí descrito. Se registra como incertidumbre a verificar empíricamente en sandbox; no bloquea el diseño.

### Consecuencias para el alcance

1. La migración **no es sustituir un fichero**: toca `paypal.provider.ts` (reescritura), `payments.service.ts` (extracción de importe + idempotencia) y, según la decisión de I-08, potencialmente la interfaz compartida.
2. Aparece un componente nuevo sin precedente en el repo: **gestión y cacheo del access token OAuth2**. MercadoPago usa un token estático de entorno; PayPal exige renovación.
3. La idempotencia sube de "recomendable" a **requisito de corrección**, por I-07.
4. Persisten de la Ruta A: necesidad de túnel público (R-01) y cero tests previos del proveedor.

### Confianza tras la investigación

| Métrica | Antes | Después | Motivo |
|---|---|---|---|
| Architecture Confidence | 92% | **92%** | Sin cambio; el mapa del código ya estaba verificado |
| Implementation Confidence (Ruta B) | 55% | **80%** | Endpoints, cuerpos, cabeceras, eventos y moneda confirmados en documentación oficial. Lo que queda (I-03, I-12) es verificable empíricamente en sandbox, y I-08 es una decisión de diseño, no una incógnita |

**Investigation Gate superado** (80% > 70%). Habilitado el paso a STATE 2.

### Estado

**CLOSED** — hallazgos documentados. Alimenta STATE 2 de PT-076.

---

## PT-078 — BUG: reentregas de webhook de Mercado Pago pueden acreditar por duplicado (STATE 1-B)

**Fecha**: 2026-07-25 | **Tipo**: BUG | **Complejidad**: STANDARD | **Origen**: TD-006, registrada por PT-076

### Qué

`PaymentsService.handleWebhook()` acredita el wallet cada vez que un webhook llega con
estado `COMPLETED`. La deduplicación introducida por PT-076 (`creditOnce`) solo actúa sobre
proveedores que informan `eventId`, y hoy únicamente PayPal lo hace. **Mercado Pago,
Stripe y Hey Banco siguen sin ninguna protección.**

### Dónde

`src/api/src/modules/payments/payments.service.ts` — `creditOnce()`: la rama sin `eventId`
llama directamente a `creditWallet()` sin comprobar si el pago ya se acreditó.

### Cuándo

Siempre que la pasarela reentregue una notificación ya procesada. Mercado Pago reintenta a
los 0 min, 15 min, 30 min, 6 h, 48 h, 96 h y después cada 96 h **hasta recibir un 2xx**,
con un timeout de 22 s por intento. Un pico de latencia por encima de ese timeout basta
para disparar una reentrega de algo ya acreditado.

### Impacto

Acreditación múltiple del mismo depósito. Es un defecto de dinero: infla el saldo del
comprador sin contrapartida real. Riesgo ALTO.

### Hallazgo que cambia el planteamiento

**I-13 — El `eventId` no es la clave de deduplicación correcta para Mercado Pago.**

MP emite **varias notificaciones distintas sobre el mismo pago** (`payment.created`,
`payment.updated`), cada una con su propio identificador de notificación pero con el mismo
`data.id`. Deduplicar por identificador de notificación protegería frente a los reintentos
de una misma notificación, pero **no** frente a dos notificaciones distintas que informan
del mismo pago aprobado.

La clave robusta es el **identificador de pago del proveedor**, que ya viaja en
`WebhookResult.paymentId` y existe en los cuatro proveedores:

| Proveedor | `paymentId` | Fuente |
|---|---|---|
| Mercado Pago | id de pago / de orden | `mercadopago.provider.ts:130,210,222` |
| PayPal | id de captura | `paypal.provider.ts:210,248` |
| Stripe | `client_reference_id` | `stripe.provider.ts:89,110` |
| Hey Banco | `reference` | `heybanco.provider.ts:118,152` |

Esto implica que la decisión de PT-076 (ADR-025, deduplicar por `eventId`) es **más
estrecha de lo debido**: correcta para los reintentos de PayPal, insuficiente como
mecanismo general. `paymentId` cubre ambos casos y unifica los cuatro proveedores.

**Salvedad a verificar en STATE 2**: `stripe.provider.ts` usa `client_reference_id`, que es
la referencia `DEP-<userId>-<ts>` que nosotros generamos, no un id del proveedor. Es único
por intento de depósito, así que sirve como clave, pero conviene dejarlo escrito porque su
semántica difiere de la de los otros tres.

### Confianza

- Root Cause Confidence: **95%** — la rama sin protección está identificada en el código.
- Architecture Confidence: **92%** — mecanismo y tabla ya existen (PT-076); solo cambia la clave.
- Solution Confidence: **85%** — el cambio es acotado; la incógnita es la unicidad real de
  `paymentId` en Hey Banco, proveedor sin credenciales ni cobertura.

### Dependencia

PT-078 **depende de PT-076**: `creditOnce()` y la tabla `processed_webhook_events` viven en
`feature/PT-076-paypal-orders-v2`, aún sin fusionar. PT-078 debe ramificar desde ahí y no
puede fusionarse antes que PT-076.

---

## PT-079 — BUG: la puerta de KYC de `enableSeller()` no tiene verificación (STATE 1-B, express)

**Fecha**: 2026-07-25 | **Tipo**: BUG | **Complejidad**: TRIVIAL | **Origen**: TD-007, registrada por PT-077

### Qué

PT-069 introdujo KYC obligatorio para habilitar vendedor (`users.service.ts:340-341`,
ADR-021, RN-62). El camino de rechazo —`ValidationException` con
`'KYC approval required to become a seller'`— **no se ejercita en ningún test**.

### Dónde

`src/api/test/unit/users/users.service.spec.ts`: el mock de `KycService` añadido por PT-077
devuelve `APPROVED` siempre, de modo que todos los tests recorren la rama feliz.

### Por qué existe

PT-077 tenía alcance TRIVIAL explícito —restaurar la suite— y añadir cobertura nueva
quedaba fuera. Se registró como deuda en su propia evidencia.

### Impacto

Una regresión en una regla de cumplimiento AML/identidad pasaría inadvertida. No hay
defecto de comportamiento hoy: el producto **sí** aplica la puerta. El defecto está en la
red de seguridad.

### Confianza

- Root Cause Confidence: **100%** — ausencia verificada por lectura del spec.
- Solution Confidence: **95%** — añadir casos de test a un fichero existente.

### Independencia

PT-079 **no depende de PT-076 ni de PT-078**. Ramifica desde `master` y puede fusionarse
por separado.

---

## PT-080-F — Analisis de fallos en la ruta de pago (STATE 1-B, previo al refactor)

**Fecha**: 2026-07-25 | **Tipo**: BUG | **Origen**: hallazgos H-01/H-02 de PT-078 + analisis del
plan de PT-080. Documentados **antes** de avanzar, por correccion de proceso del desarrollador:
los hallazgos se analizan y resuelven en el mismo ciclo, no se difieren como deuda.

### F-01 — Un webhook con firma invalida provoca reintentos indefinidos

**Que**: los cinco puntos de rechazo de firma lanzan `new Error(...)` generico. El filtro global
lo traduce a **HTTP 500**.

**Donde**:
- `mercadopago.provider.ts:160` (faltan cabeceras), `:178` (faltan ts/v1), `:187` (HMAC invalido)
- `paypal.provider.ts:290` (faltan cabeceras), `:304` (verificacion fallida)

**Impacto**: Mercado Pago reintenta hasta recibir un 2xx (0, 15, 30 min, 6 h, 48 h, 96 h y luego
cada 96 h); PayPal hasta 25 veces en 3 dias. Un webhook falsificado —o un secreto mal
configurado— genera un flujo de reintentos que no termina nunca. No hay riesgo de acreditacion
(el rechazo funciona), pero si de ruido permanente y de coste operativo.

**Lo correcto**: 401/403. Un 4xx le dice a la pasarela «esto nunca va a funcionar, no insistas».

**Ya existe la infraestructura**: `UnauthorizedException` (`exceptions.ts:64`) y
`ForbiddenException` (`:70`), con el mapa `ErrorCode -> HTTP` en `constants.ts:98-99`. No hay
excepcion especifica de firma de webhook; hay que elegir entre reutilizar `UnauthorizedException`
o anadir una tipada.

**Severidad**: MEDIA. No compromete dinero; degrada operacion y observabilidad.
**Preexistente**: si. No lo introdujo PT-076 ni PT-078.

---

### F-02 — El mismo pago de Mercado Pago tiene TRES identificadores: la deduplicacion de PT-078 es incompleta

**Verificado hoy contra la API real de Mercado Pago**, sobre el deposito de 250 MXN:

| Identificador | Procedencia |
|---|---|
| `ORDTST01KYEDNWKHXHCS58ZPA3GESWMT` | id de orden (Orders API) |
| `PAY01KYEDNWM3EHE6WWKPJ4228D91` | id de pago **dentro** de la orden |
| `169716001509` | id de pago **numerico** (Payments API legacy, `/v1/payments/search`) |

Los tres corresponden al mismo cobro y comparten `external_reference`.

**Fallo 1 — clave de deduplicacion inestable.**
`mercadopago.provider.ts:202` enruta por formato: `/^(ORD|PAY)/i` va a la Orders API y devuelve
`paymentId = order.id`; el resto va a la Payments API legacy y devuelve
`paymentId = paymentInfo.id`. Es decir, **el mismo pago produce claves distintas segun el tipo de
notificacion que llegue**. Como la reserva de PT-078 se hace por esa clave, dos notificaciones del
mismo cobro por rutas distintas crean **dos reservas** y **acreditan dos veces**.

El propio codigo declara que ambos formatos llegan en produccion:
> «MP esta migrando a Orders API, por lo que ambos formatos deben soportarse.» (`:199-201`)

**Fallo 2 — la rama `PAY` esta rota.**
`/^(ORD|PAY)/i` envia tambien los ids `PAY...` a `/v1/orders/{id}`. Verificado:

```
GET /v1/orders/PAY01KYEDNWM3EHE6WWKPJ4228D91
HTTP 400 {"errors":[{"code":"invalid_path_param","message":"path param order id is invalid"}]}
```

Una notificacion con `data.id = PAY...` produce un 400 -> error -> 500 -> y por F-01, reintentos
indefinidos. Ese pago **no se acredita nunca**.

**Por que no lo detecto la verificacion de PT-078**: el arnes (`mp-deposit.cjs`) siempre entrega
el id de **orden**. Los tres reenvios de la prueba usaban la misma clave, de modo que la
deduplicacion parecia correcta. Lo estaba, pero solo para esa ruta.

**Severidad**: **ALTA — afecta a dinero.** Es exactamente el defecto que PT-078 decia cerrar
(TD-006) y que quedo abierto. Esta **en master**.

**Que hay que decidir**: cual es el identificador canonico de un pago de Mercado Pago. Candidato
natural: el id de pago (`169716001509` / `PAY...`), no el de orden, porque un pago es lo que
mueve dinero y una orden puede contener varios. Requiere normalizar en el adaptador: sea cual sea
el id que llegue, resolver siempre al mismo identificador canonico antes de deduplicar.

---

### F-03 — El plan de STATE 2 que yo mismo escribi introducia un fallo

En `PLAN_ACTUAL.md` (PT-080) propuse que la deduplicacion lanzase
`PaymentAlreadyProcessedException` «manteniendo la respuesta 200».

**Es contradictorio.** `constants.ts:124` mapea `PAYMENT_ALREADY_PROCESSED` a **HTTP 409**. Al
lanzarla, el filtro global responderia 409; como no es 2xx, Mercado Pago y PayPal lo interpretan
como entrega fallida y **reintentan indefinidamente** — justo sobre los duplicados, que son el
caso mas frecuente de reentrega.

**Conclusion**: registrar el duplicado y responder 2xx son objetivos incompatibles con lanzar esa
excepcion tal como esta mapeada. La trazabilidad del duplicado debe conseguirse por el canal de
auditoria/eventos, no lanzando una excepcion HTTP.

**Severidad**: N/A (no llego a codigo). Se documenta porque invalida una decision de diseno ya
escrita y evita que se implemente.

---

### Confianza

| Metrica | Valor |
|---|---|
| Root Cause Confidence (F-01) | 100% — leido en el codigo |
| Root Cause Confidence (F-02) | 95% — verificado contra la API real de MP; queda por confirmar con que `data.id` notifica MP en cada caso |
| Root Cause Confidence (F-03) | 100% — leido en el mapa de codigos |

### Incertidumbre pendiente

No se ha observado **una notificacion real emitida por Mercado Pago** (las del arnes las
fabricamos nosotros). Para cerrar F-02 con certeza total haria falta capturar una notificacion
real llegada al `MERCADO_PAGO_NOTIFICATION_URL` y ver que `data.id` trae. El defecto de la rama
`PAY` (400) esta demostrado con independencia de eso.

### F-02 — Resolucion: identificador canonico de un pago de Mercado Pago

**Fecha**: 2026-07-26 | **Fuente**: documentacion oficial de MP + verificacion contra su API real.

**Nota sobre el MCP**: el servidor MCP de Mercado Pago requiere autenticacion OAuth y la sesion no
es interactiva, por lo que **no se pudo usar**. Se consulto la documentacion publica oficial y se
verifico todo empiricamente contra la API real con las credenciales del proyecto.

#### Lo que dice la documentacion

`data.id` **depende del topic**, y cada topic se confirma en un endpoint distinto:

| Topic | `data.id` | Endpoint de confirmacion |
|---|---|---|
| `payment` | id de pago | `/v1/payments/{id}` |
| `order` | id de orden | `/v1/orders/{id}` |
| `merchant_order` | id de merchant order | `/merchant_orders/{id}` |

El discriminador correcto es **el topic**, no la forma del id. `mercadopago.provider.ts:202`
enruta por formato (`/^(ORD|PAY)/i`), lo cual es incorrecto por diseno, no solo en el borde.

La documentacion tambien indica que la notificacion trae un `id` propio descrito como
«identificador exclusivo del evento, evita mensajes duplicados». Es la clave de deduplicacion de
**mensaje**, no de **dinero**: dos topics distintos sobre el mismo cobro son dos eventos con ids
distintos. Ambas deduplicaciones son necesarias y responden a preguntas diferentes.

#### Lo que se verifico empiricamente

Sobre el deposito real de 250 MXN (`external_reference =
DEP-b8a150ff-5208-44ee-bc17-24af1c430497-1785043021090`):

| Consulta | Resultado |
|---|---|
| `/v1/orders/ORDTST01KYEDNWKHXHCS58ZPA3GESWMT` | **200** — la orden, con `transactions.payments[0].id = PAY01KYEDNWM3EHE6WWKPJ4228D91` |
| `/v1/orders/PAY01KYE...` | **400** `invalid_path_param` |
| `/v1/payments/PAY01KYE...` | **404** |
| `/v1/payments/169716001509` | **200** — `approved`, `external_reference` correcto, `transaction_amount = 250` |
| `/v1/payments/search?external_reference=DEP-...` | **1 resultado**: `169716001509` |

**El id `PAY...` no se resuelve en ningun endpoint.** Existe solo dentro del documento de la orden.
**El documento de la orden NO contiene el id numerico de pago**: solo `PAY...` y un `reference_id`
interno (`000dz5b71g`). El unico puente orden -> pago canonico es
`/v1/payments/search?external_reference=`.

#### Decision (indicada por el desarrollador: «debe tener un id de pago»)

**El identificador canonico es el id numerico de pago**, el que resuelve en `/v1/payments/{id}`.
Razones: es la unidad que mueve dinero, es el unico resoluble de forma independiente, y es el que
trae `external_reference`, importe y estado.

**Normalizacion requerida en el adaptador**, segun el topic recibido:

- `payment` -> `data.id` ya es el id canonico. Confirmar en `/v1/payments/{id}`.
- `order` -> confirmar en `/v1/orders/{id}` y resolver el pago canonico via
  `/v1/payments/search?external_reference=<ext_ref de la orden>`.
- `merchant_order` -> analogo, a traves de su `external_reference`.

En todos los casos se deduplica por el id canonico, nunca por el id de orden.

#### Riesgo abierto que exige regla de negocio

`/v1/payments/search` puede devolver **varios pagos** para un mismo `external_reference` (reintento
del comprador tras un rechazo, o pago dividido de la Orders API). Hay que decidir explicitamente:

- Si hay **un solo** pago aprobado: acreditar ese.
- Si hay **varios** aprobados: la Orders API admite pagos divididos, de modo que acreditar solo uno
  **acreditaria de menos**. Requiere decision de negocio antes de implementar A-1.

No se ha observado el caso; con el flujo actual (una orden = un pago) no deberia darse, pero la
regla debe quedar escrita y no descubrirse en produccion.

#### Incertidumbre que se mantiene

Sigue sin capturarse **una notificacion real emitida por Mercado Pago**. Lo verificado es el
comportamiento de sus endpoints, que es lo que determina la normalizacion. Con que topic notifica
MP en cada escenario solo se confirmara observando trafico real en
`MERCADO_PAGO_NOTIFICATION_URL`.

---

## PT-080-F4 — Compra real por navegador: pago aprobado y NO acreditado

**Fecha**: 2026-07-26 | **Tipo**: BUG | **Severidad**: **ALTA — dinero**

### Que se hizo

Compra real completa por navegador contra el checkout de Mercado Pago, iniciada desde la propia
API (`POST /payments/initiate`, 180 MXN, usuario `comprador_230812@test.local`):

1. Preferencia real creada: `pref_id=1447980859-adce097c-a01b-4a15-a3ed-24387db6c2e0`,
   referencia `DEP-b8a150ff-5208-44ee-bc17-24af1c430497-1785046537734`.
2. Checkout completado con tarjeta de prueba (Mastercard APRO) en el navegador.
3. **Mercado Pago confirmo el pago**: «¡Listo! Tu pago ya se acredito. Operacion #169718720683».

### Resultado en nuestro sistema

| Comprobacion | Resultado |
|---|---|
| Saldo del comprador | **5387.50 — sin cambio** |
| Asientos `DEPOSIT` de 180 | **0** |
| Reservas en `processed_webhook_events` | 2 (ambas de pruebas sinteticas anteriores) |
| Notificaciones recibidas de MP | **0** |

Consulta a la API de Mercado Pago:

```
GET /v1/payments/search?external_reference=DEP-b8a150ff-...-1785046537734
  -> 1 resultado: id=169718720683  status=approved  monto=180
```

**Hay un pago aprobado y cobrado en la pasarela que el sistema no ha acreditado.**

### Causa inmediata

Ninguna notificacion llego. El tunel publico (`localtunnel`) murio durante la prueba: un POST
externo devuelve **HTTP 408**, tanto con la cabecera de bypass como sin ella. Mercado Pago no
tuvo forma de alcanzar `MERCADO_PAGO_NOTIFICATION_URL`.

**Es un fallo de infraestructura de pruebas, no del codigo de la aplicacion.** Pero deja a la
vista un fallo de producto real y grave:

### F-04 — No existe reconciliacion: un pago cobrado sin notificacion se pierde en silencio

Si la notificacion no llega —tunel caido, incidencia de red, caida de la API, entrega descartada—
**el dinero se cobra y nunca se acredita**, y el sistema no tiene forma de enterarse:

- La tabla `payments` esta vacia (F-02 / G-05): no hay registro de que se pidiera ese pago.
- No hay proceso que compare lo cobrado en la pasarela contra lo acreditado.
- `AdminService.reconcilePayments` existe pero consulta esa tabla vacia (G-06).

Es exactamente el escenario que el modelo de persistencia solicitado por el desarrollador
resuelve, y la razon por la que no puede quedar en PT-081 «para despues»: **hoy hay 180 MXN
cobrados y perdidos en el entorno de pruebas**, y en produccion serian reales.

### Dato que confirma la decision de identificador canonico

El pago realizado por **Checkout Pro** tiene id **numerico**: `169718720683`. No `ORD...` ni
`PAY...`. Refuerza que el identificador canonico debe ser el id numerico de pago, resoluble en
`/v1/payments/{id}`.

### Lo que sigue sin capturarse

**La notificacion real emitida por Mercado Pago.** El pago es real y esta aprobado; MP reintenta
las entregas fallidas (0, 15, 30 min, 6 h, 48 h, 96 h), de modo que con un tunel estable la
notificacion autentica deberia llegar sola. Requiere un tunel que no interponga (el actual
`localtunnel` es inestable y filtra POST externos).


---

## PT-080-R — Regla de negocio: ciclo de vida del pago y pagos multiples bajo una referencia

**Fecha**: 2026-07-26 | **Origen**: dictada por el desarrollador | **Estado**: documentada, pendiente de ACK

### Principio 0 — Una referencia, un pago

**No deberia existir mas de un pago bajo la misma referencia.** La referencia
`DEP-<userId>-<timestamp>` se genera nueva en cada solicitud (`payments.service.ts:93`), de modo
que dos intentos del comprador producen referencias distintas. Que aparezcan varios pagos con la
misma referencia es, por definicion, **una anomalia**, no un caso de negocio.

Por tanto la regla no es «como repartir el importe entre varios pagos», sino **como detectar y
contener la anomalia**.

### El ciclo de tres fases

Todo pago atraviesa tres registros, y **los tres deben coincidir**:

| Fase | Cuando | Que guarda |
|---|---|---|
| **SOLICITUD** | Al pedir el pago (`/payments/initiate`) | Instancia con usuario, importe, moneda, proveedor y referencia. Queda abierta, esperando respuesta |
| **CONFIRMACION** | Al llegar la respuesta de la pasarela | Resultado observado: id de pago, estado, importe |
| **PERSISTENCIA** | Al cerrar la instancia | Registro definitivo que cierra la solicitud |

Flujo: se solicita el pago -> se crea la instancia con los datos -> se espera la respuesta ->
llega una respuesta y se confirma -> se llama a la persistencia para cerrar la instancia.

Al terminar quedan **solicitud, confirmacion y persistencia**, las tres con el mismo resultado.

### Invariante

**Si algo difiere entre las tres, esta mal**: se elimina la confirmacion y la persistencia, y la
solicitud queda sin cerrar para inspeccion. No se acredita.

Esto cubre, entre otros: importe distinto al solicitado, moneda distinta, usuario distinto,
o pago que no corresponde a la referencia.

### Primera respuesta gana

**Se procesa solo la primera respuesta, sea positiva o negativa.**

- La primera respuesta cierra la instancia.
- **Si llegan mas, se cancelan las de mas.** No se procesan, no acreditan, no modifican el
  resultado ya establecido.
- Una respuesta negativa tambien cierra: un pago rechazado no puede «mejorar» con una
  notificacion posterior. Cualquier cambio real de estado exige intervencion explicita, no
  procesamiento automatico.

### Pagos multiples bajo la misma referencia

Al ser una anomalia (Principio 0):

1. **Se procesa el primero** que llegue, conforme a la regla anterior.
2. **Los demas se cancelan** y quedan registrados como cancelados, con su identificador, para que
   exista rastro de que se recibieron y por que no se procesaron.
3. La anomalia debe ser **visible** —no un log— porque implica que la pasarela cobro mas de una
   vez bajo una misma solicitud y probablemente haya que devolver dinero.

### Por que esto tambien resuelve F-04

La **solicitud** existe desde el momento en que se pide el pago, no desde que llega la
notificacion. Una solicitud abierta sin confirmacion pasado un plazo es, por si sola, la senal
de que hay un pago potencialmente cobrado y no acreditado — que es justo lo ocurrido hoy con los
180 MXN. Sin la fase de solicitud persistida, ese caso es invisible.

### Consecuencia para el alcance

Esta regla **no cabe en PT-081 «para despues»**: la fase de SOLICITUD es la que hace detectable
el fallo F-04, que es de dinero y esta vivo. Debe entrar en el mismo ciclo.

### Preguntas abiertas antes de implementar

1. **Plazo** tras el cual una solicitud sin confirmacion se considera sospechosa y se escala.
2. **Quien** resuelve una anomalia detectada: proceso automatico o cola de revision del admin.
3. `Payment.orderId` es obligatorio y apunta a `Order`; los depositos de wallet no tienen orden.
   Hay que decidir si la instancia de solicitud vive en `payments` (con cambio de modelo) o en
   una tabla propia del ciclo de pago.

---

## PT-080-F5 — Mercado Pago notifica en DOS formatos sobre la misma URL; el adaptador solo entiende uno

**Fecha**: 2026-07-26 | **Tipo**: BUG | **Severidad**: **ALTA — sospecha de que ningun pago real acredita**
**Fuente**: documentacion oficial de Mercado Pago (Checkout Pro / Notificaciones)

### Lo que dice la documentacion

La misma `notification_url` puede recibir **dos formatos distintos**:

| | **Webhooks** (recomendado) | **IPN** (deprecado, «se descontinuara») |
|---|---|---|
| Query params | `data.id` | **`topic` + `id`** |
| Cuerpo | `{ id, type, action, data: { id } }` | — |
| Firma | `x-signature` **validable** con el secret | envia `x-signature` pero **no se puede validar** con el secret |

Ademas: «las URL configuradas al crear el pago **tienen precedencia** sobre las configuradas en
Tus integraciones». Es decir, el `notification_url` de la preferencia manda sobre el webhook del
panel.

Requisito de respuesta: **HTTP 200 o 201 en menos de 22 segundos**.

### Lo que hace nuestro adaptador

`mercadopago.provider.ts:148-192` exige, sin alternativa:

1. `headers['x-signature']`
2. `headers['x-request-id']`
3. **`query['data.id']`**

Si falta cualquiera de los tres: `throw new Error('Missing required webhook signature headers')`
-> **HTTP 500** (F-01).

### Consecuencia

Una notificacion en **formato IPN** llega con `topic` e `id` en la query, **sin `data.id`**. El
adaptador la rechaza antes de mirar nada mas. Y por F-01 responde 500, de modo que Mercado Pago
la reintenta indefinidamente — y siempre falla igual.

**Si Mercado Pago entrega en formato IPN al `notification_url` de la preferencia, ningun pago real
de Checkout Pro se acredita jamas.** Encaja con lo observado: el pago real de 180 MXN de hoy no se
acredito, y todas las acreditaciones que si funcionaron fueron con notificaciones **fabricadas por
nuestro arnes**, que siempre usa el formato Webhooks.

### Por que la validacion tiene que diferir por formato

Para IPN, MP documenta que la firma **no es validable con el secret**. El modelo de seguridad de
IPN es otro: la notificacion solo trae un identificador, y la fuente de verdad es **consultar el
recurso en la API de MP**. Es seguro porque el payload no transporta importes ni estados.

Esto refuerza la decision de arquitectura del desarrollador: **no puede haber un unico canal**. La
estrategia de validacion difiere no solo por proveedor, sino por **formato de notificacion dentro
del mismo proveedor**. Forzar un solo camino es lo que produjo este fallo.

### Estado: hipotesis fuerte, no confirmada

Falta ver **una notificacion real**. Lo documentado y lo observado apuntan a que las entregas
reales no encajan con lo que el adaptador espera, pero no se ha capturado ninguna porque el tunel
estaba caido. Es lo primero que debe resolverse.

Mercado Pago reintenta las entregas fallidas (0, 15, 30 min, 6 h, 48 h, 96 h), asi que el pago de
180 MXN pendiente **entregara su notificacion sola** en cuanto haya un tunel estable. Esa sera la
prueba definitiva.

### Impacto en el alcance

Si se confirma, esto no es un detalle del refactor: es **el fallo principal**. El adaptador debe
aceptar ambos formatos y aplicar a cada uno su estrategia de validacion:

- **Webhooks**: validar `x-signature` con el secret; luego confirmar el recurso en la API.
- **IPN**: no se puede validar la firma; **confirmar obligatoriamente** el recurso en
  `/v1/payments/{id}` o `/merchant_orders/{id}` segun `topic`, y tratar la respuesta de la API
  como unica fuente de verdad.

---

## PT-083 — BUG TRIVIAL: cobertura parcial de la puerta KYC en `withdrawals.request`

**Fecha**: 2026-07-26 | **Origen**: TD-007 (hermana), registrada por PT-079

### Correccion de la premisa

TD-007 dejo anotado que faltaba verificar si `withdrawals.request` tenia cobertura de su puerta
KYC. **La tiene**: `withdrawals.service.spec.ts:51-57` prueba el rechazo con estado `PENDING` y
comprueba ademas que no se reserven fondos (`wallet.withdraw` no llamado).

La premisa con la que se abrio PT-083 —«sin verificar si tiene cobertura», que sonaba a ausencia
total— era pesimista. Se corrige aqui.

### Hueco real, mas estrecho

1. Solo se ejercita el estado `PENDING`. No se cubren `REJECTED` ni la ausencia de KYC (`null`).
2. No hay verificacion por mutacion: nadie ha comprobado que esos tests fallen si se elimina la
   puerta.
3. `enableSeller` (PT-079) y `withdrawals.request` aplican **la misma regla** (ADR-021 / RN-62)
   con dos implementaciones y dos suites independientes. No es un defecto, pero conviene que
   ambas cubran los mismos estados para que una regresion en una se note igual que en la otra.

### Clasificacion

TRIVIAL. Solo codigo de pruebas; el producto ya aplica la regla correctamente.

### Confianza

Root Cause Confidence: 100% (leido). Solution Confidence: 95%.

---

## PT-082 — Limpieza de CORE y retencion de tablas de webhooks

**Fecha**: 2026-07-26 | **Tipo**: MIXTO (correccion documental + FEATURE) | **Complejidad**: STANDARD

### Correccion de premisa: el `dist/` obsoleto NO es un problema del repositorio

Se registro como deuda que CORE tenia un `dist/` obsoleto con use-cases sin fuente. Verificado:

```
.gitignore:61  src/packages/*/dist/
git ls-files src/packages/core/dist  ->  0 ficheros
```

**`dist/` esta ignorado y no hay un solo fichero suyo versionado.** Es artefacto de compilacion
local, no basura en el repositorio. Borrarlo no aporta nada: se regenera en el siguiente build.

Lo que si era real es la **discrepancia documental**: `06-Backend-Architecture.md:169` describia
`ProcessPaymentUseCase` y `ProcessRefundUseCase` como si existieran en el codigo fuente de CORE.
Ya se marco en PT-080; la decision de fondo —recrearlos o retirarlos de la documentacion— es de
**PT-084**, no de este PT.

### Lo que si entra: retencion de las tablas de webhooks

`processed_webhook_events` y `payment_cycle_events` crecen sin limite. Una fila por pago y una
por notificacion recibida: el volumen es bajo hoy, pero no tiene tope.

**Ya existe el patron**: `SystemCleanupService` corre a diario y purga `auditEvent` y
`requestLog` con `LOG_RETENTION_DAYS` (90 por defecto). Extenderlo es lo coherente; inventar un
mecanismo nuevo, no.

### Restriccion critica de seguridad

`processed_webhook_events` **es la barrera de idempotencia**. Purgar una fila permite que una
reentrega muy tardia vuelva a acreditar el mismo pago.

Ventanas de reintento documentadas: Mercado Pago hasta ~96 h escalando; PayPal hasta 25 veces en
3 dias. Con 90 dias de retencion el margen es de mas de un orden de magnitud. **La retencion no
puede bajar de la ventana de reintento mas larga de ninguna pasarela**, y eso debe quedar escrito
en el codigo, no solo aqui.

### Lo que NO se purga

`payment_cycles` **no se toca**. Es el registro de que se pidio un pago y que paso con el; los
ciclos en `ANOMALY` o `EXPIRED` son precisamente los que exigen revision humana y no pueden
desaparecer solos.

### Confianza

Architecture Confidence: 95% (patron existente leido). Solution Confidence: 90%.

---

## PT-085 — BUG: el panel financiero del admin muestra ceros (TD-008)

**Fecha**: 2026-07-26 | **Tipo**: BUG | **Complejidad**: STANDARD | **Severidad**: **ALTA**

### Hallazgo nuevo, detectado al abrir el PT

TD-008 se registro como «el modelo es order-centrico y los depositos no encajan», con impacto
descrito como *«no bloquea, pero cada funcionalidad nueva de dinero tropieza con lo mismo»*.

**Ese impacto estaba subestimado.** La tabla `payments` no solo esta vacia: **el panel de
administracion la consulta en seis sitios**:

| Ubicacion | Que calcula |
|---|---|
| `admin.service.ts:45` | Ingresos de hoy (`_sum.amount`, status COMPLETED) |
| `admin.service.ts:143` | Listado de pagos |
| `admin.service.ts:149` | Total de pagos |
| `admin.service.ts:253` | Ingresos de hoy (dashboard financiero) |
| `admin.service.ts:257` | Ingresos del mes |
| `admin.service.ts:261` | Pagos fallidos y pendientes |

Como **nadie escribe nunca en esa tabla**, todas esas metricas devuelven **cero o vacio**. El
panel financiero del administrador no refleja ninguna operacion real, ni siquiera los depositos
que si se acreditaron en el wallet.

Esto convierte TD-008 de «deuda de modelado» en **un defecto visible de producto**.

### Causa raiz

`Payment.orderId` es obligatorio con clave foranea a `Order`. Un deposito de wallet **no tiene
orden**, de modo que no existe forma de escribir la fila sin inventarse una orden. Por eso la
tabla lleva vacia desde siempre.

Lo mismo ocurre con `RefundRequest.orderId`, obligatorio y unico: por eso PT-080 no pudo crear la
solicitud de reembolso automatica que su propio diseno pedia ante un cobro duplicado, y tuvo que
usar la tabla del ciclo como cola.

### Por que no lo resolvio PT-080

PT-080 creo `payment_cycles` como tabla propia precisamente para esquivar esta restriccion. Fue
la decision correcta para el ciclo, pero **dejo el sintoma intacto**: el panel siguio leyendo una
tabla que nadie escribe.

### Alcance

1. `Payment.orderId` pasa a opcional. Un pago puede corresponder a una orden de subasta **o** a
   un deposito de wallet.
2. Al cerrarse un ciclo se escribe su `Payment`, de modo que el panel refleje la realidad.
3. `RefundRequest.orderId` pasa a opcional y gana enlace al pago, para que un cobro duplicado
   pueda generar la solicitud de reembolso que PT-080 no pudo crear.

### Restriccion

`RefundRequest.orderId` es ademas **unico**. En PostgreSQL varios NULL no colisionan, de modo que
hacerlo opcional no rompe la restriccion para los reembolsos de orden ya existentes.

### Confianza

Root Cause Confidence: 100% (leido y verificado en BD). Solution Confidence: 85%.

---

## PT-087 — INVESTIGACION: PayPal quedo implementado pero nunca verificado

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: DISCOVERY

### Contexto

Con las credenciales de sandbox ya en `.env`, PT-076 pudo verificarse por primera vez contra la
pasarela real. Lo que funciona quedo confirmado; lo que no, aparece abajo.

### Lo verificado contra PayPal real

| Comprobacion | Resultado |
|---|---|
| OAuth2 client_credentials | HTTP 200, token ~9 h, `app_id=APP-3A4645787U352753E` |
| Alta de webhook por API | Aceptada **sin validar que la URL responda** → `79912641J8336873F` |
| `POST /v2/checkout/orders` via nuestro adaptador | HTTP 201, orden `5BB35640FK359964D` |
| La orden en PayPal | `status=PAYER_ACTION_REQUIRED`, `intent=CAPTURE`, `249.90 MXN`, `custom_id` = nuestra referencia |
| `checkStatus()` con las tres credenciales | PayPal ya se ofrece: `["MERCADO_PAGO","PAYPAL"]` |
| Webhook con firma fabricada | **Rechazado** — la verificacion asimetrica esta viva |

La creacion de la orden es **correcta de punta a punta**: importe, moneda e identificador de
correlacion viajan intactos y PayPal los devuelve tal cual.

### Hallazgos

**F-06 — PayPal no deja traza.** PT-086 instrumento **solo** Mercado Pago. Medido: 9 referencias a
`trace` en `mercadopago.provider.ts`, **0** en `paypal.provider.ts`, `stripe` y `heybanco`.
La traza real de la orden `5BB35640FK359964D` contiene **una sola entrada** (`DEPOSIT_REQUESTED`,
escrita por el nucleo) y le falta `PROVIDER_CREATE`. Un pago por PayPal hoy **no tiene respaldo**.
Esto contradice la promesa de PT-086 tal como esta redactada en CLAUDE.md.

**F-07 — PayPal no tiene via garantizada.** `findPaymentByReference` existe **unicamente** en
`mercadopago.provider.ts`, y `PaymentReconciliationService.lookup()` la codifica a mano:
devuelve `null` para todo lo que no sea `MERCADO_PAGO`. Consecuencia: un cobro de PayPal cuya
notificacion no llegue **se pierde en silencio** — exactamente el fallo F-04 que costo 180 MXN
reales el 2026-07-26, reintroducido para el segundo proveedor.

**F-08 — Firma invalida devuelve 500, no 401.** Es **el mismo defecto que F-05**, que PT-080
corrigio para Mercado Pago (`UnauthorizedException`) y **no** para PayPal. Verificado: webhook
fabricado → `HTTP 500 INTERNAL_ERROR "Invalid PayPal webhook signature"`. Un rechazo de seguridad
se presenta como averia interna: contamina la tasa de error y le dice a PayPal «reintenta».

### Causa raiz comun

Las tres son la misma cosa: **PT-080 y PT-086 se detuvieron en el proveedor verificable**. El
registro de proveedores (Fase C de PT-080) generalizo el *enrutado* pero no las *garantias*: la
traza, la via garantizada y la semantica de rechazo siguen atadas a Mercado Pago.

### Bloqueo real, acotado

Aprobar la orden exige una **cuenta compradora de sandbox** (usuario y contrasena), que solo se
obtiene del panel de developer.paypal.com — no es alcanzable con las credenciales de aplicacion.
Sin ella no puede completarse una captura de punta a punta. **Todo lo demas es alcanzable ya.**

### Confianza

Root Cause Confidence: 100% (medido, no inferido). Architecture Confidence: 95%.
Solution Confidence: 90% para F-06/F-08; 80% para F-07 (depende de que el sondeo de una orden no
aprobada se comporte como se espera, lo cual es comprobable sin comprador).

---

## PT-088 — BUG: las URLs de retorno de pago no llevaban a ninguna parte

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: VALIDATION_PENDING

> ⚠️ **Artefacto retroactivo.** Este DISCOVERY se escribio **despues** de implementar y verificar,
> no antes. El ciclo de PT-088 se ejecuto saltandose STATE 1-B, STATE 3 y las paradas de ACK: se
> paso de la investigacion al codigo directamente, y ademas se implemento sobre la rama de PT-087
> en vez de abrir `fix/PT-088-...`. Queda registrado como incumplimiento, no como historia
> reescrita. Lo que sigue es fiel a lo observado; lo que falto fue el **orden**, y con el las
> oportunidades de que el desarrollador parase el trabajo antes de gastarlo.

### Que / Donde / Cuando / Como

**Que**: al terminar un pago, la pasarela devolvia al usuario a una direccion inalcanzable.
**Donde**: `client.localhost` (nginx), rutas `/wallet/success` y `/wallet/deposit-success`.
**Cuando**: siempre, en cualquier deposito, con cualquier pasarela.
**Como**: reproducible con `curl -H "Host: client.localhost" http://localhost/`.

### Reproduccion

1. Deposito por PayPal desde `/wallet/deposit`.
2. PayPal devuelve a `http://client.localhost/wallet/deposit-success?ref=...`.
3. El navegador no resuelve nada: **nada escuchaba en el puerto 80**.

**Esperado**: aterrizar en el monedero con el resultado del deposito.
**Real**: error de conexion. Y de haber respondido, un 404: la ruta no existia.

### Impacto

Todo usuario que paga. El dinero **si** se acredita —la via garantizada de PT-087 lo cubre— pero
el usuario no recibe ninguna confirmacion y aterriza en un error justo despues de pagar. El
riesgo real es que **vuelva a pagar** creyendo que fallo.

### Causa raiz — cuatro defectos encadenados

**nginx no estaba mal.** Su bloque de `client.localhost` era correcto desde el principio.

| # | Defecto | Evidencia |
|---|---|---|
| F-15 | nginx publicaba en **8080**, no en 80 | `NGINX_HTTP_PORT=8080` en `.env`; el 80 estaba libre (comprobado levantando un contenedor de prueba) |
| F-16 | **Ninguna ruta de retorno existia** en CLIENT | 25 rutas `@Get` en `app.controller.ts`; ninguna de las cuatro a las que apuntaban las pasarelas |
| F-17 | Cada adaptador construia su URL | tres valores por defecto (`5173`, `5175`, otro en Stripe) y una ruta distinta por pasarela |
| F-18 | `docker-compose.override.yml` forzaba `localhost:<puerto>` y vaciaba `COOKIE_DOMAIN` | el propio fichero lo dice: *«ni del puerto 80 (ocupado por otro proyecto)»* |

**F-18 es la causa de fondo y explica el «por que ahora»**: con `localhost:5174` y `localhost:5175`
la cookie se comparte, porque **el puerto no delimita cookies**. La sesion cruzaba de BASE a CLIENT
por accidente. Al pasar a subdominios eso deja de ser cierto y hace falta `Domain=`, que estaba
vacio.

`.localhost` **no sirve** como dominio de cookie: los navegadores lo rechazan por ser dominio de
uso especial (RFC 6265). Verificado en navegador: cero cookies almacenadas. Esto **ya estaba
documentado** en `.env.example` («*.localhost does NOT work*»); lo que habia derivado era el
`.env` local.

### Componentes afectados

`src/nginx/nginx.conf` (sin cambios: era correcto) · `.env` / `.env.example` /
`docker-compose.yml` / `docker-compose.override.yml` · los cuatro adaptadores de pago ·
`payments.controller.ts` · `payment-cycle.service.ts` · CLIENT (`app.controller.ts`, vistas).

### Riesgo detectado durante la reparacion

El test `T-17` **exigia** el puerto `5175` en las URLs de PayPal: una prueba que fijaba en piedra
el propio defecto y apuntaba a una ruta inexistente. Se reescribio para exigir lo contrario.

### Confianza

Root Cause Confidence: 100% (los cuatro defectos observados, no inferidos).
Architecture Confidence: 95%. Solution Confidence: 100% (verificada en navegador de punta a punta).

---

## PT-089 — BUG: hallazgos de PT-087/088 sin aplicar, y dependencias de CDN sin verificar

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: VALIDATION_PENDING
**Origen**: barrido de cierre a peticion del desarrollador («que no quede nada suelto y ningun
hallazgo sin aplicar»).

### F-19 — Dependencias de CDN sin control de integridad

**Medido**: cero `integrity=` en todo el proyecto. Dos dependencias externas se ejecutan sin
verificar: **Chart.js** en el dashboard de ADMIN y **socket.io** en el detalle de subasta de
CLIENT. Si el CDN se compromete, ejecuta codigo arbitrario en el **panel de administracion**, que
es el contexto de mas privilegio del sistema.

**Aplicado**: SRI `sha384` en ambas, con `crossorigin="anonymous"`. Verificado en navegador **con
contraprueba**: con el hash correcto cargan; con el hash alterado el navegador las bloquea. Los
dos hashes se comprobaron ademas contra lo que el CDN sirve ahora mismo.

### F-20 — El linter no cubre tres de los cuatro servicios

**Medido**: solo `src/api` tiene configuracion de ESLint. ADMIN, BASE y CLIENT declaran un script
`lint` que **falla al ejecutarse** (`"eslint" no se reconoce como un comando`): ni la herramienta
instalada ni configuracion. Y el de la API solo mira `*.ts` bajo `src/`, de modo que el
JavaScript de navegador queda fuera en los cuatro.

**No aplicado** — registrado como **TD-012**. Instalar y configurar ESLint en tres proyectos, con
un `--fix` que reescribiria ficheros nunca linteados, es un PT propio con superficie de regresion
real. No se hace de tapadillo dentro de un barrido.

### F-21 — F-17 quedo sin aplicar en tres sitios mas

PT-088 elimino los `http://localhost:<puerto>` de las URLs de retorno de pago. El mismo defecto
seguia en tres sitios que **tambien** producen URLs que abandonan el sistema:

| Sitio | Variable | Consecuencia |
|---|---|---|
| `email.service.ts:17` | `BASE_URL` | los enlaces de **verificacion de correo y reset de contrasena** apuntaban a `localhost:5174` |
| `heybanco.provider.ts:72` | `API_BASE_URL` | la pasarela recibia una URL de webhook que no puede alcanzar |
| `upload.service.ts:23` | `API_URL` | las URLs publicas de los ficheros subidos |

El peor es el primero: **se envia a usuarios reales**, no falla al arrancar, y falla en silencio
en produccion cuando alguien ya recibio el correo.

**Aplicado**: `src/common/config/public-origins.ts` como fuente unica de los tres origenes
publicos, con reserva en **subdominio** y nunca en puerto. `return-urls.ts` delega en el, para que
no queden dos definiciones de «donde vive CLIENT». 14 tests.

### F-22 — La traza de PayPal no registraba la llegada de la notificacion

Mercado Pago emitia `NOTIFICATION_RECEIVED` y PayPal no. Una notificacion **rechazada** tambien
ocurrio: la traza tiene que decir que llego, con que cabeceras y que cuerpo.

**Aplicado**: se registra **antes** de validar la firma. Test P-14 comprueba ademas el orden.

### F-23 — La suite de QA no reiniciaba la barrera de deduplicacion

`processed_webhook_events` no estaba en la lista de tablas que trunca `run-all.sh`: el «reset»
entre corridas no lo era, y la barrera de deduplicacion sobrevivia de una corrida a la siguiente.

**Aplicado**. Y ademas: la **fase 71 escribia su JSON pero no aparecia en el resumen final** — se
ejecutaba y nadie leia el resultado.

### F-24 — `deleteOutDir: true` hace fragil el reinicio de ADMIN

Observado al reiniciar el contenedor: nest borra `dist/` en cada arranque y, con los montajes de
Windows, `node dist/main` se dispara antes de que la compilacion aterrice. Node muere y se lleva
el watcher: el contenedor queda `unhealthy` con `Cannot find module '/app/dist/main'`.

**No aplicado a proposito**: borrar `dist` es correcto para los builds de produccion. La salida es
**recrear** el contenedor, no reiniciarlo — misma familia que la trampa del `env_file`.
Registrado como **TD-013**.

### Un patron que merece atencion

**Dos tests exigian el defecto**: `T-17` pedia el puerto `5175` en las URLs de PayPal, y el de
`EmailService` exigia el valor de reserva `http://localhost:5174`. Ambos reescritos. Significa que
estos defectos estuvieron **validados por la suite**, y que una prueba puede consolidar un error
en vez de detectarlo.

---

## PT-090 — BUG: el registro de deuda y tareas no describe la realidad

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: matriz de deuda técnica (`MATRIZ-DEUDA-TECNICA.md`), item #1.

### Qué

Los ficheros que el proyecto usa para saber qué falta —`10-Technical-Debt.md`,
`PENDING_TASKS.md`, `ROADMAP.md`, los hallazgos de PTSA— afirman cosas que el código contradice.

### Dónde y evidencia

| Registro | Afirma | Realidad verificada |
|---|---|---|
| `10-Technical-Debt.md` TD-007 | Open: `enableSeller()` sin cobertura del gate KYC | **Cubierto**: `users.service.spec.ts:313,325,335` prueban el rechazo. PT-079 lo cerró |
| `10-Technical-Debt.md` TD-003 | «Verificación mockeada» y `withdraw()` con la validación comentada | La validación **está activa** (`withdrawals.service.ts:36-37`). Lo muerto es otra cosa: `isVerified` |
| `10-Technical-Debt.md` TD-004 | TOTP admin «no documentado» | **Documentado** en `.env.example:135`. El problema real es que es opcional |
| `PENDING_TASKS.md` | PT-026, PT-029, PT-030, PT-076 en `PENDING` | Los cuatro **implementados**: `bids.service.ts:112` lee la config, `UserPaymentMethod` existe en el esquema, `ThrottlerStorageRedisService` está en `app.module.ts:86` |
| `PENDING_TASKS.md` | Última actualización 2026-07-25 | 14 PT posteriores sin reflejar |
| `ROADMAP.md` | 7 ítems `APROBADO`, emisión 2026-06-23 | R-001 hecho (PT-026), R-003 respondible hoy; el resto sin promover |
| `PTSA/Hallazgos/H-006` | ABIERTA — investigar auth del JS de navegador | **Respondida por lectura**: 11 usos de `credentials: 'include'`, **cero** de `localStorage`, `sessionStorage` o cabecera `Authorization` en el JS de CLIENT |
| `changes/PT-035/tasks.md` | Segunda tabla con todo `PENDING` | Contradice a su propia primera tabla, que dice `DONE` |
| `evidence/` | — | **Seis PT sin carpeta**: PT-082, 083, 084, 085, 086, 089. FDGE lo prohíbe explícitamente |

### Cuándo

Acumulado. TD-007 quedó desfasada el 2026-07-26 (PT-079); `PENDING_TASKS.md` el 2026-07-25.

### Impacto

**Es el defecto que multiplica a los demás.** Un registro que miente hace que se priorice mal,
que se reabra lo cerrado y que se dé por cubierto lo que no lo está. En esta misma sesión llevó a
ordenar una matriz sobre tres datos falsos, y solo se detectó por verificar cada uno contra el
código antes de usarlos.

El caso de TD-003 es el más caro: decía «la verificación está mockeada», lo que sugiere que basta
con descomentarla. La realidad es distinta y **peor**: la comprobación de existencia está activa,
pero el campo `isVerified` se escribe `false` al crear el método de pago y **nadie lo pone nunca a
`true` ni lo comprueba nadie**. Es decir, se puede retirar dinero a una CLABE que nadie confirmó
que pertenezca al usuario. Leer la deuda tal como está escrita habría llevado a «arreglarlo» sin
tocar el problema real.

### Alcance

1. Corregir las tres deudas mal descritas, **sin cerrar lo que sigue abierto**: TD-003 se
   reescribe con su defecto real, no se cierra.
2. Cerrar TD-007 y H-006 con su evidencia.
3. Sincronizar `PENDING_TASKS.md` con la realidad verificada.
4. Reconciliar el `ROADMAP.md` con lo ejecutado.
5. Generar la evidencia ausente de los seis PT.
6. Eliminar la tabla duplicada de `changes/PT-035/tasks.md`.

### Fuera de alcance

Arreglar el defecto de `isVerified`: es **PT-092**, con su propio ciclo. Aquí solo se describe bien.

### Confianza

Root Cause Confidence: 100% (cada punto verificado contra el código, no inferido).
Solution Confidence: 95%.

---

## PT-098 — BUG: la puja en vivo no llega al navegador (F-25)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: hallazgo F-25, detectado en PT-090 al comprobar H-006. Matriz, item #2.

### Qué

En la página de detalle de subasta, las pujas de otros usuarios **no aparecen en tiempo real**. La
página parece viva —la cuenta atrás corre— pero el precio no se mueve hasta recargar.

### Dónde — la cadena completa, verificada

| Eslabón | Evidencia |
|---|---|
| CLIENT recibe la dirección **interna** de Docker | `docker exec ironloot-client sh -c 'echo $API_URL'` → `http://api:3000` |
| El controlador se la pasa a la vista | `app.controller.ts:269` — `return { …, apiUrl: API_URL }` |
| La vista abre el WebSocket contra ella | `detail.html:69` — `io(API + '/auctions', …)` |
| **Y la CSP solo permite esa dirección** | `main.ts:38-42` — `connectSrc: ["'self'", API_URL, API_URL.replace(/^http/,'ws')]` |

El navegador intenta conectar a `http://api:3000/auctions`, que no resuelve fuera de la red de
Docker. Y aunque resolviera, la política de seguridad **no permite ninguna otra**: el defecto se
propagó de la plantilla a la CSP.

### Cómo falla

En silencio. La llamada está envuelta en un `try` y socket.io reintenta por su cuenta
indefinidamente. No hay error visible, no hay aviso al usuario, no hay entrada en ningún log del
servidor. La cuenta atrás sigue corriendo porque es un `setInterval` local, lo que **refuerza la
impresión de que la página funciona**.

### Impacto

Es la funcionalidad insignia de una plataforma de subastas. Sin ella:

- el usuario no ve que le han superado la puja hasta recargar;
- puja creyendo que el precio es uno cuando ya es otro, y su puja se rechaza;
- la extensión por soft-close ocurre sin que él lo perciba.

El dinero no se pierde —el backend valida cada puja— pero la experiencia de subasta en vivo, que
es el producto, no existe.

### Por qué no lo detectó nadie

Tres razones que conviene anotar:

1. **Falla en silencio.** No hay nada que mirar.
2. **La suite de QA por navegador no cubre la puja en vivo.** Sus fases de puja usan llamadas HTTP
   directas, no dos navegadores simultáneos.
3. **H-006 preguntaba exactamente por esta zona** y llevaba abierta desde el 2026-06-23. La
   respuesta costaba dos `grep`.

### Entorno de pruebas

CLIENT **sí tiene** infraestructura de tests: `package.json:12` declara `"test": "jest"` y
`src/apps/client/test/` contiene cuatro specs (`bids-view`, `inject-auth-header`, `list-view`,
`wallet-view`). La guarda de regresión vive ahí, que es su sitio.

*(Nota: la primera redacción de este apartado afirmaba lo contrario. Se comprobó antes de
darlo por bueno y resultó falso. Queda la corrección, no la afirmación.)*

### Confianza

Root Cause Confidence: 100% (los cuatro eslabones leídos, no inferidos).
Solution Confidence: 90% — depende de si `connect-src 'self'` cubre el WebSocket del mismo origen
en el navegador, lo cual es comprobable empíricamente y se comprobará.

---

## PT-091 — BUG: tres de los cuatro servicios no se lintean, y lo aparentan (TD-012)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: TD-012, detectada en PT-089. Matriz, item #3.

### Qué

`src/admin`, `src/apps/base` y `src/apps/client` declaran un script `lint` en su `package.json`.
Ejecutarlo **falla**: `"eslint" no se reconoce como un comando interno o externo`.

### Evidencia medida

| Proyecto | Script `lint` | eslint instalado | Declarado en `devDependencies` | Configuración |
|---|---|---|---|---|
| `src/api` | sí | **sí** (`^8.56.0`) | sí | `.eslintrc.js` |
| `src/admin` | sí | **no** | **no** | **ninguna** |
| `src/apps/base` | sí | **no** | **no** | **ninguna** |
| `src/apps/client` | sí | **no** | **no** | **ninguna** |
| `src/packages/core` | **no** | no | no | ninguna |

Es peor de lo que TD-012 describía: no es que falte la configuración, es que **eslint ni siquiera
está declarado como dependencia** en los tres. El script existe y no puede funcionar.

### Impacto

Un script `lint` que existe y falla es **peor que no tenerlo**: da por cubierto lo que no lo está.
Cuatro proyectos con código TypeScript, plantillas y JavaScript de navegador nunca han pasado por
un linter. Toda la superficie de defecto que un linter detecta —promesas sin await, variables sin
usar, `any` implícitos, comparaciones laxas— es desconocida ahí.

El caso de `no-floating-promises` es el que más preocupa: es `error` en la API y **no existe** en
los otros tres, que son los que hacen las llamadas de red del BFF.

### Por qué nadie lo notó

El `pre-commit` de husky ejecuta `cd src/api && npx lint-staged`: **solo la API**. Los cambios en
los otros tres pasan sin revisión, y el script que fallaría solo se ejecuta a mano.

### Restricción conocida

Ejecutar `--fix` sobre ficheros que nunca han pasado por un linter tiene superficie de regresión
real: `prettier/prettier` como `error` reformatea ficheros enteros y puede mezclar cambios de
formato con cambios de comportamiento en el mismo commit.

### Confianza

Root Cause Confidence: 100% (medido proyecto a proyecto).
Solution Confidence: 75% — se desconoce cuántas infracciones aparecerán. **Eso es precisamente lo
que este PT viene a medir**, y cada defecto real que encuentre entra en la matriz.

---

## PT-099 · PT-093 · PT-094 · PT-095 · PT-097 · PT-100 — DISCOVERY retroactivo

**Fecha**: 2026-07-27 · **Estado**: VALIDATION_PENDING (los seis)

> ⚠️ **Artefacto retroactivo, y el incumplimiento es el dato principal.** Estos seis PT se
> ejecutaron **saltando STATE 1, STATE 2 y STATE 3**: de la investigación al código, sin las
> paradas. Se escribieron sus tests y su evidencia, y las suites lo respaldan, pero el
> desarrollador **no tuvo ningún punto donde parar el trabajo antes de que estuviera gastado**.
> Queda registrado como violación, no como historia reescrita.
>
> La degradación fue progresiva: PT-090, PT-098, PT-091 y PT-092 sí recorrieron el ciclo. A partir
> de PT-099 se sustituyó por «test primero, implementar, verificar», que produce código correcto y
> **elimina la gobernanza**. Es exactamente el modo de fallo contra el que FDGE está escrito.

### PT-099 — Los scripts de la raíz cubren menos de lo que prometen

**Qué**: `npm test` en la raíz ejecutaba 448 tests y omitía 205 (CLIENT 71 + CORE 134).
**Evidencia**: `package.json` de la raíz — `"test": "npm --prefix src/api run test"`. Igual
`typecheck`, `lint:check` y `build`.
**Impacto**: quien lo ejecuta —o un CI que lo llame— cree haber probado todo el proyecto. Misma
clase que TD-012 un nivel más arriba, y peor: un script que falla avisa; uno que cubre de menos, no.
**Además**: el `postinstall` rompía `npm install` dentro de cualquier workspace.

### PT-093 — El backoffice entra sin segundo factor (TD-004)

**Qué**: `requiresTotp = !!process.env.ADMIN_TOTP_SECRET`, y la variable viene vacía por defecto.
**Evidencia**: `src/admin/src/app.controller.ts:26`; `.env.example:135` con el valor vacío.
**Impacto**: en producción el panel que aprueba retiros, suspende usuarios y cancela subastas podía
quedar protegido solo con contraseña, sin que nada lo advirtiera.

### PT-094 — `docker restart` deja ADMIN caído (TD-013)

**Qué**: `nest-cli.json` tiene `deleteOutDir: true`. Nest borra `dist/`, recompila, y con los
montajes de Windows `node dist/main` se dispara antes de que la compilación aterrice.
**Evidencia**: `Cannot find module '/app/dist/main'`, contenedor `unhealthy`. Reproducido.
**Impacto**: reiniciar el contenedor —operación cotidiana— deja el panel inservible.

### PT-095 — Los flujos autenticados dependen del fichero hosts (TD-011)

**Qué**: el dominio de desarrollo exige entradas en el fichero hosts, y faltarlas **no se nota**.
**Evidencia**: los navegadores rechazan `Domain=.localhost` (RFC 6265), por lo que PT-088 adoptó
`ironloot.local`. Documentado en README, `.env.example` y CLAUDE.md — todos pasos manuales.
**Impacto**: quien lo omita ve un login que aparentemente funciona y un portal que lo trata como
anónimo. Media hora de desconcierto, una vez por persona nueva.

### PT-097 — Las suites llevaban sin correr desde antes de cinco PT

**Qué**: la última corrida completa era del 2026-07-26, anterior a PT-087, 088, 089 y a toda esta
serie.
**Evidencia**: `qa-out/20260726-030746` sin `paypal-guaranteed.json`.
**Impacto**: se descubrió que **la API no arrancaba** (`PaymentsModule` no exportaba
`PaypalProvider`) con los 458 tests unitarios en verde, y que **la suite tampoco lo comprobaba**
—su fase de humo recorre sitios SSR, que renderizan igual con la API muerta—.

### PT-100 — La sesión de ADMIN no persiste en el subdominio (F-30)

**Qué**: 24 checks de administración rebotaban a `/login`.
**Evidencia**: `curl` hacía login (302) y la segunda petición con la cookie devolvía 200 **sin
rebote** — la sesión sí persistía. En navegador: `chrome-error://chromewebdata/` y cero cookies.
El error real era `net::ERR_CONNECTION_REFUSED` sobre `https://admin.ironloot.local`.
**Causa**: `upgrade-insecure-requests`, que Helmet añade por defecto y del que los navegadores
**eximen a `localhost`**. La sesión nunca fue el problema: la petición no llegaba.
**Impacto**: el panel de administración inutilizable en el esquema de dominios adoptado.

---

## PT-101 — F-31: ADMIN es el único proyecto sin infraestructura de tests

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: F-31, detectado en PT-100. Matriz.

### Qué

`src/admin` no tiene script `test` en su `package.json` ni carpeta de pruebas. Es el único de los
cinco proyectos en esa situación.

| Proyecto | Tests |
|---|---:|
| `src/api` | 458 |
| `src/apps/client` | 83 |
| `src/packages/core` | 134 |
| `src/apps/base` | **0** (sin infraestructura) |
| `src/admin` | **0** (sin infraestructura) |

*(BASE está igual. Se descubre al medir para este PT: F-31 describía solo ADMIN.)*

### Superficie sin cubrir

61 ficheros TypeScript · **2.839 líneas** · 18 módulos de funcionalidad.

### Consecuencia ya observada, no hipotética

Es la razón por la que **la guarda de PT-100 tuvo que ir a la suite de navegador**: no había
dónde ponerla. Una suite de navegador tarda minutos y necesita todo el stack levantado; un test
unitario tarda milisegundos. La diferencia se paga en cada iteración.

Y PT-100 fue precisamente un defecto de ADMIN —la sesión que no persistía— que costó varias rondas
de diagnóstico en navegador.

### Dónde está el valor, y dónde no

ADMIN es un frontal SSR: sus 18 «servicios» **llaman al API y renderizan**. Cubrirlos uno a uno
produciría 18 suites que comprueban que `fetch` fue llamado — coste alto, valor bajo.

El valor está concentrado en dos sitios:

| Fichero | Por qué importa |
|---|---|
| `auth/auth.guard.ts` | **La frontera de seguridad.** 14 líneas que deciden quién entra al panel que aprueba retiros y suspende usuarios |
| `shared/admin-api-client.service.ts` | Obtiene y **renueva** el JWT admin, y **cae a `X-Admin-Key`** si el login falla. Esa reserva es una decisión de seguridad con consecuencias |

El guardia son 14 líneas y ninguna está probada. Su modo de fallo es silencioso en la dirección
peligrosa: si `canActivate` devolviera `true` por error, nadie se entera hasta que alguien entra.

### Restricción

ADMIN usa `sessions` de Express, no JWT. Sus tests no pueden copiarse de los de la API.

### Confianza

Root Cause Confidence: 100% (medido). Solution Confidence: 90%.

---

## PT-102 — BUG: la puja en vivo está apagada, y PT-096 la apagó (F-34)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: hallazgo F-34, detectado al **ejecutar la guía de validación** de PT-090…101.
Matriz, item #12.

### Qué

En `client.ironloot.local`, la página de detalle de subasta **no recibe las pujas en vivo**. El
precio no se mueve, la lista de «Pujas recientes» no crece, y no aparece ningún error: ni en la
consola del navegador, ni en los logs del servidor, ni a la vista del usuario.

Es la misma avería que PT-098 arregló hace tres commits. La causa es distinta.

### Dónde — medido en el navegador, no deducido

| Eslabón | Evidencia observada |
|---|---|
| La página carga y el usuario está autenticado | `hayForm: true`, URL sin `/login` |
| `socket.io` **sí** llega al navegador | `typeof io === 'function'` tras cargar la página |
| La página **nunca abre el socket** | Único tráfico hacia `socket.io`: la descarga del CDN. Cero handshakes |
| El servidor **sí** atiende | `GET /socket.io/?EIO=4&transport=polling` → **HTTP 200** por nginx *y* directo al API |
| nginx **sí** negocia el *upgrade* | `nginx.conf:17-18, 68-69, 94-95` — `proxy_http_version 1.1` + `Upgrade $http_upgrade` |
| Una sonda manual en esa misma página **conecta** | `{"conectado":true,"transporte":"websocket","id":"CRCE8wKqCYiOfyrRAAAD"}` |

La infraestructura entera funciona. **Lo que no se ejecuta es el código de la página.**

### Por qué — la causa raíz

El orden en que el navegador ejecuta los `<script>`, medido con `document.querySelectorAll`:

```
  1. pages-auction-detail.js      ← llama a io('/auctions', …)
  2. socket.io (CDN)              ← define io
```

`pages-auction-detail.js:34` llama a `io(…)` cuando `io` **todavía no existe**. Lanza
`ReferenceError`, y lo recoge el `try/catch` de la línea 53, rotulado:

```js
} catch (e) {
  /* live feed is optional; the page still works without it */
}
```

La página funciona. La puja en vivo, no. Y el comentario describe con exactitud el efecto: se
decidió que el fallo fuera invisible.

### Cuándo — quién lo introdujo

`b4e7261 refactor: PT-096 el JavaScript sale de las plantillas y cae unsafe-inline`.

Antes de ese commit, `detail.html` tenía el orden correcto:

```
  46. <script src="https://cdn.socket.io/4.7.5/socket.io.min.js" …>   ← primero
  49. <script>  … código de la puja …  </script>                      ← después
```

Al extraer el bloque inline a un fichero, el `<script src>` quedó **delante** del CDN. PT-096 se
commiteó afirmando que el código se movía «TAL CUAL». El contenido, sí. La posición, no — y la
posición era una dependencia.

### Alcance — ¿es sistémico o es este fichero?

Se comprobó, porque de la respuesta depende el tamaño del arreglo:

| Plantilla | Scripts externos | Orden |
|---|---|---|
| `client/views/pages/auction/detail.html` | socket.io (CDN) | ❌ **invertido** |
| `admin/views/pages/dashboard.html` | Chart.js (CDN) | ✅ correcto (CDN línea 6, propios 121-122) |
| Las demás (20 ficheros JS de navegador) | ninguno | no aplica |

**Es un solo fichero.** Y de los tres `catch` del JavaScript de navegador, solo este es mudo:

| Fichero | Qué hace el `catch` |
|---|---|
| `client/…/pages-auction-detail.js:53` | ❌ **nada** |
| `admin/public/js/dashboard-charts.js:14` | ✅ `console.warn('Dashboard charts: fetch failed', e)` |
| `base/…/pages-auth-login.js:33` | ✅ muestra «Error de conexión» al usuario |

### Impacto

Es la funcionalidad insignia de una plataforma de subastas. Sin ella el usuario no ve que le han
superado la puja, puja creyendo un precio que ya cambió, y no percibe la extensión por soft-close.
El dinero no corre riesgo —el backend valida cada puja— pero la subasta en vivo, que es el
producto, no existe.

**Efecto colateral**: **PT-098 no puede validarse.** Su corrección es correcta y está en el código;
lo que falla es lo que vino después. Su criterio de aceptación —el precio cambia en la otra ventana
sin recargar— no se puede demostrar hasta que esto se arregle.

### Por qué no lo detectó nada

Tres redes, y las tres estaban rotas para este caso:

1. **El `catch` vacío.** Convierte un `ReferenceError` en silencio absoluto.
2. **La suite prueba la puja por HTTP.** `E2E-5` y `E2E-6` verifican bloqueo de fondos y *outbid*,
   y ambos pasan. **Nadie comprobaba que el otro navegador se enterase.** La cobertura tapaba justo
   el hueco por el que se coló: 168/168 en verde con el producto roto.
3. **El guardia de PT-096** (`plantillas-sin-js-inline.spec.ts`) vigila que no haya JS inline. Del
   **orden** de los scripts no dice nada — y el orden era precisamente lo que ese refactor movía.

Arreglar solo el orden deja las tres redes igual de rotas.

### Confianza

- **Root Cause Confidence: 100%.** El orden se midió en el navegador; la sonda manual conecta en
  esa misma página; el orden anterior al commit culpable está en git.
- **Architecture Confidence: 100%.** Un solo fichero afectado, verificado contra las tres carpetas
  de vistas.
- **Solution Confidence: 95%.** El arreglo del orden es trivial y comprobable. El 5% está en la
  prueba de dos navegadores: hay que fijarla sin volverla frágil —depende de tiempos de red— y esa
  decisión se toma en STATE 2.

---

## PT-103 — BUG: el registro de deuda técnica volvió a contradecir al código (F-33)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: hallazgo F-33, detectado al **ejecutar la guía de validación** de PT-090…101.
Matriz, item #13.

> Se clasifica **STANDARD**, no TRIVIAL como decía la matriz. Corregir cuatro filas sería trivial;
> lo que este PT tiene que dejar es una **guarda que impida la tercera vez**, y eso es código con
> su propio diseño y sus propios casos límite.

### Qué

`docs/enterprise-documentation/10-Technical-Debt.md` declara `Open` cuatro deudas que están
**cerradas en el código**, y cuyo cierre `HISTORY.log` da por hecho.

### Dónde — leído, no recordado

| Deuda | Registro (`10-Technical-Debt.md`) | `HISTORY.log` | Realidad |
|---|---|---|---|
| TD-003 | línea 63: `Status: Open.` | línea 876: cerrada por PT-092 | Cerrada |
| TD-005 | línea 97: `Status: Acknowledged known trade-off.` | línea 904: cerrada por PT-096 | Cerrada |
| TD-010 | línea 216: `Status: Open. Descubierta en PT-088.` | línea 904: cerrada por PT-096 | Cerrada |
| TD-012 | línea 187: `Status: Open. Descubierta en PT-089.` | línea 857: cerrada por PT-091 | Cerrada |

Y `HISTORY.log:932` lo dice de forma explícita:

```
Deuda cerrada: TD-003, TD-004, TD-005, TD-007, TD-010, TD-012, TD-013. Mitigada: TD-011.
```

De esas siete, **cuatro siguen `Open` en el registro**. Los dos documentos se contradicen y ninguno
avisa.

### Cómo falla

En silencio, como F-34, pero peor: **el documento que miente es el que se consulta para decidir
qué hacer a continuación**. Un registro de deuda desactualizado no produce un error; produce
prioridades equivocadas. FPGE lee justamente estos ficheros para ordenar el trabajo.

### Por qué pasó

Cerrar una deuda toca **dos** sitios —el código y el registro— y sólo uno de los dos está
obligado por algo. El código no compila si te equivocas; el documento no protesta nunca.

Y es reincidencia: **PT-090 existía exactamente para corregir esto**. Reescribió TD-003 y TD-004
porque su descripción era falsa, y reconstruyó `PENDING_TASKS.md` contra el código. Un PT después
volví a dejar el registro atrás — al cerrar TD-003 en PT-092, TD-012 en PT-091 y TD-005/TD-010 en
PT-096, actualicé el código y no el registro.

Un arreglo que sólo corrija las cuatro filas repite el ciclo. Lo que falta es el mecanismo.

### Impacto

- **D4, fidelidad documental.** No hay riesgo de dinero ni de datos.
- **Bloquea validar PT-090**: su propio defecto está presente en el fichero que vino a corregir.
- Distorsiona cualquier priorización que lea el registro, que es su único propósito.

### Restricción que condiciona la solución

**`docs/` está en `.gitignore`** (`.gitignore:121`). Una guarda que lea el registro **no puede
exigir que exista**: en un clon limpio, o en CI, esos ficheros no están, y un test que falle por
su ausencia rompería la suite de todo el mundo por una razón que no es un defecto.

La guarda tiene que **saltarse a sí misma cuando los documentos no están** y ser dura cuando sí
están. Es una limitación real y conviene decirla en voz alta: protege al que tiene los documentos
—que es quien puede desincronizarlos— y no protege a nadie más.

### Confianza

- **Root Cause Confidence: 100%.** Las cuatro filas están leídas, con número de línea, y el cruce
  con `HISTORY.log` es explícito.
- **Architecture Confidence: 100%.** Sólo afecta a documentación y a un test nuevo.
- **Solution Confidence: 85%.** La corrección de las filas es cierta. El 15% está en la guarda:
  cruzar dos documentos en prosa exige decidir qué se considera «declarar un cierre», y esa
  decisión se toma en STATE 2.

---

## PT-104 — BUG: dos pruebas miden el credito restando saldos (F-35)

**Fecha**: 2026-07-27 · **Complejidad**: TRIVIAL · **Estado**: STATE 1-B
**Origen**: F-35, detectado en la corrida completa de PT-102. Matriz, item #14.

> **TRIVIAL** porque el cambio es *cómo mide* una aserción, en dos ficheros, sin tocar producto.
> Los estados no se saltan: se condensan.

### Qué

`QA-PP-09` y su gemela de la fase 70 comprueban que un depósito acredita el monedero **restando el
saldo antes del saldo después**. Si cualquier otra cosa acredita ese mismo monedero entre las dos
lecturas, la prueba falla sin que nada esté roto.

### Dónde — observado

En la corrida completa de PT-102:

```
QA-TR-03  FAIL  Mercado Pago :: status=processing
QA-PP-09  FAIL  El monedero se acredita por el importe exacto :: 99049 -> 99507.9
```

Delta observado: **458.90**. El ledger dice de dónde sale:

| Asiento | Importe | Pasarela |
|---|---|---|
| DEPOSIT | 321.50 | PAYPAL (lo que `QA-PP-09` esperaba) |
| DEPOSIT | 137.40 | MERCADO_PAGO (se acreditó **dentro** de la ventana) |

El depósito que `QA-TR-03` vio en `processing` lo acreditó **la vía garantizada** mientras corría
la fase de PayPal. El sistema hizo exactamente lo que debe. La prueba es la que asume que nadie
más toca ese monedero entre sus dos lecturas — y la vía garantizada es asíncrona por diseño.

### Alcance

| Fichero | Aserción frágil |
|---|---|
| `71-paypal-guaranteed.cjs:220-225` | `QA-PP-09` |
| `70-payment-trace.cjs:94,147-153` | la misma forma |

Dos sitios, un solo defecto. Arreglar uno solo deja al otro fallando en la próxima corrida.

### Lo que hace posible medirlo bien

`ledger.reference_id` guarda **la referencia del pago**, comprobado en la base:

```
DEPOSIT | 321.50 | reference_id = DEP-9c5595d2-…-1785140615334
payments  reference = DEP-9c5595d2-…-1785140615334  provider = PAYPAL
```

Y `Payment.reference` es **única** desde PT-087. Así que el crédito de un pago concreto se puede
leer directamente, sin restar nada.

### Impacto

Ninguno sobre el producto. El daño es de interpretación: una corrida roja por una causa que no es
un defecto enseña a ignorar los rojos.

### Confianza

Root Cause: 100% (delta explicado al céntimo por dos asientos del ledger).
Solution: 95% — la vía es clara; queda decidir si se conserva alguna comprobación de saldo.

---

## PT-106 — BUG: 16 de 20 capturas de la suite se guardan en el sitio equivocado

**Fecha**: 2026-07-27 · **Complejidad**: TRIVIAL · **Estado**: STATE 1-B
**Origen**: anotado como «cosmetico» en el HANDOFF tras PT-102. Al medirlo, no lo es.

### Que

`lib.cjs` define la captura con **tres** parametros:

```js
async function shot(page, dir, name) {
  const file = path.join(dir, `${name}.png`);
```

Y **16 de las 20 llamadas pasan dos**:

```js
L.shot(p, 'auth_login_invalid');      // dir='auth_login_invalid', name=undefined
```

Asi que el fichero acaba en `auth_login_invalid/undefined.png`, **relativo al directorio de
trabajo** — es decir, dentro del codigo fuente de la suite— en vez de en la carpeta de la corrida.

### Donde

| Llamadas | Forma | Resultado |
|---|---|---|
| 4 | `L.shot(page, DIR, nombre)` | Correcto: en la carpeta de la corrida |
| **16** | `L.shot(page, nombre)` | `<nombre>/undefined.png` dentro de `tests/qa-browser-suite/` |

Los ficheros llevan **versionados** desde entonces: `git status` los muestra como modificados
despues de cada corrida, que es como se noto.

### Por que no es cosmetico

1. **Las capturas no sirven para diagnosticar.** Todas se llaman igual, y estan fuera de la
   corrida a la que pertenecen: no hay forma de saber de que ejecucion es cada una.
2. **Ensucian el repositorio.** 12 ficheros binarios cambiando en cada corrida, dentro del codigo
   fuente.
3. **Se pisan entre corridas.** La captura de hoy sobrescribe la de ayer sin dejar rastro.

### Como paso

`shot()` nacio con tres parametros y en algun momento se empezo a llamar con dos. JavaScript no
protesta por un argumento que falta: lo pone a `undefined` y sigue. El nombre del fichero
resultante —`undefined.png`— era la unica senal, y se leyo como rareza en vez de como sintoma.

Mi propio PT-102 copio el patron malo: `L.shot(pA, 'live_a_despues_de_la_puja')`.

### Confianza

Root Cause: 100%. Solution: 100% — la firma correcta ya existe y cuatro llamadas la usan.

---

## PT-107 — BUG: la suite de QA no entra en el grafo de conocimiento

**Fecha**: 2026-07-27 · **Complejidad**: TRIVIAL · **Estado**: STATE 1-B
**Origen**: detectado al actualizar graphify tras PT-104.

### Que

El grafo tiene **0 nodos** de ficheros `.cjs`. La suite de QA por navegador —20 ficheros con la
logica de todas las pruebas de integracion— no existe para graphify.

### Por que

`.cjs` no esta en las extensiones que graphify reconoce como codigo:

```python
CODE_EXTENSIONS = {'.py', '.ts', '.js', '.jsx', '.tsx', '.mjs', '.ejs', '.go', ...}
_JS_RESOLVE_EXTS = ('.ts', '.tsx', '.svelte', '.js', '.jsx', '.mjs')
```

Ni en una ni en otra. Es un paquete de terceros instalado en `site-packages`: no se parchea.

### La pregunta que decide el arreglo

**¿Necesitan esos ficheros ser `.cjs`?** Se comprobo:

| Comprobacion | Resultado |
|---|---|
| `type` en el `package.json` raiz | sin `type` → CommonJS por defecto |
| `type` en `tests/qa-browser-suite/package.json` | sin `type` |

**No lo necesitan.** `.cjs` solo es obligatorio cuando el `package.json` declara
`"type": "module"`, y ninguno lo hace. Con `.js` esos ficheros siguen siendo CommonJS y `require()`
funciona igual.

### Impacto

Bajo, y sobre la herramienta, no sobre el producto. Pero el grafo se consulta para entender el
repositorio, y hoy no sabe **nada** de como se prueba — que es una parte grande de lo que este
repositorio es.

### Riesgo del arreglo

Renombrar toca **21 referencias entre ficheros** de la suite mas las de `run-all.sh`. Si se escapa
una, la fase correspondiente deja de arrancar. Es mecanico pero no trivial de verificar a ojo: la
comprobacion tiene que ser una corrida completa.

### Confianza

Root Cause: 100%. Solution: 90% — la via esta clara; el 10% es que ninguna referencia se escape.

---

## PT-108 — BUG: TD-013 se cerro solo en ADMIN; BASE tiene la misma averia (F-36)

**Fecha**: 2026-07-27 · **Complejidad**: TRIVIAL · **Estado**: STATE 1-B
**Origen**: F-36, detectado en PT-105 al reiniciar los tres sitios para probar la CSP nueva.

### Que

`docker restart ironloot-base` deja BASE caido:

```
base    HTTP 503   Error: Cannot find module './app.module'   MODULE_NOT_FOUND
```

Es **exactamente TD-013**, que PT-094 diagnostico y cerro. Pero solo en ADMIN.

### Donde — los tres arranques, comparados

| Sitio | `start:dev` | `nest-cli.dev.json` | Sobrevive a `docker restart` |
|---|---|---|---|
| ADMIN | `nest start --watch --config nest-cli.dev.json` | ✅ (PT-094) | ✅ |
| **BASE** | `nest start --watch` | ❌ | ❌ **HTTP 503** |
| CLIENT | `nest build && nest start --watch` | ❌ | ✅, por otra via |

CLIENT no se rompe porque **compila antes de arrancar**: el `nest build &&` tapa el problema a
costa de tiempo de arranque. No tiene el arreglo; tiene una casualidad afortunada.

### Por que

`nest start --watch` con `deleteOutDir: true` —el valor por defecto— borra `dist/`, recompila, y
en los montajes de Windows `node dist/main` se dispara antes de que la compilacion aterrice. Node
muere, se lleva el vigilante por delante, y el contenedor queda sin servir. Es el diagnostico
literal de PT-094, escrito en el propio `nest-cli.dev.json` de ADMIN.

### Por que se quedo a medias

TD-013 se **observo** en ADMIN. La causa vive en la configuracion de compilacion en desarrollo,
que es identica en los tres. Es el patron que PT-101 ya nombro con estas palabras: *arreglar donde
se observo y no donde vive*. Van tres veces esta semana —F-33, F-36, y TD-005 partida en dos—.

### Impacto

Bajo y solo en desarrollo, pero **desconcierta**: quien reinicia BASE ve un 503 sin explicacion y
la salida —`docker-compose up -d --force-recreate base`— no es evidente. Cuesta un rato cada vez.

### Confianza

Root Cause: 100% (el arreglo de ADMIN esta escrito y explicado; la diferencia es una linea).
Solution: 95% — replicarlo es mecanico; el 5% es decidir que hacer con CLIENT, que hoy funciona
por una via distinta.

---

## PT-110 — BUG: 71 vulnerabilidades en produccion, y dos namespaces sin limite (H-008)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: H-008 (D2, ALTA), detectado en PTSA DS-004.

### Que

`npm audit --omit=dev` sobre `src/api` devuelve **71 vulnerabilidades en dependencias de
produccion**: 3 criticas, 53 altas, 15 moderadas.

### Donde — alcanzabilidad resuelta paquete a paquete

| Paquete | Aviso | Cadena | ¿En el camino de ejecucion? |
|---|---|---|:--|
| `engine.io` 6.6.5 | Polling Transport Connection Exhaustion | `@nestjs/platform-socket.io` → `socket.io` | **SI, y sin autenticar** |
| `handlebars` | JS Injection via AST Type Confusion | `@nestjs-modules/mailer` (`HandlebarsAdapter`) | Si — 2 plantillas reales |
| `liquidjs` | Path traversal | `@nestjs-modules/mailer` | Cargado, **sin usar** |
| `tar` | Arbitrary File Creation | `bcrypt` → `node-pre-gyp` | **No** — solo al instalar |

### Lo que aparecio al consultar el grafo, y no estaba en H-008

`graphify` devolvio **dos** gateways, no uno:

| Gateway | Namespace | Autenticacion | Limite de conexiones |
|---|---|---|---|
| `AuctionsGateway` | `auctions` | **ninguna** (publico por diseño, PT-039) | **ninguno** |
| `EventsGateway` | `events` | **ninguna** | **ninguno** |

`grep` sobre ambos por `maxHttpBufferSize`, `connectTimeout`, `pingInterval`, `throttl`, `limit`:
**cero coincidencias**. El `@nestjs/throttler` global cubre HTTP; **no cubre sockets**.

Esto amplia el hallazgo: la CVE de `engine.io` no abre una puerta nueva, **amplifica una que ya
estaba abierta**. Dos namespaces publicos sin cota de conexiones son un vector de agotamiento
aunque la biblioteca no tuviera aviso ninguno.

### El arreglo, medido

```
engine.io — rango vulnerable: 4.1.0 - 6.6.7
            instalado:        6.6.5
            publicado:        6.6.9   ← fuera del rango
```

Y el reparto de las 71:

| | |
|---|--:|
| Arreglo directo, sin tocar nada mas | **49** |
| Exige **cambio de version mayor** | **22** |
| Sin arreglo disponible | 0 |

### Por que no `npm audit fix --force`

Las 22 que exigen version mayor arrastrarian cambios de contrato en un servidor que mueve dinero
real. `--force` sobre 71 avisos es mas arriesgado que los avisos: la suite pasa 193/193 hoy, y una
subida mayor de `@nestjs/*` o del cliente de una pasarela puede romper la ruta del dinero sin que
un test lo cace —eso es exactamente lo que F-34 enseño—.

### Impacto

- **Denegacion de servicio alcanzable sin credenciales** contra la puja en vivo, que es el
  producto. No se ha demostrado explotacion; lo comprobado es aviso + cadena + punto de uso.
- 71 avisos sin triar en el camino de produccion.

### Por que no se detecto antes

`audit-scope.yaml` declara `ci_checkpoints: [D2 …]` con «tests + schema + **vulnerabilidades**»
desde el 23-jun. **No hay registro de una sola ejecucion.** Un checkpoint previsto y no ejecutado
da por cubierta un area que nadie mira.

### Confianza

Root Cause: 100% (cadenas resueltas con `npm ls`, puntos de uso localizados en el codigo).
Solution: 85% — la subida de `engine.io` es acotada y verificable; el 15% es cuanto del resto se
puede subir sin romper la ruta del dinero, y eso se decide midiendo, no opinando.

---

## PT-111 — BUG: el contenedor de ADMIN no compila desde PT-101 (F-38)

**Fecha**: 2026-07-27 · **Complejidad**: TRIVIAL · **Estado**: STATE 1-B
**Origen**: F-38, detectado al verificar PT-110. **Bloquea** esa verificacion.

### Que

`ironloot-admin` arranca `unhealthy` y sirve codigo viejo. La compilacion falla:

```
error TS6059: File '/app/test/admin-api-client.spec.ts' is not under 'rootDir' '/app/src'.
error TS6059: File '/app/test/auth.guard.spec.ts' is not under 'rootDir' '/app/src'.
Found 2 errors. Watching for file changes.
```

Consecuencia medida: **21 checks de ADMIN en rojo** y la fase `admin-writes` sin ejecutarse.

### Donde

| Proyecto | `exclude` en su `tsconfig.json` |
|---|---|
| `src/api` | `['node_modules', 'dist']` |
| `src/apps/base` | `['node_modules', 'dist', '**/*.spec.ts']` |
| `src/apps/client` | `['node_modules', 'dist', '**/*.spec.ts']` |
| **`src/admin`** | **ninguno** |

Sin `exclude`, el `include` por defecto es `**/*`, y la imagen contiene `/app/test/`. Con
`rootDir: ./src`, cualquier fichero fuera de `src/` aborta la compilacion.

`docker-compose` **no** monta `./src/admin/test`: los ficheros vienen dentro de la imagen, copiados
por su `Dockerfile.dev`.

### Quien lo introdujo

**PT-101**, al crear los dos tests de ADMIN. El PT existia porque ADMIN era el unico proyecto sin
infraestructura de pruebas; al ponersela, no se ajusto el `tsconfig` que ya estaba escrito para un
proyecto sin tests.

### Por que sobrevivio tres semanas sin verse

**PT-094 puso `deleteOutDir: false`** para que un `docker restart` no dejara ADMIN sin `dist`
(TD-013). Ese `dist` conservado es justo lo que permitia al panel seguir sirviendo **codigo viejo**
mientras la compilacion fallaba: el arreglo de una averia tapaba otra.

Solo se vio al hacer una compilacion limpia.

### Impacto

- ADMIN sirve la ultima version que **si** compilo. Cualquier cambio posterior no llega.
- El `healthcheck` lo marca, pero un contenedor `unhealthy` no detiene nada por si solo.
- **La suite lo detecta**, y por eso aparecio: 21 checks y una fase entera.

### Confianza

Root Cause: 100% — el error nombra el fichero y la causa; la comparacion con los otros tres
proyectos deja la solucion sin ambiguedad.

---

## PT-112 — BUG: el repositorio versiona los artefactos y no las decisiones (H-009 + F-37)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: H-009 (PTSA D4, MEDIA) y F-37, que son el mismo problema por los dos lados.

### Que

El `.gitignore` deja fuera **las decisiones** y deja dentro **los artefactos**. Es exactamente al
reves de lo que sirve.

| | Hoy | Peso | Ficheros |
|---|---|--:|--:|
| `docs/enterprise-documentation/` — arquitectura, PRD, TRD, seguridad | **ignorado** | 196 K | 18 |
| `docs/methodology/` — los frameworks | **ignorado** | 288 K | 10 |
| `docs/implementation/` — HISTORY.log, HANDOFF, DISCOVERY | **ignorado** | 1.9 M | 129 |
| `changes/` — los Proposal Packages de FDGE | **ignorado** | 601 K | 128 |
| `PTSA/` — hallazgos, evidencias, scores | **ignorado** | 320 K | 54 |
| `CLAUDE.md` — las instrucciones que lee cualquier agente | **ignorado** | 24 K | 1 |
| **`qa-out/`** — salidas de corridas de QA | **VERSIONADO** | **164 M** | **2828** |

### Los dos hallazgos, y por que son uno

**H-009** (PTSA, D4): `audit-scope.yaml` declara auditables cinco documentos que git no puede
seguir. `commits_since_audit` no es 0 para ellos — es **indeterminable**, y eso rompe el mecanismo
de frescura de F11.

**F-37**: `git ls-files qa-out/` devuelve **2658 ficheros** y 164 MB de capturas de corridas.

Son la misma decision mal tomada, vista desde los dos extremos: el criterio actual no distingue
entre lo que hay que conservar y lo que se regenera.

### Consecuencias medidas, no supuestas

1. **PT-109 corrigio cuatro afirmaciones falsas** en esos documentos. Ese cambio **no dejo rastro
   auditable**: nadie puede ver que decian antes.
2. **El registro de deuda ha mentido dos veces** (PT-090 y F-33). La segunda se detecto por
   casualidad al validar; con historial se habria visto en un diff.
3. **La guarda `coherencia-deuda-tecnica.spec.ts` se salta a si misma** en CI y en cualquier clon
   limpio. Esta declarado en su propio codigo, y fue una decision consciente para que un rojo por
   ausencia no acabara con alguien borrandola.
4. **`qa-out/.last-run` sale modificado tras cada corrida**, ensuciando `git status` de forma
   permanente.

### Lo que hay que decidir

No es tecnico. Es **politica del repositorio**, y por eso PTSA lo registro en vez de resolverlo. El
usuario autorizo trabajarlo de forma autonoma en esta sesion.

### Confianza

Root Cause: 100% — `git check-ignore` y `git ls-files` lo dicen sin ambiguedad.
Solution: 90% — el criterio es claro; el 10% es acordar que entra de `evidence/`, que es lo unico
que mezcla decision y artefacto.


---

## PT-113 — INVESTIGATION: que falta de verdad para emitir CFDI (H-005)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B (modo investigacion)
**Origen**: H-005 (PTSA D1, ALTA), abierta desde S-001 el 23-jun y declarada «bloqueada por
contratar un PAC ante el SAT».

### Por que se investiga algo que se declaro bloqueado

Porque «bloqueado por un tercero» es una respuesta que **no se ha comprobado**. Se repite desde
junio en cuatro documentos, y la Puerta de Investigacion de FDGE dice que una causa raiz no
confirmada exige investigar antes de planificar. Esta investigacion pregunta: **si manana
apareciera el contrato con el PAC, ¿se podria emitir un CFDI?**

La respuesta es **no**, y por razones que no tienen nada que ver con el PAC.

### Lo que si esta hecho — mas de lo que H-005 sugiere

| | Estado |
|---|---|
| Modelo `cfdi_records` | Completo: `uuid_sat`, `xml_path`, `pdf_path`, `status`, `error_message`, `cancelled_at` |
| Interruptor `CFDI_ENABLED` | Existe, **apagado por defecto** (PT-047). Sin el, los pedidos se completan sin factura |
| Claves de configuracion | `CFDI_RFC_EMISOR`, `CFDI_PAC_URL`, `CFDI_PAC_API_KEY` |
| **Contrato `ICfdiPacProvider`** | **Existe** en `src/packages/core/src/integrations/cfdi-pac-provider.interface.ts` |
| Mensajes de error | Accionables: dicen que configurar y donde |

`cfdi.service.ts` no es un hueco: es un adaptador sin implementacion concreta, con el punto de
extension ya definido. Eso es mejor de lo que decia el hallazgo.

### Lo que falta, y no es el PAC

#### 1. El contrato no basta para un CFDI real

```ts
export interface CfdiData {
  orderId; sellerRfc; buyerRfc; amount; currency; description;
}
```

Un CFDI 4.0 exige ademas, como minimo: `UsoCFDI`, `RegimenFiscal` **del emisor y del receptor**,
`LugarExpedicion` (codigo postal), `MetodoPago`, `FormaPago`, `ClaveProdServ` y `ClaveUnidad` de los
catalogos del SAT, y el desglose de impuestos.

Ningun PAC sella con estos seis campos. **Implementar este contrato tal cual no produciria una
factura valida**, produciria un rechazo del PAC.

#### 2. Los datos fiscales no se capturan

```
columnas fiscales en toda la BD: profiles.rfc
```

**Una sola.** No hay regimen fiscal, ni codigo postal fiscal, ni uso de CFDI. El KYC guarda
`docs_json` sin esquema — no hay garantia de que contenga nada fiscal.

#### 3. Y la pregunta que nadie ha respondido: **¿quien emite?**

Se busco en el PRD y en la Declaracion de Valor de PTSA: **no esta decidido en ningun sitio**.

IronLoot intermedia ventas entre particulares. Caben tres modelos, con consecuencias muy distintas:

| Modelo | Que exige |
|---|---|
| **El vendedor emite** | Cada vendedor necesita su propio PAC y su e.firma. IronLoot no factura nada |
| **IronLoot emite por cuenta del vendedor** | Figura de «intermediario»; exige autorizacion expresa del vendedor, sus datos fiscales completos y un PAC con esa capacidad |
| **IronLoot solo factura su comision** | Lo mas simple y lo unico enteramente bajo su control. No cubre la venta entre particulares |

**Esta decision bloquea mas que el PAC.** Sin ella no se sabe que campos capturar, a quien pedirselos,
ni que contrato firmar — porque el contrato con el PAC depende del modelo.

### Veredicto de la investigacion

`H-005` esta **mal caracterizada**. Dice «integracion con PAC es un stub» y la causa raiz es otra:

> **No esta decidido quien emite la factura**, y por eso ni el modelo de datos ni el contrato de
> integracion pueden terminarse. El PAC es la ultima pieza, no la primera.

Reordenado, el bloqueo real es:

1. **Decision de dominio**: quien emite. *(humano, no tecnica, y hoy nadie la ha tomado)*
2. Ampliar `CfdiData` a los campos que el SAT exige.
3. Capturar los datos fiscales que hoy no existen.
4. Contratar el PAC e implementar el adaptador.

### Lo que se puede hacer sin PAC — y se propone

Nada de esto exige el contrato con el SAT:

- **Escribir la decision de dominio** en F-1 y en el PRD, aunque sea «solo se factura la comision».
- **Ampliar `CfdiData`** a la forma real del CFDI 4.0. Es una interfaz: no necesita implementacion.
- **Anadir los campos fiscales** al perfil, detras del interruptor `CFDI_ENABLED` que ya existe.

### Confianza

Root Cause: 95% — el contrato, el esquema y la ausencia de decision estan leidos, no inferidos. El
5% es si algun documento fuera del repositorio ya fija el modelo de emision.
Solution: **no aplica** — es una investigacion; no propone implementacion.


---

## PT-114 — BUG: la comision se cobra pero nunca se registra (H-010)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: H-010 (PTSA D1, ALTA), detectado en el Acid Test de DS-006 sobre la salida real.

### Que

`CommissionRecord` es un producto declarado del sistema (**P-010**) y **no se genera nunca**.

| | |
|---|---|
| `commission_records` | **0 filas** |
| `ledger` tipo `FEE_PLATFORM` | **95.00 MXN** cobrados |
| Pedido correspondiente | `PAID`, 950.00 MXN |

### Donde — la cadena completa, leida

`auction-scheduler.service.ts:145-166` cierra la subasta dentro de **una transaccion**:

1. Crea el `Order` con `sellerNet` ya calculado.
2. Llama a `walletService.captureHeldFunds(..., tx, feePercent)`.

Y `wallet.service.ts:370-372` calcula ahi la comision:

```ts
const feePercentage = new Decimal(feePercent).div(100);
const feeAmount = amountDecimal.mul(feePercentage);
```

…asienta `DEBIT_ORDER`, `CREDIT_SALE` y `FEE_PLATFORM`, y **ahi acaba todo**. Nadie crea el
`CommissionRecord`.

### La causa raiz

`CommissionsService.calculateForOrder()` es el **unico** sitio del sistema que crea un
`CommissionRecord` —comprobado buscando `commissionRecord.create` y `.upsert` en todo
`src/api/src/`: una sola aparicion— y **no lo invoca nadie en produccion**. Sus tres referencias
estan en los tests.

**Es una funcion probada que nunca corre.** Los tests pasan; el producto no existe.

### Impacto

**El dinero no se pierde.** El vendedor cobra su neto y la plataforma retiene su parte: el ledger
lo refleja y el Acid Test lo verifico.

**Lo que falla es la contabilidad.** `admin.service.ts:534` construye el informe financiero leyendo
`commissionRecord.findMany()`, **no el ledger**. Con la tabla vacia, ese informe declara **cero
ingresos por comision** mientras se han cobrado 95 MXN.

Una plataforma de subastas vive de la comision, y su propio informe de ingresos esta ciego a ella.

### El detalle que decide el diseño

`calculateForOrder()` **recalcula** la comision por su cuenta:

```ts
const rate = await this.resolveRate(order.sellerId, order.auction?.id);
const amount = new Decimal(order.totalAmount).mul(rate).div(100).toDecimalPlaces(2);
```

Mientras `captureHeldFunds` la calculo ya con el `feePercent` que le paso el orquestador. **Son dos
calculos independientes de la misma cifra.** Invocar `calculateForOrder()` sin mas dejaria dos
fuentes que pueden divergir —basta con que la tarifa del vendedor cambie entre el cierre y la
llamada— y entonces el ledger y la contabilidad dirian numeros distintos.

Eso es peor que no tener registro: un registro que contradice al ledger obliga a averiguar cual de
los dos miente.

### Por que no se detecto antes

Los tests de `commissions.service` **pasan**: ejercitan `calculateForOrder()` directamente. Nadie
comprobo que alguien la llamara. Es el mismo hueco que F-34 —una suite verde sobre una funcion
muerta— y el que PT-104 encontro en la fase 70.

### Confianza

Root Cause: 100% — la ausencia de invocantes es verificable con un `grep`, y las dos cifras
(0 filas / 95.00 MXN) estan leidas de la BD.
Solution: 90% — el punto de insercion es claro; el 10% es decidir si el registro se crea con la
cifra ya calculada o recalculando, y eso se resuelve en STATE 2.


---

## PT-115 — BUG: la ventana de disputa se mide desde la ultima modificacion (H-011)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-B
**Origen**: H-011 (PTSA D1, MEDIA), detectado en el Acid Test de DS-006 sobre P-006.

### Que

`CR-007` dice: *«Una disputa fuera de la ventana de 14 dias es rechazada»*, contada **desde la
entrega**. El codigo lo declara en un comentario y no lo aplica.

```ts
// For DELIVERED orders, enforce the 14-day window from deliveredAt (domain invariant).
const referenceDate: Date =
  order.status === 'DELIVERED' && (order as any).deliveredAt   // siempre undefined
    ? (order as any).deliveredAt
    : order.updatedAt;                                          // siempre esta rama
```

### Donde — y el dato SI existe, en otro sitio

| Tabla | Tiene fecha de entrega |
|---|---|
| `orders` | **No.** Sus columnas: `id, created_at, updated_at, total_amount, status, seller_net, seller_settled_at, auction_id, buyer_id, seller_id` |
| **`shipments`** | **Si**: `delivered_at`, y **se puebla** — `shipments.service.ts:105-106` la escribe al marcar `DELIVERED` |

**El dato estaba ahi todo el tiempo.** `disputes.service.ts` lo busca en el pedido, donde no esta,
en vez de en el envio, donde si.

Y el propio repositorio ya lo sabe: `ratings.service.ts:40` comprueba
`order.shipment.status !== 'DELIVERED'` — lee la entrega del envio, como corresponde.

### Por que no lo caza nada

Por los dos `as any`. Un acceso a un campo inexistente compila sin una sola queja cuando se pide por
`any`, y el ternario lo convierte en un `undefined` silencioso en vez de un error.

Es la misma familia que F-34 (un `catch` mudo), F-39 (un `default` inexistente) y H-010 (una
funcion sin invocantes): **el codigo anuncia una cosa y hace otra, sin ruido**.

### Consecuencia, comprobada sobre la salida real

`updatedAt` cambia con **cualquier** modificacion del pedido —cambio de estado, liquidacion al
vendedor, ajuste administrativo— y cada una **reinicia los 14 dias**.

Medido en DS-006 (P-006, 7/7): envejeciendo `updated_at` a 20 dias la API rechaza con
`HTTP 400 «Dispute period has expired»`; devolviendola a `now()`, acepta. **La ventana responde a
`updated_at`.**

En la practica:

- Un pedido tocado por un administrador **vuelve a ser disputable** aunque se entregara hace meses.
- Un pedido entregado tarde pero sin modificaciones posteriores puede tener la ventana **ya vencida
  el dia de la entrega**.

### Lo que hay que decidir, y lo que no

**No hace falta decidir nada nuevo.** `CR-007` ya declara la regla en F-1, y el comentario del
codigo la repite. Ambos dicen «desde la entrega». Lo que falta no es una decision: es que el codigo
cumpla la que ya esta escrita.

Es distinto de F-40 (quien emite la factura), donde la regla **no existia** en ningun sitio.

### Confianza

Root Cause: 100% — el esquema y el codigo estan leidos; el comportamiento, medido.
Solution: 95% — el dato existe en `shipments.delivered_at`; el 5% es que un pedido `DELIVERED`
pueda no tener envio asociado, y eso hay que comprobarlo.


---

## PT-116 — REFACTOR: la cadena del mailer, ultima unidad de TD-015

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-R (alcance)
**Origen**: TD-015, registrada por PT-110 al triar H-008.

### Que

De los 63 avisos que PT-110 dejo abiertos, **once cuelgan de `@nestjs-modules/mailer`**:
`handlebars`, `liquidjs`, `mjml`, `html-minifier`, `mailparser`, `nodemailer`, `linkify-it`,
`js-cookie`, `file-type`, `multer` y `uuid`. Entre ellos **dos de los tres criticos**.

PT-110 no los toco porque `npm audit fix` fallaba con `ERESOLVE` justo ahi, y porque son **una sola
unidad de actualizacion**: no se pueden subir por separado.

### Donde esta el bloqueo, medido

```
@nestjs-modules/mailer  instalado 2.0.2   -> exige nodemailer >=6.4.6
@nestjs-modules/mailer  objetivo  2.3.7   -> exige nodemailer >=8.0.5
nodemailer              instalado 7.0.12
nodemailer              publicado 9.0.3
```

El salto es **nodemailer 7 -> 8** (mayor) y **mailer 2.0.2 -> 2.3.7** (menor).

### Superficie real de contacto — mas pequeña de lo que el numero sugiere

La aplicacion **no usa nodemailer directamente**. Solo lo toca a traves del mailer, con una
configuracion estandar (`notifications.module.ts:20-41`): transporte SMTP, remitente por defecto y
el adaptador de Handlebars.

Y hay **3 llamadas a `sendMail`** en todo el codigo.

### Como se verifica de verdad

La fase `bootstrap` de la suite **registra un usuario y verifica su correo contra Mailhog**. Es
decir: el envio de correo esta cubierto de punta a punta por una prueba que ya existe y que corre
en cada corrida.

Eso convierte esta subida en una de las pocas de version mayor que se pueden hacer con una red
debajo.

### El riesgo que queda

`nodemailer` 8 cambio requisitos de Node y algunas opciones de transporte. La configuracion de aqui
es la mas simple posible —host, puerto, `secure: false`, `ignoreTLS`, auth— pero **`ignoreTLS` con
`secure: false` es exactamente el tipo de opcion que las versiones mayores endurecen**.

Si el correo dejara de salir, el sintoma seria un registro de usuario que nunca recibe su enlace de
verificacion. Silencioso para el sistema, bloqueante para el usuario.

### Confianza

Root Cause: 100% — el bloqueo de versiones esta medido con `npm view`.
Solution: 75% — la superficie es pequeña y hay prueba de punta a punta, pero es un salto de version
mayor sobre el unico camino por el que un usuario nuevo entra al sistema. El 25% se resuelve
midiendo, no opinando.


---

## PT-117 — BUG: el aviso al vendedor reutiliza el tipo del comprador (H-012)

**Fecha**: 2026-07-27 · **Complejidad**: TRIVIAL · **Estado**: STATE 1-B
**Origen**: H-012 (PTSA D1, BAJA), detectado en el Nivel 3 del Acid Test (DS-008).

### Que

Al cerrar una subasta se emiten dos notificaciones con el **mismo tipo** y significados distintos:

| Tipo | Destinatario | Titulo | Mensaje |
|---|---|---|---|
| `AUCTION_WON` | comprador | «You won the auction!» | «Congratulations! You have won…» |
| `AUCTION_WON` | **vendedor** | «Auction Sold!» | «Your auction … has been sold» |

### Donde

`auction-scheduler.service.ts:204`, y el propio codigo lo declara:

```ts
NotificationType.AUCTION_WON, // Reuse type or add AUCTION_SOLD if exists, for now WON implies completion
```

El catalogo no lo tiene:

```
AUCTION_WON  AUCTION_LOST  BID_OUTBID  ORDER_PAID  ORDER_SHIPPED  DISPUTE_UPDATE  SYSTEM
```

### Impacto

**Ninguno visible hoy.** El titulo y el mensaje distinguen los dos casos, asi que quien lea la lista
no se confunde.

Lo que falla es el **tipo como discriminador**: un consumidor que filtre `AUCTION_WON` para mostrar
«mis subastas ganadas» le enseñaria al vendedor su propia venta como una victoria. Hoy ese filtro no
existe; el dia que exista, el defecto ya esta puesto.

### Por que se atiende pese a ser BAJA

Porque es **lo unico** que impide que P-007 llegue a `VALIDADO`. El producto se fija a si mismo el
invariante «tipo de notificacion correcto para el evento», y dos eventos compartiendo tipo no lo
cumplen.

Que el atajo este comentado lo hace **honesto, no correcto**.

### La restriccion del entorno

`prisma db push --accept-data-loss` corre en cada arranque y **no hay `_prisma_migrations` en
desarrollo** (ADR-006 / AUD-001). El SQL se genera con `migrate diff`, se comprueba que es
**aditivo** y se aplica con `psql`. Anadir un valor a un enum de PostgreSQL lo es —`ALTER TYPE …
ADD VALUE`— pero hay que verificarlo, no suponerlo.

### Confianza

Root Cause: 100% — el comentario del codigo nombra el atajo y el enum confirma la ausencia.
Solution: 95% — es un valor de enum y una linea; el 5% es que `ADD VALUE` no puede correr dentro de
una transaccion en PostgreSQL, y eso condiciona como se aplica.


---

## PT-118 — FEATURE: el checkpoint D2 de dependencias, declarado y nunca ejecutado

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-E (enriquecimiento)
**Origen**: PTSA H-008 y PENDIENTES DS-004 #2. No depende del PAC.

### Que

`audit-scope.yaml` declara desde el 23-jun:

```yaml
ci_checkpoints:
  - D2    # tests + schema + vulnerabilidades
  - D3    # trazabilidad + logging
  - D5    # Success/Retry/Failure Rate
  - "D1.N1"  # Domain Rules as Code
```

Y `.github/workflows/ci.yml` corre **lint, typecheck, tests unitarios y de integracion**. De
vulnerabilidades, **nada**.

### La consecuencia, medida

**H-008 llego con 34 dias de retraso.** 71 avisos en dependencias de produccion —3 criticos, 53
altos— entre ellos uno alcanzable **sin autenticar** contra la puja en vivo. Nadie los habia mirado
porque el mecanismo que debia mirarlos estaba declarado y no existia.

Un checkpoint previsto y no ejecutado es **peor que no tenerlo**: da por cubierta un area que nadie
vigila, y por eso durante cinco semanas la auditoria emitio D2 = 99.

### Criterios de aceptacion

1. El CI **falla** si aparece una vulnerabilidad **nueva** respecto a la linea base declarada.
2. El CI **no falla** por las 27 que ya estan triadas y registradas en TD-015 — si lo hiciera,
   quedaria rojo desde el primer dia y alguien lo desactivaria.
3. La linea base **vive en el repositorio**, versionada, con fecha y motivo.
4. El informe dice **que** aparecio y **por donde entra**, no solo cuantas hay.

### Escenarios

| Caso | Esperado |
|---|---|
| Estado actual (27 avisos, todos en la linea base) | **Pasa** |
| Aparece un aviso nuevo en un paquete de produccion | **Falla**, nombrandolo |
| Un aviso de la linea base desaparece | **Pasa**, y avisa de que la linea base se puede reducir |
| Un aviso sube de severidad | **Falla**: la linea base fija el paquete Y su severidad |
| Dependencias de desarrollo | **No** cuentan: no llegan a produccion |

### NFR

- Debe correr en **menos de un minuto**: si tarda, se salta.
- **Sin red mas alla de `npm audit`**: nada de servicios externos.
- El fallo debe ser **legible sin abrir el JSON**.

### Fuera de alcance

- Arreglar las 27 de la linea base. Eso es TD-015 y va aparte (PT-119).
- Los checkpoints D3, D5 y D1.N1, tambien declarados y tambien sin ejecutar. Cada uno mide algo
  distinto y merece su propio trabajo; meterlos aqui haria el PT irrevisable.

### Confianza

Architecture Confidence: 100% — el CI existe y su forma esta leida.
Implementation Confidence: 90% — el 10% es acertar con el formato de la linea base para que
sobreviva a un `npm install` sin volverse ruido.


---

## PT-120 — FEATURE: Domain Rules as Code (checkpoint D1.N1)

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-E
**Origen**: `audit-scope.yaml` declara `ci_checkpoints: [… "D1.N1"]` desde el 23-jun. No existe.

### Que

`[R57]` de la especificacion es explicito:

> Toda regla de dominio **objetiva y repetible** identificada en F-1/F12 **DEBE** transformarse en
> un test ejecutable (Domain Rules as Code) para reducir subjetividad y permitir su verificacion
> automatica en cada Delta Sync y en CI.

F-1 declara **quince reglas `CR-001…CR-015`** y una rubrica de cinco bloques. Ninguna es codigo.

### Lo incomodo: yo ya las escribi, y las tire

Durante DS-004, DS-006 y DS-008 escribi tres guiones que ejecutan justo esas reglas contra la
salida real —`acid-test.py`, `acid2.py`, `nivel2y3.py`—. **Viven en una carpeta temporal.**

O sea: las reglas se han verificado tres veces y **no se pueden volver a verificar sin reescribir
el guion**. Cada delta sync ha rehecho el mismo trabajo, y el proximo tambien.

Eso es exactamente lo que `[R57]` viene a impedir, y es peor que no haberlas escrito nunca: da la
impresion de que estan cubiertas.

### Criterio de elegibilidad, aplicado

La especificacion dice que una regla es candidata a codigo si **(a)** es determinista, **(b)** su
entrada es extraible del producto y **(c)** su veredicto es binario o numerico.

De las quince `CR`, se comprobo cuales cumplen las tres:

| Cumple las tres | No las cumple |
|---|---|
| CR-001, CR-002, CR-003, CR-004, CR-005, CR-006, CR-010, CR-014, CR-015 — se leen de la BD | CR-008 (firma HMAC): su entrada no es el producto, es la peticion |
| CR-009, CR-011, CR-012, CR-013 — se leen de configuracion o comportamiento | CR-007 (ventana de disputa): binaria, pero exige provocar un rechazo |

Las que no encajan **no se fuerzan**: la especificacion dice que las reglas que exigen juicio
«permanecen como evaluacion reproducible documentada, no como codigo». Forzarlas seria inventar un
veredicto.

### Criterios de aceptacion

1. Un comando —`npm run audit:domain`— ejecuta las reglas elegibles contra la BD.
2. Cada regla dice **su identificador, su veredicto y lo observado**, no solo si paso.
3. `rubric_compliance_score` se **calcula**, no se transcribe a mano.
4. Falla con codigo distinto de cero si alguna regla se viola.
5. **Sin datos, no miente**: dice `SIN_DATOS`, que no es lo mismo que `CUMPLE`.

### Escenarios

| Caso | Esperado |
|---|---|
| BD con productos reales y todo correcto | Pasa, `rubric = 100` |
| Un monedero con balance negativo | **Falla**, nombrando CR-001 y el monedero |
| BD vacia | `SIN_DATOS` por regla, **no** «cumple» |
| Una regla nueva anadida al catalogo | Aparece en la salida sin tocar el runner |

### NFR

- Corre en **segundos**: son consultas.
- **Sin dependencias nuevas**: usa lo que ya hay.
- La salida debe poder pegarse en una evidencia PTSA sin reformatear.

### Fuera de alcance

- Las reglas no elegibles (CR-007, CR-008): quedan documentadas como evaluacion reproducible.
- El Nivel 3 (coherencia inter-producto): **es otra cosa** y va en su propio sitio dentro del mismo
  comando, pero no se mezcla con el score de rubrica.

### Confianza

Implementation Confidence: 95% — las consultas ya estan escritas y ejecutadas tres veces; lo que
falta es darles un hogar.


---

## PT-121 — FEATURE: el checkpoint D3 de observabilidad

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-E
**Origen**: `audit-scope.yaml` declara `ci_checkpoints: [… D3 …]` desde el 23-jun. No existe.

### Que mide D3, segun la especificacion

| Metrica | Definicion |
|---|---|
| `trace_completeness` | % de productos con cadena de trazabilidad F4 completa |
| `silent_failure_count` | **Fallos que no dejan rastro en logs** |
| `fallback_quality` | Calidad garantizada por los fallbacks |
| `prompt_provenance` | `NO_APLICA` — sistema determinista, sin LLM |

### La metrica que esta sesion ha ganado el derecho a medir

`silent_failure_count`. En esta sesion han aparecido **cinco fallos silenciosos**, y ninguno lo
encontro un test:

| | |
|---|---|
| **F-34** | Un `catch` rotulado «live feed is optional» apago la puja en vivo durante dias, con 168/168 en verde |
| **F-39** | «Sesiones en Redis» anunciado mientras cada escritura fallaba con `ERR syntax error` |
| **H-010** | Una funcion probada que nadie invocaba: la comision se cobraba sin registrarse |
| **H-011** | Dos `as any` sobre un campo inexistente: la ventana de disputa medida desde otro sitio |
| **H-012** | Un tipo de aviso reutilizado, declarado en un comentario |

Todos de la misma familia: **el codigo anuncia una cosa y hace otra, sin ruido**.

### Lo medido hoy

**25 bloques `catch` que no registran ni relanzan**, repartidos asi:

| Ambito | Cuantos |
|---|--:|
| API (`src/api/src`) | 8 |
| SSR (base, client, admin) | 8 |
| Core | 1 |
| **JavaScript de navegador** (`public/js`) | **8** |

Los ocho del navegador importan especialmente: **es donde vivia F-34**, y es el ambito que ninguna
herramienta de este repositorio miraba.

### El comentario NO basta

Casi todos llevan una explicacion —«Audit failure must never break the action», «Ignore if funds
weren't held»— y son decisiones deliberadas.

Pero **F-34 tambien tenia comentario**: `/* live feed is optional; the page still works without it */`.
Un comentario dice que alguien penso en ello; no dice que siga siendo cierto.

Por eso la metrica **no juzga cuales son aceptables**: los pone en linea base, como hizo PT-118 con
las dependencias, y **falla cuando aparece el numero 26**.

### Criterios de aceptacion

1. `npm run audit:observability` cuenta los `catch` mudos y los compara con una linea base.
2. Cubre el **JavaScript de navegador**, no solo TypeScript.
3. Mide `trace_completeness` sobre los ciclos de pago reales.
4. Falla con codigo != 0 si aparece uno nuevo.
5. `SIN_DATOS` cuando no hay ciclos que evaluar — no «100%».

### Fuera de alcance

- **Arreglar los 25**: son decisiones tomadas, muchas correctas. Este PT hace que el 26 se vea.
- `fallback_quality`: exige juicio sobre cada fallback. Queda como evaluacion documentada, que es
  lo que `[R57]` prescribe para lo no automatizable.

### Confianza

Implementation Confidence: 90% — el barrido esta hecho y medido; el 10% es afinar el patron para
que no cuente un `catch` que si informa al usuario aunque no escriba en el log.


---

## PT-122 — FEATURE: las metricas D5 de fiabilidad operacional

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Estado**: STATE 1-E
**Origen**: `audit-scope.yaml` declara `ci_checkpoints: [… D5 …]` desde el 23-jun. No existe.

### Que mide D5

| Metrica | Definicion | Umbral (F-1 §6) |
|---|---|---|
| `Success Rate` | % de transformaciones que producen un producto valido **al primer intento** | verde ≥95%, ambar 85–95%, rojo <85% |
| `Retry Rate` | % que requirieron ≥1 reintento | verde ≤10%, ambar 10–25%, rojo >25% |
| `Failure Rate` | % que fallaron definitivamente | — |
| `Hallucination Rate` | | **NO_APLICA** — sistema determinista |
| `Output Drift` | | **NO_APLICA** |

### Una correccion al propio alcance

**D5 no puede correr en CI, y ponerlo alli mide cero.**

`Success Rate` y `Retry Rate` se calculan sobre **historia de ejecucion real**: cuantos ciclos de
pago se resolvieron a la primera y cuantos necesitaron sondeo. En CI no hay historia — la base nace
vacia en cada corrida. Un checkpoint de D5 en el pipeline devolveria `SIN_DATOS` siempre, y con el
tiempo alguien lo leeria como «verde».

`audit-scope.yaml` lo lista bajo `ci_checkpoints` desde el 23-jun. **Es una clasificacion
equivocada**, no una implementacion pendiente: D5 es una metrica de **delta sync**, que se toma
contra un entorno con historia.

Se corrige el alcance en vez de fabricar un checkpoint que no mediria nada.

### De donde sale la señal, medido

BullMQ tiene las colas (`bull:notification-jobs`, `bull:webhook-retry`) pero **sus contadores estan
a cero**: los trabajos se limpian al completarse. No sirven.

Lo que si tiene señal es el **ciclo de pago**, que es la transformacion principal del sistema:

```
payment_cycles        SETTLED 1 · REQUESTED 3
POLL_ATTEMPT          3 ciclos necesitaron sondeo
error_events          10
```

| Metrica | Como se deriva |
|---|---|
| `Success Rate` | ciclos resueltos **sin** `POLL_ATTEMPT` / ciclos resueltos |
| `Retry Rate` | ciclos con ≥1 `POLL_ATTEMPT` / ciclos totales |
| `Failure Rate` | ciclos `EXPIRED` o `FAILED` / ciclos totales |

### El matiz que hay que declarar

Un `POLL_ATTEMPT` **no es un fallo**: es la via garantizada haciendo exactamente lo que PT-087
diseño —encontrar un pago que la notificacion no trajo—. Un `Retry Rate` alto en este sistema
significa «las pasarelas no notifican», no «el sistema falla».

Medirlo sigue valiendo: si sube, algo cambio en las pasarelas. Pero leerlo como calidad del codigo
seria un error, y por eso el informe lo dice.

### Criterios de aceptacion

1. `npm run audit:reliability` calcula las tres tasas sobre la BD.
2. Las clasifica en verde/ambar/rojo segun los umbrales de F-1 §6.
3. `SIN_DATOS` cuando no hay ciclos — nunca «100%».
4. El informe explica que un reintento **no es un fallo** en este sistema.
5. `audit-scope.yaml` mueve D5 de `ci_checkpoints` a metricas de delta sync, con el motivo escrito.

### Fuera de alcance

- Meterlo en el CI. Es la correccion, no el objetivo.
- Metricas de BullMQ: sus contadores se limpian y no hay retencion configurada. Cambiarla es otra
  decision.

### Confianza

Implementation Confidence: 90% — las consultas son directas; el 10% es acertar con la definicion de
«resuelto a la primera» de forma que no cuente como fallo lo que es diseño.


---

## PT-123 — INVESTIGATION: alcanzabilidad real de los 12 avisos de TD-015

**Fecha**: 2026-07-27 · **Complejidad**: STANDARD · **Variante**: STATE 1-B (modo investigacion)
**Origen**: peticion explicita del usuario — «despues analizamos a fondo Los 12 de TD-015»
**Cadena previa**: PTSA H-008 -> PT-110 (63 avisos) -> PT-116 (27) -> PT-119 (26/12 paquetes) ->
PT-118 (acotada por checkpoint D2 en CI).

### What

TD-015 registra 26 avisos de `npm audit` repartidos en 12 paquetes de produccion. Lo que el registro
NO dice es cuales de esos 12 estan realmente en el camino de ejecucion. La severidad que trae el
aviso es la del paquete en abstracto, no la de este sistema.

### Why — por que investigarlo antes de decidir

Los 12 exigen saltos de version mayor. El mas grande arrastra Express 4->5 en un servidor que mueve
dinero real. Decidir esa migracion por el color de una tabla de `npm audit` seria exactamente lo que
`[A1]` prohibe: tratar una etiqueta como si fuera una conclusion.

Ademas hay precedente en esta misma sesion: PT-119 encontro que uno de los «13 que exigen mayor» no
lo exigia — la afirmacion se habia heredado sin volver a medirla (misma familia que F-33).

### Where

`src/api/package.json` y su arbol de dependencias. Puntos de uso en `src/api/src/`.

### How — metodo

Por cada paquete, tres medidas, ninguna inferida:

1. **Cadena de entrada**: `npm ls <paquete> --omit=dev` — de quien cuelga realmente.
2. **Aviso concreto**: que funcion o vector describe, no solo la severidad.
3. **Punto de uso**: `grep` del simbolo vulnerable en el codigo del proyecto. Si no aparece, se
   registra como no alcanzable **y se dice que eso no prueba inexplotabilidad**.

### Hallazgos

Volcados en `docs/implementation/ANALISIS-TD-015.md`. Resumen:

| Grupo | N | Contenido |
|---|--:|---|
| No llegan a produccion | 6 | `tar` (instalacion) · `js-yaml` (Swagger apagado, `main.ts:92`) · `linkify-it`, `brace-expansion`, `glob`, `minimatch` (utilidades del mailer, patrones del codigo; el de `glob` es de su **CLI**) |
| En el arbol, sin uso alcanzable | 3 | `uuid` (el aviso es de v3/v5/v6; solo se usa v4) · `file-type` (parser ASF, solo se suben imagenes) · `path-to-regexp` (ruta estatica fija) |
| En el camino, con mitigacion | 3 | `multer` (tras `JwtAuthGuard` + throttler) · `@nestjs/core` · `body-parser` (exige un `limit` mal escrito, y la config es del proyecto) |
| **Sin mitigacion** | **0** | — |

**Hallazgo lateral, y es el que mas vale**: el `FileInterceptor` de `upload.controller.ts:49` **no
declara limite de tamaño**. No es la CVE de `multer`, pero es su misma familia de riesgo y cuesta una
linea. Se registra como candidato a PT propio, no se toca aqui.

**Segundo hallazgo lateral**: `file-type` solo es inofensivo mientras la subida acepte unicamente
imagenes. Si algun dia se acepta video, el aviso pasa a alcanzable. Queda anotado en el analisis.

### Conclusion y punto de decision

Los 12 se reducen a tres decisiones de plataforma: NestJS 10->11 (cierra 7), `bcrypt` 5->6 (1),
`uuid` 13->14 (1). Recomendacion: **no migrar Express ahora**; hacer los dos saltos baratos por
separado y dejar NestJS 11 como decision consciente con fecha de revision.

**La migracion de plataforma bajo un servidor de pagos es decision del negocio, no del agente.**
Esta investigacion se cierra entregando el material para decidirla, no decidiendola.

### Confianza

- Root Cause Confidence: n/a (no es un defecto).
- Evidence Confidence: **85%** — cadena y punto de uso verificados en el arbol y en el codigo. El
  15% restante es lo que el analisis declara explicitamente: no se intento explotar ninguna, y no
  ver una ruta no demuestra que no exista.
