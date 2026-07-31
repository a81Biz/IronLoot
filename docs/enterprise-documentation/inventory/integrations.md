# Inventory — Integrations

All external services and third-party integrations.  
**Source:** `src/api/package.json`, `docker-compose.yml`, `.env.example`,
`src/api/src/modules/payments/interfaces/`

> **Fuente corregida el 2026-07-30 (PT-198).** Citaba `src/packages/core/src/integrations/`, un
> directorio que **PT-193 retiró**: declaraba `IPaymentProvider` y compañía sin un solo
> implementador, mientras el contrato vivo lo declara el API (ADR-058). La cita sobrevivió a la
> retirada y mandaba a un sitio que ya no existe — la familia de H-016.
>
> El contrato real de una pasarela está en `modules/payments/interfaces/`, que es lo que los
> cuatro adaptadores implementan.

---

## Payment Providers

### Mercado Pago (Primary)
- **Status:** Implemented and active
- **SDK:** `mercadopago: ^2.11.0` (`src/api/package.json:59`)
- **Config:** `MERCADO_PAGO_ACCESS_TOKEN` env var (`.env.example` — not in visible portion; referenced in CLAUDE.md)
- **Features:** Checkout sessions, webhook notifications, payment method listing
- **Webhook:** `POST /api/v1/payments/webhook/mercado_pago` — HMAC validated
- **Contrato:** `IPaymentProvider` (`src/api/src/modules/payments/interfaces/payment-provider.interface.ts`)

### PayPal
- **Status:** Implemented (schema + service)
- **SDK:** Possibly `paypal-rest-sdk` or direct HTTP — not confirmed in visible package.json
- **Config:** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (CLAUDE.md:192)
- **Webhook:** `POST /api/v1/payments/webhook/paypal`

### Stripe
- **Status:** SDK installed, integration status UNKNOWN
- **SDK:** `stripe: ^20.1.2` (`src/api/package.json:68`)
- **Config:** Not confirmed in `.env.example`
- **Note:** In `PaymentProvider` enum but not confirmed as an active provider

### Hey Banco
- **Status:** Enum only — no confirmed implementation
- **Note:** Listed in `PaymentProvider` enum, no SDK found

---

## Email

### Nodemailer + @nestjs-modules/mailer
- **Status:** Configured and operational (dev: Mailhog; prod: real SMTP)
- **SDK:** `nodemailer: ^7.0.12`, `@nestjs-modules/mailer: ^2.0.2` (`src/api/package.json:42, 34`)
- **Template engine:** Handlebars (`handlebars: ^4.7.8`)
- **Dev SMTP:** Mailhog at `mailhog:1025` (Docker service)
- **Dev UI:** `http://localhost:8025`
- **Config:** `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`
- **Contrato:** ninguno — `EmailService` es una clase concreta (`src/api/src/modules/notifications/email.service.ts`). Lo que cada llamante hace con un fallo de envío está declarado por **RULE-36**

---

## Databases / Data Stores

