# Arquitectura de Despliegue e Infraestructura — IronLoot

| Metadato | Valor |
|---|---|
| **Origen** | Reconstrucción basada en evidencia |
| **Fuente** | `audit/raw/E-graphify-infra.md`, `docker-compose.yml`, `src/nginx/nginx.conf`, Dockerfiles |
| **Fecha** | 2026-07-23 |
| **Documentos usados** | README (setup), 03-TRD |
| **Código usado** | `docker-compose.yml`, `src/nginx/nginx.conf`, `*/Dockerfile*` |
| **Nivel de confianza** | Alto |

## 1. Topología de servicios (Docker Compose)

8 servicios en red bridge `ironloot-network`:

| Servicio | Imagen/Build | Puerto | depends_on | Healthcheck | Límite mem |
|---|---|---|---|---|---|
| nginx | build `./src/nginx` | 80:80 | api(healthy), admin/base/client(started) | — | — |
| api | build `./src/api` (Dockerfile.dev) | 3000 | db+redis(healthy) | `GET /api/v1/health` | 1G |
| admin | build `./src/admin` | 3001 | api(healthy) | `GET /` | 512M |
| base | build `./src/apps/base` | 5174 | api(healthy) | `GET /` | 512M |
| client | build `./src/apps/client` | 5175 | api(healthy) | `GET /` | 512M |
| db | postgres:16-alpine | 5432 | — | `pg_isready` | 512M |
| redis | redis:7-alpine (`--appendonly yes`) | 6379 | — | `redis-cli ping` | 256M |
| mailhog | mailhog/mailhog | 1025/8025 | — | — | 256M |
| pgadmin | dpage/pgadmin4 (perfil `tools`) | 5050 | db | — | — |

Volúmenes: `ironloot_postgres_data`, `ironloot_redis_data`, `ironloot_pgadmin_data`. Los servicios de app montan `src`/`views`/`public` como bind-mounts (dev) con `node_modules` anónimo. `[E §3]`

## 2. Ruteo nginx (subdominios + traffic-switch)

| Host | Destino |
|---|---|
| `localhost`, `base.*` | `base:5174` (WS upgrade, fallback 503 JSON) |
| `api.*` | `api:3000` (límite body 10M para uploads) |
| `admin.*` | `admin:3001` |
| `client.*` | `client:5175` (WS upgrade, fallback 503) |
| `ironloot.local` (bare) | **traffic-switch 301:** `/auctions*`,`/auth*`→BASE; rutas privadas (`/dashboard\|wallet\|orders\|seller\|...`)→CLIENT; resto→BASE |

`resolver 127.0.0.11` (DNS embebido Docker). Bloque análogo para `localhost` **comentado** pendiente de go-live. `[E §3]`

## 3. Dominios locales

Añadir al `hosts`: `127.0.0.1 ironloot.local base.ironloot.local client.ironloot.local admin.ironloot.local api.ironloot.local`.

## 4. Modos de ejecución

- **Full stack:** `docker-compose up -d` → BASE `:5174`, CLIENT `:5175`, API `/docs`, ADMIN `:3001`, Mailhog `:8025`.
- **Híbrido (dev recomendado):** `docker-compose up -d db redis mailhog` + `npm run start:dev` por app (ver README raíz).

## 5. Puesta en marcha (setup)

```bash
docker-compose up -d db redis mailhog
cd src/api && npm install && npm run db:generate && npm run db:migrate && npm run start:dev
cd src/apps/base && npm install && npm run start:dev
cd src/apps/client && npm install && npm run start:dev
```

> ✅ **AUD-001 (VALIDATION_PENDING, PT-037):** la migración `20260723_reconcile_backoffice_schema_and_currency` reconstruye el esquema completo (28 tablas) vía `migrate deploy`. **Entornos existentes creados por `db push`** deben baselinear una vez: `prisma migrate resolve --applied 20260723_reconcile_backoffice_schema_and_currency`. Incluye el fix `payments.currency`→MXN (AUD-008).
> ⚠️ `npm run db:seed` sigue fallando (sin script, `AUD-017`, pendiente).
