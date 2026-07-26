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
- `MAIL_*` sólo se define en `docker-compose.yml` (no en `.env.example`).
- Detalle completo con citas: `audit/raw/E §4`.