### PostgreSQL 16
- **Status:** Active, production-grade
- **Image:** `postgres:16-alpine`
- **Container:** `ironloot-db` (port 5432)
- **ORM:** Prisma 5.8
- **Config:** `DATABASE_URL` (Prisma), `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Init script:** `src/api/scripts/init-db.sql` (mounted at startup)
- **Memory limit:** 512 MB

### Redis 7
- **Status:** Active — used for rate limiting, distributed locks, BullMQ queues
- **Image:** `redis:7-alpine`
- **Container:** `ironloot-redis` (port 6379)
- **Persistence:** `--appendonly yes`
- **Config:** `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` (optional: `REDIS_PASSWORD`)
- **Memory limit:** 256 MB
- **Uses:**
  - `ThrottlerModule` (rate limiting) con `ThrottlerRedisService` sobre `REDIS_URL` — compartido entre instancias desde PT-030
  - `DistributedLockService` (auction close cron)
  - `BullModule` (BullMQ async job queues — PT-038)

---

## Authentication

### TOTP (2FA)
- **Status:** Implemented (optional user feature; optional admin feature)
- **SDK:** `otplib: ^12.0.1` (`src/api/package.json:63`)
- **QR Code:** `qrcode: ^1.5.4` (`src/api/package.json:64`)
- **User 2FA:** Stored in `users.two_factor_secret`; enabled via `/auth/2fa/enable`
- **Admin 2FA:** Controlled by `ADMIN_TOTP_SECRET` env var

### Bcrypt
- **Status:** Active
- **SDK:** `bcrypt: ^5.1.1` (`src/api/package.json:44`)
- **Config:** `BCRYPT_SALT_ROUNDS` (default 12)

### JWT
- **Status:** Active
- **SDK:** `@nestjs/jwt: ^10.2.0`, `passport-jwt: ^4.0.1`
- **Config:** `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`

---

## Queue / Background Jobs

### BullMQ
- **Status:** Configured (PT-038)
- **SDK:** `bullmq: ^5.79.0`, `@nestjs/bullmq: ^11.0.4`
- **Backend:** Redis (shared connection)
- **Config:** `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- **Queue names/processors:** Not inventoried (see ND-006 in Technical Debt)

---

## File Storage

### Local Storage
- **Status:** Active (dev)
- **Provider:** Local filesystem (`uploads/` directory)
- **Contrato:** ninguno — el módulo `upload` escribe al sistema de ficheros sin abstracción. Sustituir el almacén exige tocar el módulo, y eso es lo que hay que saber antes de prometer S3
- **Served at:** `/uploads` (via `ServeStaticModule`)
- **Production:** Cloud storage implementation expected (S3-compatible); not confirmed

---

## CFDI (Mexican Tax Invoicing)

### PAC Provider (stub)
- **Status:** STUB — no real PAC integration
- **Contrato:** ninguno — `cfdi.service.ts` es un stub sin cliente de PAC (TD-001, `H-005`, `P-012` FUERA_DE_ALCANCE_V1)
- **Schema:** `cfdi_records` table exists and is fully defined
- **Risk:** Fiscal invoicing non-functional (see TD-001 in Technical Debt)

---

## Nginx (Reverse Proxy)

- **Status:** Active
- **Image:** Custom build (`src/nginx/Dockerfile`)
- **Config:** `src/nginx/nginx.conf`
- **Responsibilities:** Subdomain routing, WebSocket proxy (`Upgrade` headers), traffic cutover (`ironloot.local` redirects for PT-025)

---

## Development Tools

### Mailhog
- **Status:** Dev only
- **Purpose:** Local email capture (no real emails sent in dev)
- **UI:** `http://localhost:8025`
- **SMTP:** `localhost:1025`

### pgAdmin
- **Status:** Optional (Docker profile: `tools`)
- **Image:** `dpage/pgadmin4:latest`
- **Port:** 5050 (configurable)
- **Config:** `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`

### Prisma Studio
- **Status:** Dev only
- **Command:** `npm run db:studio` (in `src/api/`)
- **Purpose:** Visual DB browser

---

## Topes de espera de cada tercero (PT-183 / PT-184 / PT-188)

**Toda llamada que sale del sistema declara cuánto se le espera.** Antes de esta jornada lo declaraban **dos**
ficheros del API, y los dos se escribieron el mismo día.

