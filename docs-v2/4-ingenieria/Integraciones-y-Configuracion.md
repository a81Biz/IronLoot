# Integraciones y Configuración (Variables de Entorno) — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/E-graphify-infra.md`, `.env.example` (×3), `system-config.service.ts`, providers |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | inventory/integrations, 03-TRD, 09-Security |
| **Código usado** | `payments/providers/*`, `notifications.module.ts`, `system-config.service.ts`, `docker-compose.yml` |
| **Nivel de confianza** | Alto |

## 1. Integraciones externas

| Integración | Dónde | Estado |
|---|---|---|
| **Mercado Pago** (Checkout Pro) | `mercadopago.provider.ts` | ✅ HMAC webhook |
| **PayPal** (Orders v2 + Webhooks) | `paypal.provider.ts` | ✅ verify-webhook-signature (PT-076) |
| **HeyBanco** | `heybanco.provider.ts` | ⚠️ presente, **no documentado** ni en `.env.example` (AUD-023) |
| Stripe | referencia condicional | ⚠️ etiqueta Graphify obsoleta; sin SDK real |
| **Email (SMTP/Mailhog)** | `notifications.module.ts` | ⚠️ dos rutas config `MAIL_*` vs `SMTP_*` (AUD-027) |
| **Transportista** | `shipments/*` | ✗ sin API real; campos manuales (AUD-024) |
| **CFDI/PAC** | `cfdi/*`, `ICfdiPacProvider` | ✗ stub, sin proveedor (AUD-016) |
| **KYC** | `kyc/*` | manual admin; sin proveedor externo |
| **Storage** | `upload/*`, `IStorageService` | LOCAL\|S3\|MINIO por config |
| **Redis** | lock, sesión admin, BullMQ | ✅ |
| **Socket.io** | gateways `auctions`/`events` | ⚠️ sin auth (AUD-006) |

## 2. Variables de entorno (catálogo)

Tres `.env.example` (raíz, `src/api`, `src/admin`). Marcadas 🔒=secreto, ⚠️=crítica en prod.

### Base de datos / Redis
`DATABASE_URL`🔒 · `DB_HOST/PORT/NAME/USER` · `DB_PASSWORD`🔒 · `REDIS_URL`/`REDIS_HOST`/`REDIS_PORT` · `REDIS_PASSWORD`🔒(opc).

### Auth / sesión
`JWT_SECRET`🔒⚠️(min 32) · `JWT_ACCESS_EXPIRY`(15m) · `JWT_REFRESH_EXPIRY`(7d) · `BCRYPT_SALT_ROUNDS`(12) · `SESSION_SECRET`🔒 · `ADMIN_SESSION_SECRET`🔒 · `ADMIN_API_KEY`🔒⚠️(default `dev-admin-key`) · `ADMIN_USERNAME`/`ADMIN_PASSWORD`🔒(default `admin`/`admin`, **AUD-004**) · `COOKIE_DOMAIN`(`.ironloot.local`) · `COOKIE_SAMESITE`(Lax) · `COOKIE_SECURE`⚠️ · `RATE_LIMIT_TTL/MAX`(60/100–200, inconsistente entre ejemplos).

### Pagos
`MERCADO_PAGO_ACCESS_TOKEN`🔒 · `MERCADO_PAGO_WEBHOOK_SECRET`🔒 · `PAYPAL_CLIENT_ID/SECRET`🔒 · `PAYPAL_BUSINESS_EMAIL` · `PAYPAL_MODE`(sandbox) · `HEY_BANCO_API_URL/CLIENT_ID/CLIENT_SECRET/WEBHOOK_SECRET`🔒 (**no en ningún `.env.example`**, AUD-023) · `API_BASE_URL`.

### Reglas de negocio (seed → override en Admin)
`AUCTION_SOFT_CLOSE_WINDOW_SEC`(120) · `PAYMENT_EXPIRATION_HOURS`(72) · `DISPUTE_WINDOW_DAYS`(14) · `REQUIRE_AUCTION_MODERATION`(false) · `AUCTION_MIN_INCREMENT_AMOUNT`(10, **no aplicado** AUD-009) · `AUCTION_MIN/MAX_DURATION_HOURS`(1/720) · `REQUIRE_EMAIL_VERIFICATION`(true) · `REQUIRE_KYC_FOR_SELLERS`(true).

