# IronLoot — Plataforma de Subastas en Línea

**Versión:** 1.0.0  
**Entorno:** Desarrollo local con Docker  
**Stack:** NestJS · PostgreSQL · Redis · Nginx · Mailhog

---

## Tabla de Contenidos

1. [¿Qué es IronLoot?](#1-qué-es-ironloot)
2. [Arquitectura — cinco servicios](#2-arquitectura--cinco-servicios)
3. [Prerrequisitos de instalación](#3-prerrequisitos-de-instalación)
4. [Configuración inicial (una sola vez)](#4-configuración-inicial-una-sola-vez)
5. [Cómo levantar el stack](#5-cómo-levantar-el-stack)
6. [URLs de acceso — referencia completa](#6-urls-de-acceso--referencia-completa)
7. [Cómo funcionan los correos electrónicos](#7-cómo-funcionan-los-correos-electrónicos)
8. [Cuentas de usuario — cómo crearlas](#8-cuentas-de-usuario--cómo-crearlas)
9. [Panel de Administración](#9-panel-de-administración)
10. [Mapa completo de páginas y rutas](#10-mapa-completo-de-páginas-y-rutas)
11. [Reglas de negocio relevantes para QA](#11-reglas-de-negocio-relevantes-para-qa)
12. [Autenticación y cookies — notas para QA](#12-autenticación-y-cookies--notas-para-qa)
13. [Acceso a la base de datos](#13-acceso-a-la-base-de-datos)
14. [Diagnóstico y logs](#14-diagnóstico-y-logs)
15. [Solución de problemas frecuentes](#15-solución-de-problemas-frecuentes)

---

## 1. ¿Qué es IronLoot?

IronLoot es una **plataforma de subastas en línea** donde compradores compiten en tiempo real con pujas para ganar artículos que los vendedores publican. Sus características principales son:

- **Registro y verificación de cuentas** por correo electrónico
- **Subastas con ciclo de vida completo**: Borrador → Publicada → Activa → Cerrada
- **Pujas en tiempo real** mediante WebSockets (el precio se actualiza en todos los navegadores simultáneamente)
- **Wallet (monedero digital)** para depositar fondos, retiros y mantener el historial de movimientos
- **Soft-close automático**: si alguien puja en los últimos 2 minutos, la subasta se extiende otros 2 minutos para dar oportunidad de contra-pujar
- **Órdenes y envíos** generados automáticamente al cerrar la subasta
- **Disputas** abiertas hasta 14 días después de la entrega
- **Panel de administración** para gestión operativa completa
- **Pagos reales** vía Mercado Pago y PayPal (sandbox en entorno de desarrollo)

---

## 2. Arquitectura — cinco servicios

IronLoot corre como cinco contenedores Docker independientes, más infraestructura:

```
┌──────────────────────────────────────────────────────────────────┐
│                      NGINX (puerto 80)                           │
│            Enruta el tráfico según el subdominio                 │
└──────┬───────────┬──────────────┬───────────────┬───────────────┘
       │           │              │               │
       ▼           ▼              ▼               ▼
  base.localhost  client.localhost  admin.localhost  api.localhost
  puerto 5174     puerto 5175       puerto 3001      puerto 3000
  (sitio público) (portal privado)  (backoffice)     (REST API)
```

| Servicio | Descripción | Puerto directo | Subdominio Nginx |
|---|---|---|---|
| **BASE** | Sitio público: home, catálogo de subastas, login, registro | 5174 | `base.localhost` |
| **CLIENT** | Portal privado: dashboard, wallet, órdenes, perfil, vendedor | 5175 | `client.localhost` |
| **ADMIN** | Backoffice operacional: usuarios, subastas, pagos, reportes | 3001 | `admin.localhost` |
| **API** | REST API + WebSockets (backend de datos) | 3000 | `api.localhost` |
| **DB** | PostgreSQL 16 | 5432 | — |
| **Redis** | Cache y sesiones | 6379 | — |
| **Mailhog** | Servidor SMTP para captura de emails de prueba | 8025 (UI) / 1025 (SMTP) | — |

> **CORE** (`packages/core/`) es una librería TypeScript compartida, no tiene puerto ni contenedor propio.

---

## 3. Prerrequisitos de instalación

### Software requerido

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Docker Desktop | 24.x | `docker --version` |
| Docker Compose | v2 (incluido en Docker Desktop) | `docker compose version` |

No se necesita Node.js ni npm instalados en la máquina anfitriona para correr el proyecto. Todo corre dentro de Docker.

### Archivo hosts del sistema operativo

Para que los subdominios (`base.localhost`, `client.localhost`, etc.) funcionen en el navegador, hay que registrarlos en el archivo de hosts una sola vez.

**Windows** — abrir Notepad como Administrador y editar:
```
C:\Windows\System32\drivers\etc\hosts
```

**Linux / macOS** — editar con sudo:
```
sudo nano /etc/hosts
```

Añadir al final del archivo:

```
# IronLoot — desarrollo local
127.0.0.1  base.localhost
127.0.0.1  client.localhost
127.0.0.1  admin.localhost
127.0.0.1  api.localhost
```

> **Opcional — solo si se prueba la conmutación de tráfico (Nginx redirects):**
> ```
> 127.0.0.1  ironloot.local
> 127.0.0.1  base.ironloot.local
> 127.0.0.1  client.ironloot.local
> 127.0.0.1  admin.ironloot.local
> 127.0.0.1  api.ironloot.local
> ```
> Estas entradas solo son necesarias para probar los redirects 301 de Nginx.  
> Para las pruebas funcionales normales **no son necesarias**.

---

## 4. Configuración inicial (una sola vez)

### 4.1 Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd IronLoot
```

### 4.2 Crear el archivo de variables de entorno

El archivo `.env` ya existe en la raíz del repositorio y en `api/.env`. Si no existe, crear uno a partir del ejemplo:

```bash
# Raíz del monorepo
cp .env.example .env

# API
cp api/.env.example api/.env
```

Los valores por defecto del `.env.example` son suficientes para correr el entorno local sin modificar nada.

### 4.3 Verificar las variables críticas en `api/.env`

Abrir `api/.env` y confirmar que estas variables están presentes:

```env
DATABASE_URL=postgresql://ironloot:ironloot_dev@localhost:5432/ironloot_db?schema=public
JWT_SECRET=gVhWufw77SwrICrpSAXKWP4htd1G7XSVvJEK1Wm5EAF
JWT_ACCESS_EXPIRY=15m
COOKIE_DOMAIN=
COOKIE_SAMESITE=Lax
COOKIE_SECURE=false
ALLOWED_ORIGINS=http://localhost:5173,http://base.localhost,http://base.localhost:5174,http://client.localhost,http://client.localhost:5175,http://admin.localhost,http://localhost:3001
```

> **Nota sobre `COOKIE_DOMAIN`**: dejarlo **vacío** (`COOKIE_DOMAIN=`) es el valor correcto para el entorno local. Docker Compose usa `localhost` como valor por defecto cuando la variable está vacía. Si el SSO entre subdominios no funciona en Chrome, cambiar a `COOKIE_DOMAIN=.ironloot.local` y usar las entradas de hosts del apartado opcional.

---

## 5. Cómo levantar el stack

### Levantar todo

```bash
docker compose up -d
```

Esto arranca todos los servicios en segundo plano. La primera vez tarda varios minutos porque Docker descarga las imágenes base y compila los servicios.

### Verificar que todo está corriendo

```bash
docker compose ps
```

Todos los servicios deben mostrar estado `Up` (no `Exit` ni `Restarting`). La lista esperada:

```
ironloot-nginx    Up      0.0.0.0:80->80/tcp
ironloot-api      Up      0.0.0.0:3000->3000/tcp
ironloot-base     Up      0.0.0.0:5174->5174/tcp
ironloot-client   Up      0.0.0.0:5175->5175/tcp
ironloot-admin    Up      0.0.0.0:3001->3001/tcp
ironloot-db       Up      0.0.0.0:5432->5432/tcp
ironloot-redis    Up      0.0.0.0:6379->6379/tcp
ironloot-mailhog  Up      0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

### Detener el stack

```bash
docker compose down
```

### Reiniciar un servicio específico (cuando hay cambios de código)

```bash
# Reiniciar solo el servicio BASE
docker compose restart base

# Reiniciar CLIENT — USAR ESTE PROCEDIMIENTO ESPECÍFICO (no restart)
docker compose stop client && docker compose rm -f client && docker compose up -d client

# Reiniciar la API
docker compose restart api
```

> **IMPORTANTE para CLIENT**: el servicio CLIENT requiere un procedimiento especial de reinicio. No usar `docker compose restart client` porque falla al arrancar en frío. Usar siempre el procedimiento `stop → rm -f → up -d`.

### Ver los logs en tiempo real

```bash
# Todos los servicios
docker compose logs -f

# Un servicio específico
docker compose logs -f api
docker compose logs -f base
docker compose logs -f client
```

---

## 6. URLs de acceso — referencia completa

### 6.1 URLs principales para pruebas funcionales

> Estas son las URLs que el equipo de QA debe usar para todas las pruebas funcionales.

| Servicio | URL | Descripción |
|---|---|---|
| **Sitio público (BASE)** | `http://base.localhost` | Home, catálogo de subastas, login, registro |
| **Portal privado (CLIENT)** | `http://client.localhost` | Dashboard, wallet, órdenes, perfil, vendedor |
| **Panel de admin (ADMIN)** | `http://admin.localhost` | Backoffice operacional |
| **API directa** | `http://localhost:3000` | REST API backend |
| **Swagger (documentación API)** | `http://localhost:3000/docs` | Explorador interactivo de endpoints |
| **Mailhog (correos)** | `http://localhost:8025` | Bandeja de entrada de prueba — aquí llegan TODOS los correos |

### 6.2 URLs por puerto directo (sin Nginx)

Si el proxy Nginx no está disponible, se puede acceder directamente al puerto de cada servicio:

| Servicio | URL directa |
|---|---|
| BASE | `http://localhost:5174` |
| CLIENT | `http://localhost:5175` |
| ADMIN | `http://localhost:3001` |
| API | `http://localhost:3000` |

### 6.3 URLs opcionales para pruebas de Nginx redirects

Estas URLs solo funcionan si se añadieron las entradas `ironloot.local` al archivo hosts:

| URL | Redirige a | Código HTTP |
|---|---|---|
| `http://ironloot.local/` | `http://base.ironloot.local/` | 301 |
| `http://ironloot.local/auctions` | `http://base.ironloot.local/auctions` | 301 |
| `http://ironloot.local/auth/login` | `http://base.ironloot.local/auth/login` | 301 |
| `http://ironloot.local/dashboard` | `http://client.ironloot.local/dashboard` | 301 |
| `http://ironloot.local/wallet` | `http://client.ironloot.local/wallet` | 301 |
| `http://ironloot.local/orders` | `http://client.ironloot.local/orders` | 301 |
| `http://ironloot.local/profile` | `http://client.ironloot.local/profile` | 301 |
| `http://ironloot.local/seller/auctions` | `http://client.ironloot.local/seller/auctions` | 301 |

### 6.4 Resumen rápido para pegar en el browser

```
# Sitio público
http://base.localhost

# Iniciar sesión
http://base.localhost/auth/login

# Registrarse
http://base.localhost/auth/register

# Portal privado (requiere sesión activa)
http://client.localhost/dashboard

# Wallet
http://client.localhost/wallet

# Panel de administración
http://admin.localhost

# Correos de prueba (Mailhog)
http://localhost:8025

# API Swagger
http://localhost:3000/docs
```

---

## 7. Cómo funcionan los correos electrónicos

### No llega ningún correo real al buzón de Gmail ni a ningún proveedor externo

En el entorno de desarrollo, **todos los correos son capturados por Mailhog**, un servidor SMTP simulado que funciona como bandeja de entrada de prueba.

### Cómo revisar los correos

1. Abrir `http://localhost:8025` en el navegador
2. Todos los correos enviados por la aplicación aparecen en esa bandeja de entrada
3. Los correos se listan en orden cronológico (el más reciente primero)
4. Hacer clic en un correo para ver su contenido completo (HTML o texto plano)

### Tipos de correos que genera la aplicación

| Evento | Asunto aproximado | ¿Cuándo llega? |
|---|---|---|
| Registro de usuario | "Verifica tu correo electrónico" | Inmediatamente al registrarse |
| Recuperación de contraseña | "Restablece tu contraseña" | Al solicitar recovery desde el formulario |
| Notificaciones de puja (si activadas) | Varía | Cuando alguien puja en una subasta seguida |

### Cómo obtener el link de verificación de un correo

1. Ir a `http://localhost:8025`
2. Hacer clic en el correo de verificación
3. En la vista del correo, hay un botón "HTML" o el link está visible en el cuerpo del mensaje
4. Copiar el link completo que contiene `?token=` y abrirlo en el navegador

> **Nota:** Los correos en Mailhog persisten mientras el contenedor esté corriendo. Al detener y volver a levantar el stack con `docker compose down && docker compose up -d`, Mailhog vuelve a estar vacío.

---

## 8. Cuentas de usuario — cómo crearlas

### No existe un usuario de prueba precargado

La base de datos comienza vacía (sin usuarios). Todas las cuentas deben crearse a través del flujo de registro normal de la aplicación.

### Paso a paso: crear una cuenta de comprador

1. Ir a `http://base.localhost/auth/register`
2. Completar el formulario con:
   - **Nombre de usuario** (único, sin espacios)
   - **Email** (puede ser cualquier dirección ficticia: `qa-buyer@ironloot.test`, `prueba@example.com`, etc.)
   - **Contraseña** (mínimo 8 caracteres)
3. Enviar el formulario → la aplicación muestra la pantalla "revisa tu correo"
4. Ir a Mailhog (`http://localhost:8025`) y buscar el correo de verificación
5. Hacer clic en el link de verificación dentro del correo
6. La cuenta queda con estado **ACTIVE** y puede iniciar sesión

### Paso a paso: iniciar sesión

1. Ir a `http://base.localhost/auth/login`
2. Ingresar el email y contraseña registrados
3. Al hacer login exitoso, la aplicación redirige automáticamente a `http://client.localhost/dashboard`

### Roles de usuario

| Rol | Descripción | Cómo obtenerlo |
|---|---|---|
| **BUYER (comprador)** | Puede ver subastas, pujar, gestionar wallet, crear órdenes, abrir disputas | Es el rol por defecto al registrarse |
| **SELLER (vendedor)** | Además de BUYER: puede crear y gestionar subastas, ver sus ventas | Completar el formulario de onboarding en `/seller/onboarding` (dentro de CLIENT) |

> Un mismo usuario puede ser BUYER y SELLER a la vez.

### Estados de una cuenta de usuario

| Estado | Descripción | Puede iniciar sesión |
|---|---|---|
| `PENDING_VERIFICATION` | Registrada pero email no verificado | No |
| `ACTIVE` | Email verificado, cuenta operativa | Sí |
| `SUSPENDED` | Suspendida por el administrador | No |
| `BANNED` | Bloqueada permanentemente | No |

Un usuario en estado `PENDING_VERIFICATION` que intenta hacer login recibe un mensaje de error indicando que debe verificar su correo.

### Cuentas sugeridas para el equipo de QA

Crear estas cuentas antes de iniciar las pruebas (seguir el flujo de registro de arriba):

| Alias | Email sugerido | Contraseña | Rol a alcanzar |
|---|---|---|---|
| BUYER-1 | `qa-buyer1@ironloot.test` | `Test1234!` | BUYER (por defecto) |
| BUYER-2 | `qa-buyer2@ironloot.test` | `Test1234!` | BUYER (por defecto) |
| SELLER-1 | `qa-seller1@ironloot.test` | `Test1234!` | SELLER (completar onboarding) |

> Usar correos con el dominio `@ironloot.test` para identificarlos fácilmente en Mailhog. Cualquier dirección funciona porque Mailhog captura todos los correos sin importar el dominio.

---

## 9. Panel de Administración

### URL

`http://admin.localhost`

### Credenciales de acceso

| Campo | Valor |
|---|---|
| **Usuario** | `admin` |
| **Contraseña** | `admin` |

> Estos valores son los valores por defecto del entorno de desarrollo. Están configurados como variables de entorno en `docker-compose.yml`:
> ```
> ADMIN_USERNAME=admin
> ADMIN_PASSWORD=admin
> ```

### Qué puede hacer el administrador

El panel de administración tiene 18 módulos funcionales organizados en secciones:

**Usuarios**
- Ver la lista completa de usuarios registrados
- Cambiar el estado de una cuenta (suspender, banear, activar)
- Ver el detalle de un usuario: perfil, wallet, historial de pujas

**Subastas**
- Ver todas las subastas con cualquier estado (DRAFT, ACTIVE, CLOSED, etc.)
- Cancelar o suspender subastas manualmente
- Ver el historial de pujas de una subasta

**Pagos y Finanzas**
- Revisar el historial de pagos y transacciones
- Ver el estado de depósitos pendientes o fallidos

**Órdenes**
- Gestionar órdenes post-subasta
- Registrar actualizaciones de estado de envíos

**Disputas**
- Ver todas las disputas activas
- Tomar decisiones de resolución (a favor del comprador o vendedor)

**Logs y Auditoría**
- Ver el log inmutable de eventos del sistema (AuditEvent)
- Revisar errores del sistema (ErrorEvent)
- Ver el historial de peticiones HTTP (RequestLog)

**Diagnóstico**
- Panel de métricas básico del sistema
- Solo disponible en entorno de desarrollo

---

## 10. Mapa completo de páginas y rutas

### 10.1 BASE — Sitio público (`http://base.localhost`)

Estas páginas son accesibles **sin necesidad de estar autenticado**:

| Ruta | Descripción |
|---|---|
| `/` | Home con las últimas 6 subastas activas |
| `/auctions` | Listado completo de subastas (paginado, con búsqueda) |
| `/auctions/:id` | Detalle de una subasta: precio actual, historial de pujas, countdown, formulario de puja |
| `/auth/login` | Formulario de inicio de sesión |
| `/auth/register` | Formulario de registro de nueva cuenta |
| `/auth/recovery` | Solicitar recuperación de contraseña (ingresa el email) |
| `/auth/reset-password?token=...` | Formulario de nueva contraseña (accedido desde el correo) |
| `/auth/verify-email?token=...` | Verificación de cuenta (accedido desde el correo) |
| `/auth/verify-email-pending` | Pantalla "revisa tu correo" (post-registro) |
| `/about` | Página institucional "Acerca de" |
| `/privacy` | Política de privacidad |
| `/terms` | Términos de uso (redirige con 301 a `/static/terms`) |
| `/static/terms` | Términos de uso (URL canónica) |

### 10.2 CLIENT — Portal privado (`http://client.localhost`)

Estas páginas **requieren sesión activa**. Sin cookie de sesión válida, todas redirigen a `http://base.localhost/auth/login`.

**Sección Comprador:**

| Ruta | Descripción |
|---|---|
| `/dashboard` | Resumen: balance, últimas pujas, subastas activas |
| `/profile` | Perfil del usuario autenticado |
| `/settings` | Preferencias y configuración de cuenta |
| `/my-bids` | Historial de pujas del comprador (paginado) |
| `/auctions/won-auctions` | Subastas ganadas (órdenes como comprador) |
| `/auctions/watchlist` | Subastas en seguimiento |
| `/wallet` | Balance disponible y retenido |
| `/wallet/deposit` | Formulario para agregar fondos (Mercado Pago / PayPal) |
| `/wallet/withdraw` | Formulario para retirar fondos |
| `/wallet/history` | Historial de movimientos del wallet (paginado) |
| `/payments` | Historial de pagos (débitos de órdenes y créditos de ventas) |
| `/orders` | Lista de órdenes del comprador (paginado) |
| `/orders/:id` | Detalle de una orden: estado, envío, monto |
| `/notifications` | Lista de notificaciones del sistema |
| `/disputes` | Lista de disputas abiertas o cerradas |
| `/disputes/create` | Formulario para abrir una nueva disputa |
| `/disputes/create?orderId=...` | Igual que arriba con la orden pre-seleccionada |
| `/disputes/:id` | Detalle de una disputa |
| `/reputation` | Puntuación de reputación del usuario |

**Sección Vendedor:**

| Ruta | Descripción |
|---|---|
| `/seller/onboarding` | Formulario para activar el rol de vendedor |
| `/seller/auctions` | Mis subastas como vendedor (paginado) |
| `/seller/orders` | Mis órdenes como vendedor (paginado) |
| `/auctions/create` | Formulario para crear una nueva subasta |
| `/auctions/:id/edit` | Formulario para editar una subasta (solo si estado es DRAFT) |

**Cierre de sesión:**

| Ruta | Descripción |
|---|---|
| `/auth/logout` | Elimina la cookie de sesión y redirige a `http://base.localhost/auth/login` |

### 10.3 ADMIN — Backoffice (`http://admin.localhost`)

| Ruta | Descripción |
|---|---|
| `/login` | Formulario de login del administrador |
| `/` | Dashboard con estadísticas generales |
| `/users` | Gestión de usuarios |
| `/auctions` | Gestión de subastas |
| `/bids` | Revisión de pujas |
| `/orders` | Gestión de órdenes |
| `/payments` | Historial de pagos |
| `/wallet` | Revisión de wallets |
| `/disputes` | Gestión de disputas |
| `/notifications` | Revisión de notificaciones |
| `/ratings` | Calificaciones comprador/vendedor |
| `/shipments` | Seguimiento de envíos |
| `/audit` | Log inmutable de auditoría |
| `/logs` | Historial de peticiones HTTP |
| `/errors` | Log de errores del sistema |
| `/diagnostics` | Panel de diagnóstico (solo desarrollo) |

### 10.4 API — Endpoints principales (`http://localhost:3000`)

Explorar con Swagger en `http://localhost:3000/docs`. Los prefijos de los módulos son:

| Módulo | Prefijo |
|---|---|
| Auth | `/api/v1/auth/...` |
| Usuarios | `/api/v1/users/...` |
| Subastas | `/api/v1/auctions/...` |
| Pujas | `/api/v1/bids/...` |
| Wallet | `/api/v1/wallet/...` |
| Pagos | `/api/v1/payments/...` |
| Órdenes | `/api/v1/orders/...` |
| Envíos | `/api/v1/shipments/...` |
| Disputas | `/api/v1/disputes/...` |
| Calificaciones | `/api/v1/ratings/...` |
| Notificaciones | `/api/v1/notifications/...` |
| Watchlist | `/api/v1/watchlist/...` |
| Health check | `/api/v1/health` |

---

## 11. Reglas de negocio relevantes para QA

### Ciclo de vida de una subasta

```
DRAFT → PUBLISHED → ACTIVE → CLOSED
```

| Estado | Descripción |
|---|---|
| `DRAFT` | Creada por el vendedor. Solo visible para el vendedor. Editable. |
| `PUBLISHED` | Publicada. Visible en el catálogo. Esperando la fecha de inicio. |
| `ACTIVE` | Aceptando pujas. El precio se actualiza en tiempo real. |
| `CLOSED` | Finalizada. Ganador determinado. Orden creada automáticamente. |
| `CANCELLED` | Cancelada antes de que nadie pujara. |
| `SUSPENDED` | Suspendida por administración. |

### Reglas de pujas

- Una puja **debe superar el precio actual** (no se acepta puja igual al precio vigente)
- El comprador **no puede pujar en su propia subasta**
- El comprador **necesita fondos suficientes** en wallet para pujar (el monto se reserva como `held_funds` hasta que la subasta cierre o sea superado)
- Solo se acepta pujas cuando la subasta está en estado `ACTIVE`
- Si el mismo comprador hace una segunda puja en la misma subasta, la primera se cancela y solo cuenta la nueva

### Soft-close (extensión automática)

Cuando alguien puja en los **últimos 120 segundos** antes del cierre, la subasta se extiende 120 segundos adicionales desde el momento de esa puja. Esto puede suceder indefinidamente si los competidores siguen pujando justo antes del cierre.

Este comportamiento es configurable con la variable `AUCTION_SOFT_CLOSE_WINDOW_SEC=120` en `api/.env`.

### Wallet — fondos retenidos vs disponibles

| Concepto | Descripción |
|---|---|
| `balance` | Fondos disponibles: se pueden retirar o usar para pujar |
| `held_funds` | Fondos bloqueados en pujas activas: no se pueden retirar |
| `total` | `balance + held_funds` — dinero total en la cuenta |

Cuando alguien puja:
- Los fondos se mueven de `balance` a `held_funds`
- Si es superado por otra puja, los fondos regresan a `balance` automáticamente
- Al ganar la subasta, los `held_funds` se convierten en el pago de la orden

### Disputas

- Ventana de apertura: **14 días** después de la entrega confirmada
- Configurable con `DISPUTE_WINDOW_DAYS=14` en `api/.env`
- Solo el comprador puede abrir una disputa
- La resolución la toma el administrador desde el panel de admin

### Expiración de pagos pendientes

Un pago iniciado pero no completado expira a las **72 horas**. Configurable con `PAYMENT_EXPIRATION_HOURS=72` en `api/.env`.

### Moneda

Toda la plataforma opera exclusivamente en **MXN (pesos mexicanos)**. No hay soporte multi-moneda.

### Token JWT y expiración de sesión

- El token de acceso (cookie `access_token`) expira a los **15 minutos** de ser emitido
- Al navegar por CLIENT, el sistema renueva automáticamente el token al detectar que expiró
- Si el token expiró y no se puede renovar (sesión invalidada), CLIENT redirige al login en BASE

### Límites de tasa (rate limiting)

| Operación | Límite en desarrollo |
|---|---|
| Login (`POST /auth/login`) | 60 intentos por minuto |
| Registro (`POST /auth/register`) | 60 intentos por minuto |
| Resto de endpoints | 100 peticiones por minuto por IP |

> En producción los límites son mucho más estrictos (5 para login, 3 para registro).

---

## 12. Autenticación y cookies — notas para QA

### Cómo funciona el login (patrón BFF)

El proceso de login **no es un formulario HTML tradicional** que envía al servidor. Funciona así:

1. El usuario llena el formulario en `http://base.localhost/auth/login`
2. El formulario hace un `POST` a `/api/v1/auth/login` en el mismo dominio (BASE actúa como proxy)
3. BASE recibe la respuesta del API, extrae el JWT y lo guarda en una **cookie HttpOnly** llamada `access_token`
4. BASE redirige automáticamente a `http://client.localhost/dashboard`
5. CLIENT lee la cookie para autenticar todas las peticiones al API

### Por qué la cookie es HttpOnly

La cookie `access_token` tiene el atributo `HttpOnly`, lo que significa que **el código JavaScript del navegador no puede leerla**. Esto es una medida de seguridad para evitar robo de sesión mediante XSS.

Para verificarlo: en la consola del navegador (F12), ejecutar `document.cookie` — el token **no debe aparecer**.

### Cómo inspeccionar las cookies en el navegador

1. Abrir DevTools (F12)
2. Ir a la pestaña **Application** (Chrome) o **Storage** (Firefox)
3. Sección **Cookies** en el panel izquierdo
4. Hacer clic en `http://base.localhost` o `http://client.localhost`

Los atributos esperados de la cookie `access_token`:

| Atributo | Valor esperado |
|---|---|
| `Name` | `access_token` |
| `Domain` | `localhost` (o `.ironloot.local` si se configuró) |
| `HttpOnly` | `✓` (marcado) |
| `SameSite` | `Lax` |
| `Secure` | vacío (es HTTP local, no HTTPS) |

### SSO entre subdominios (BRECHA-K)

El sistema está diseñado para que la cookie emitida en `base.localhost` sea reconocida en `client.localhost` (Single Sign-On entre subdominios). Este comportamiento ha sido verificado programáticamente (curl) y está **pendiente de validación en browser real con Chrome ≥ 90**.

**Si el SSO no funciona en Chrome** (el dashboard redirige al login después de hacer login en BASE):

1. Actualizar `api/.env`:
   ```env
   COOKIE_DOMAIN=.ironloot.local
   ```
2. Añadir al archivo hosts las entradas `ironloot.local` (ver sección de prerrequisitos)
3. Reiniciar BASE y CLIENT:
   ```bash
   docker compose restart base
   docker compose stop client && docker compose rm -f client && docker compose up -d client
   ```
4. Usar `http://base.ironloot.local` y `http://client.ironloot.local` en lugar de `*.localhost`

Ver el runbook completo en `implementation/SSO_VALIDATION_RUNBOOK.md`.

---

## 13. Acceso a la base de datos

### Conexión directa (psql o cliente SQL)

| Parámetro | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5432` |
| Base de datos | `ironloot_db` |
| Usuario | `ironloot` |
| Contraseña | `ironloot_dev` |

String de conexión completo:
```
postgresql://ironloot:ironloot_dev@localhost:5432/ironloot_db
```

### pgAdmin (interfaz visual — opcional)

pgAdmin requiere iniciarse con el profile `tools`:

```bash
docker compose --profile tools up -d pgadmin
```

Acceder en: `http://localhost:5050`

| Campo | Valor |
|---|---|
| Email | `admin@ironloot.local` |
| Contraseña | `admin` |

Una vez dentro, registrar el servidor con los parámetros de la sección anterior (el hostname dentro de Docker es `db`, no `localhost`).

### Prisma Studio (explorador de BD integrado)

Desde la máquina anfitriona, si Node.js está instalado:

```bash
cd api
npm run db:studio
```

Abre `http://localhost:5555` con una interfaz visual para explorar y editar registros.

### Tablas principales

| Tabla | Descripción |
|---|---|
| `users` | Cuentas de usuario |
| `wallets` | Monederos digitales (1 por usuario) |
| `auctions` | Subastas publicadas |
| `bids` | Historial de pujas |
| `orders` | Órdenes post-subasta |
| `payments` | Transacciones de pago |
| `disputes` | Disputas entre comprador y vendedor |
| `notifications` | Notificaciones del sistema |
| `audit_events` | Log inmutable de auditoría |
| `sessions` | Sesiones JWT activas |

---

## 14. Diagnóstico y logs

### Ver logs de un servicio específico

```bash
# Últimas 100 líneas
docker compose logs --tail=100 api

# En tiempo real
docker compose logs -f client

# Con timestamps
docker compose logs -t base
```

### Health check de la API

```bash
curl http://localhost:3000/api/v1/health
```

Respuesta esperada:
```json
{ "status": "ok" }
```

### Verificar que la API responde correctamente

```bash
# Listado público de subastas (no requiere autenticación)
curl http://localhost:3000/api/v1/auctions
```

### Estado de WebSocket

Para verificar que WebSocket funciona:
1. Abrir `http://base.localhost/auctions/:id` de una subasta ACTIVE
2. Abrir DevTools > Network > filtrar por "WS"
3. Debe aparecer una conexión WebSocket activa (código 101)

---

## 15. Solución de problemas frecuentes

### El navegador muestra "No se puede acceder a este sitio" en `base.localhost`

**Causa:** Las entradas del archivo hosts no están configuradas.  
**Solución:** Seguir el paso 3 de este README (configuración del archivo hosts).

---

### El servicio CLIENT no arranca o se reinicia constantemente

**Causa:** Docker frío sin el directorio `dist/` pre-compilado.  
**Solución:** Usar el procedimiento correcto de reinicio:

```bash
docker compose stop client && docker compose rm -f client && docker compose up -d client
```

Esperar ~20-30 segundos para que compile.

---

### Hago login pero me redirige de nuevo al formulario de login

**Causa posible 1:** Credenciales incorrectas.  
**Causa posible 2:** La cuenta está en estado `PENDING_VERIFICATION` (email no verificado).  
**Solución:** Ir a Mailhog (`http://localhost:8025`) y hacer clic en el link del correo de verificación.

---

### Llego al dashboard de CLIENT pero al recargar me manda al login

**Causa:** El token JWT expiró (duración: 15 minutos). Si la renovación automática falló, la sesión se invalida.  
**Solución:** Hacer login de nuevo en `http://base.localhost/auth/login`.

---

### El SSO no funciona: hago login en BASE pero CLIENT me manda al login

**Causa:** La cookie `access_token` emitida con `Domain=localhost` no se propaga entre subdominios en Chrome ≥ 90.  
**Solución:** Cambiar a `COOKIE_DOMAIN=.ironloot.local` en `api/.env` y usar las entradas de hosts `ironloot.local`. Ver la sección 12 de este README y `implementation/SSO_VALIDATION_RUNBOOK.md`.

---

### No recibo el correo de verificación

**Causa:** En desarrollo, los correos no se envían a buzones reales.  
**Solución:** Revisar Mailhog en `http://localhost:8025`. Si no aparece ningún correo, verificar que el servicio `mailhog` esté en estado `Up`:
```bash
docker compose ps mailhog
```

---

### La API devuelve 429 Too Many Requests

**Causa:** Se superó el límite de peticiones (100/min global, o 60/min en login/registro en desarrollo).  
**Solución:** Esperar 60 segundos y volver a intentar.

---

### Intento pujar pero el botón no funciona o da error

**Causas posibles:**
- La subasta no está en estado `ACTIVE` (puede estar en DRAFT, PUBLISHED o CLOSED)
- El usuario no tiene fondos suficientes en su wallet (`balance + held_funds < monto_puja`)
- El monto ingresado no supera el precio actual de la subasta
- El usuario es el vendedor de la misma subasta

---

### Al abrir DevTools sale error CORS en Network

**Causa:** El origen no está en la lista `ALLOWED_ORIGINS` de la API.  
**Solución:** Verificar en `api/.env` que la URL del servicio está incluida en:
```env
ALLOWED_ORIGINS=http://base.localhost,http://client.localhost,...
```

Luego reiniciar la API:
```bash
docker compose restart api
```

---

### La BD no tiene datos después de levantar el stack por primera vez

**Esto es esperado.** No hay seed de datos automático. Crear las cuentas de prueba siguiendo el flujo de registro en `http://base.localhost/auth/register`.

---

## Resumen de accesos rápidos

```
Sitio público:        http://base.localhost
Portal privado:       http://client.localhost
Admin:                http://admin.localhost   → usuario: admin / contraseña: admin
API Swagger:          http://localhost:3000/docs
Correos (Mailhog):    http://localhost:8025
Base de datos:        localhost:5432  → usuario: ironloot / contraseña: ironloot_dev
```

---

*Iron Loot v1.0.0 — Arquitectura multi-dominio (Fases 0-7 completas)*  
*Para dudas técnicas ver: `implementation/PROJECT_KNOWLEDGE_BASE.md`*  
*Para pruebas de QA ver: `QA/BROWSER_TEST_PLAN.md`*