| Tercero | Tope | De dónde sale el número |
|---|---|---|
| **SMTP** (nodemailer) | conexión 5 s · saludo 5 s · sesión 10 s | `MAIL_TIMEOUTS_MS`. Sin declararlos, nodemailer aplica **dos minutos**: con el SMTP caído, el reenvío de verificación **y el registro** se colgaban 121 s. Medido (H-033) |
| **Pasarelas de pago** (PayPal, Mercado Pago, HeyBanco) | consultar 8 s · **operar 20 s** | `GATEWAY_TIMEOUTS_MS`. La asimetría es **del dominio**: consultar puede cortarse pronto porque la vía garantizada volverá a preguntar; **crear o capturar** no, porque abandonar algo que quizá se completó al otro lado deja un cobro sin saber qué pasó (H-034) |
| **Google reCAPTCHA** | 5 s | `recaptcha.guard.ts`. Y **si Google no responde, no se deja pasar**: un timeout no puede ser una puerta accionable por quien sepa provocarlo (H-029) |
| **Redis** (ioredis) | los de la biblioteca (10 s de conexión, reintentos acotados) | No se declaran propios: se midió y ioredis **sí trae** los suyos, a diferencia de nodemailer. Lo que faltaba en Redis era otra cosa — la reserva a `localhost` del cerrojo distribuido (H-035) |
| **Almacenamiento de ficheros** | no aplica | `writeFile` en **disco local**. No hay servicio remoto en v1.0, así que no hay nada a lo que esperar |

**Los valores se derivan, no se eligen**: 5 s es lo que ya se esperaba de Google, 2 s lo que se espera de Redis en
la comprobación de salud. El correo es el más lento por naturaleza y se queda en el techo de esa banda.

## Y el fallo de un tercero llega a quien llamó (RULE-36)

`EmailService` absorbía cualquier error de envío. Con eso caían **tres capas de recuperación**: el `catch` del
worker de la cola, su contador de intentos y la política de reintentos de BullMQ — un envío fallido marcaba el
trabajo como **completado** (H-032).

Ahora propaga, y **cada llamante declara qué hace con el fallo**:

| Llamante | Qué hace | Por qué |
|---|---|---|
| Reenvío de verificación | **propaga** | Es lo único que hace el endpoint |
| Cola de notificaciones | **propaga** | Su reintento existe para esto, y ahora se alcanza |
| Registro | **captura y registra** | La cuenta ya está creada; hay vía de reenvío |
| Recuperación de contraseña | **captura y registra** | Su respuesta es **opaca a propósito**: propagar convertiría una caída del SMTP en un **oráculo de enumeración** — 500 para las direcciones que existen, 200 para las que no |

## Credenciales que faltan (TD-002)

**Stripe y HeyBanco tienen su código de adaptador escrito y no tienen credenciales.** El registro de deuda decía
que faltaba el código, y eso era falso (PT-181). Lo que falta es de negocio, no de ingeniería.

---

## Nota de corrección — 2026-07-30 (PT-201)

**Cuatro secciones de este documento seguían citando `src/packages/core/src/integrations/`**, el
directorio que PT-193 retiró (ADR-058) — **dentro del documento cuya nota de cabecera dice que se
retiró**. La cabecera se corrigió en PT-198 y el cuerpo no, porque la guarda de entonces sólo leía la
línea `**Source:**`.

**Y tres de las cuatro no tenían sustituto**, que es el dato: no existe un `IEmailService`, ni un
`IStorageService`, ni un `ICfdiPacProvider` en ninguna parte del código. Se retiraron **porque nadie los
implementaba**. Un inventario que los nombra como «Interface» promete una capa de abstracción que no
existe — y quien planee cambiar de almacén o de PAC leerá que hay un contrato donde hay una llamada
directa.

**Una quinta línea decía otra cosa falsa**: el almacén del rate limiter figuraba como *«TBD, see
TD-002»*. `TD-002` son las credenciales de Stripe y HeyBanco; lo que correspondía era `ND-002`, **cerrada
por PT-171** — y cerrada porque el almacén **sí existe** (`ThrottlerRedisService` sobre `REDIS_URL`, desde
PT-030). Un identificador equivocado apuntando a una deuda abierta convertía algo resuelto en pendiente.

Lo vigila `inventarios-completos.spec.ts § C7`, que ahora lee el **cuerpo** y no sólo la cabecera.