### Email / Storage / CFDI
`MAIL_*` (usado por NotificationsModule) · `SMTP_*` (seed SystemConfig) — duplicado (AUD-027). · `STORAGE_PROVIDER/BUCKET/REGION` · `STORAGE_ACCESS_KEY/SECRET_KEY`🔒 · `CFDI_RFC_EMISOR` · `CFDI_PAC_URL` · `CFDI_PAC_API_KEY`🔒.

### URLs / CORS / Logging
`BASE_URL`/`CLIENT_URL`/`ADMIN_URL`/`API_URL` · `ALLOWED_ORIGINS`⚠️(vacío en prod falla) · `BASE/CLIENT/ADMIN_ENABLED` · `LOG_LEVEL` · `TRACE_ENABLED`.

## 3. Notas de configuración

- Alias JWT: `env.validation.ts` acepta nombres alternativos (`JWT_EXPIRATION`/`JWT_EXPIRES_IN`/`JWT_REFRESH_EXPIRATION`) con cadenas de fallback.
- `MAIL_*` se define en `docker-compose.yml` y en `src/api/.env.example` (5 entradas). **Ya no es un hueco**: lo vigila `variables-de-entorno-declaradas.spec.ts` (RULE-17).
- Detalle completo con citas: `audit/raw/E §4`.

---

## Topes de espera con terceros (2026-07-29 · ADR-052)

**Antes de esta fecha, dos ficheros del API declaraban un tope — y los dos se escribieron el mismo día.**

| Tercero | Tope | Nota |
|---|---|---|
| SMTP | conexión 5 s · saludo 5 s · sesión 10 s (`MAIL_TIMEOUTS_MS`) | Sin declararlos, nodemailer aplica **dos minutos**: con el SMTP caído el registro y el reenvío se colgaban **121 s**. Medido |
| PayPal · Mercado Pago · HeyBanco | consultar 8 s · **operar 20 s** (`GATEWAY_TIMEOUTS_MS`) | La asimetría es **del dominio**: la vía garantizada volverá a preguntar, pero abandonar una captura deja un cobro sin saber qué pasó |
| Google reCAPTCHA | 5 s, y **si no responde no se deja pasar** | Un timeout no puede ser una puerta accionable por quien sepa provocarlo |
| Redis (ioredis) | los de la biblioteca | Se midió: ioredis **sí** trae los suyos. Lo que faltaba en Redis era la reserva a `localhost` del cerrojo (ADR-053) |
| Almacenamiento | no aplica | `writeFile` local; sin servicio remoto en v1.0 |

## Variables de conexión: **sin reserva, y el proceso aborta nombrándolas** (ADR-053)

`DATABASE_URL` · `REDIS_URL` · `MAIL_HOST` · `MAIL_PORT` · `API_URL` · `BASE_URL` · `CLIENT_URL`.

En un SSR, **a dónde llamar es una conexión**: `API_URL` con reserva a `localhost:3000` hacía que el sitio
mandara *todas* sus llamadas a su propio contenedor y **arrancara `healthy` sin funcionar**. Lo vigila
`conexiones-sin-reserva.spec.ts` en **los cuatro servicios**.

**Excepción declarada**: `public-origins.ts` conserva el **subdominio de desarrollo** como reserva de
`BASE_URL`/`CLIENT_URL`/`API_BASE_URL` por ADR-045. Es discutible y está anotado allí.

## Y el fallo de un tercero llega a quien llamó (ADR-051)

`EmailService` absorbía los errores de envío y con eso anulaba **tres capas de recuperación**, incluida la
política de reintentos de la cola: un envío fallido marcaba el trabajo como **completado**. Ahora propaga, y cada
llamante declara qué hace — con el caso notable de la recuperación de contraseña, que **captura a propósito**
para no convertir una caída del SMTP en un oráculo de enumeración.
