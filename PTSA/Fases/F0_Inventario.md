---
ptsa_version: 3.0
fase: F0
nombre: Inventario
estado: COMPLETADA
ultima_actualizacion: 2026-06-23
confidence: 90
sesion: S-001
---

# F0 — Inventario del Sistema

**Sistema:** IronLoot v1.0.0  
**Fecha:** 2026-06-23  
**Fuente:** `docker-compose.yml`, `src/api/package.json`, `src/api/prisma/schema.prisma`, conteos directos vía Bash/Glob

---

## 1. Servicios / Contenedores

Fuente: `docker-compose.yml` (8 contenedores)

| Contenedor | Imagen | Puerto(s) | Memoria | Rol |
|:---|:---|:---|:---|:---|
| `ironloot-api` | node:20-alpine | 3000 | 1 GB | REST API + WebSocket |
| `ironloot-base` | node:20-alpine | 5174 | 512 MB | Sitio público SSR |
| `ironloot-client` | node:20-alpine | 5175 | 512 MB | Portal privado SSR |
| `ironloot-admin` | node:20-alpine | 3001 | 512 MB | Backoffice admin SSR |
| `ironloot-nginx` | nginx:alpine | 80 | — | Reverse proxy / subdomain routing |
| `ironloot-db` | postgres:16-alpine | 5432 | 512 MB | Base de datos PostgreSQL |
| `ironloot-redis` | redis:7-alpine | 6379 | 256 MB | Cache / locks / colas |
| `ironloot-mailhog` | mailhog/mailhog | 1025, 8025 | 256 MB | Captura de email (dev) |

**Total contenedores:** 8

---

## 2. Endpoints REST (API)

Fuente: `src/api/src/modules/**/*.controller.ts` — prefijo global `/api/v1/`

| Módulo | Count | Notas |
|:---|:--:|:---|
| Auth | 12 | Incluye 2FA (generate/enable/disable) |
| Users | 5 | Perfil, settings, seller request |
| Auctions | 6 | CRUD + publish + cancel |
| Bids | 3 | Place, my bids, by auction |
| Wallet | 5 | Balance, history, deposit, withdraw |
| Payments | 6 | Checkout, webhook, initiate, process, providers, methods |
| Orders | 3 | List, detail, cancel |
| Shipments | 4 | Register, get, update, deliver |
| Disputes | 4 | Create, list, detail, resolve |
| Ratings | 2 | Submit, get by user |
| Notifications | 3 | List, mark read, mark all read |
| Watchlist | 3 | List, add, remove |
| Upload | 1 | Image upload |
| Health | 2 | `/health`, `/health/detailed` |
| Diagnostics | 4 | Logs, errors, metrics (dev only) |
| Admin | ~21 | Auth, stats, usuarios, subastas, lots |

**Total endpoints:** ~84 REST + WebSocket gateway (bids broadcast)

---

## 3. Tablas de Base de Datos (Prisma Schema)

Fuente: `src/api/prisma/schema.prisma` (27 modelos verificados)

| Modelo Prisma | Tabla DB | Categoría |
|:---|:---|:---|
| User | users | Núcleo |
| Profile | profiles | Núcleo |
| Session | sessions | Núcleo |
| Auction | auctions | Negocio |
| Bid | bids | Negocio |
| Order | orders | Negocio |
| Payment | payments | Negocio |
| Shipment | shipments | Negocio |
| Rating | ratings | Negocio |
| Dispute | disputes | Negocio |
| Notification | notifications | Negocio |
| Watchlist | watchlist | Negocio |
| Wallet | wallets | Financiero |
| Ledger | ledger | Financiero |
| CommissionConfig | commission_config | Financiero |
| CommissionRecord | commission_records | Financiero |
| RefundRequest | refund_requests | Financiero |
| CfdiRecord | cfdi_records | Fiscal (stub) |
| KycSubmission | kyc_submissions | Compliance |
| NotificationCampaign | notification_campaigns | Marketing |
| ModerationLog | moderation_log | Admin |
| SystemConfig | system_config | Config |
| AuditEvent | audit_events | Observabilidad |
| ErrorEvent | error_events | Observabilidad |
| RequestLog | request_logs | Observabilidad |
| SeoConfig | seo_config | SEO |
| CmsContent | cms_content | CMS |

**Total tablas:** 27

---

## 4. Migraciones

Fuente: `src/api/prisma/migrations/` (verificado con Glob)

| Migración | Fecha |
|:---|:---|
| 20260106100011_init_auctions_module | 2026-01-06 |
| 20260106111403_init_bids_module | 2026-01-06 |
| 20260106115351_init_orders_module | 2026-01-06 |
| 20260106123540_add_payments_module | 2026-01-06 |
| 20260106133716_add_shipments_module | 2026-01-06 |
| 20260106135936_add_ratings_module | 2026-01-06 |
| 20260106141606_add_disputes_module | 2026-01-06 |
| 20260106142346_add_notifications_module | 2026-01-06 |
| 20260106154609_add_wallet_module | 2026-01-06 |
| 20260107205455_audit_fixes_v0_3_0 | 2026-01-07 |
| 20260108020207_update_ledger_types | 2026-01-08 |
| 20260619_fix_wallet_currency_default_to_mxn | 2026-06-19 |
| 20260619_remove_purchase_ledger_type | 2026-06-19 |

**Total migraciones:** 12 (sin `migration_lock.toml`)

---

## 5. Archivos de Código Fuente TypeScript

Fuente: conteo Bash (`find src/XXX -name "*.ts" -not -path "*/node_modules/*"`)

| Servicio | Archivos .ts | Archivos test |
|:---|:--:|:--:|
| API (`src/api/src/`) | 162 | 39 |
| Base (`src/apps/base/src/`) | ~8 | — |
| Client (`src/apps/client/src/`) | ~7 | — |
| Admin (`src/admin/src/`) | 61 | — |
| Core (`src/packages/core/src/`) | 61 | 12 |

**Total .ts:** ~299 | **Total test files:** 51

---

## 6. Templates (Nunjucks / HTML)

| Servicio | Templates | Notas |
|:---|:--:|:---|
| BASE views | 14 | Login, home, catalog, auth pages |
| CLIENT views | 26 | Dashboard, orders, wallet, disputes, etc. |
| ADMIN views | 28 | Módulos admin backoffice |

**Total templates:** 68 (`.html` Nunjucks)

---

## 7. Prompts / Templates LLM

**NO APLICA** — IronLoot es un sistema determinístico sin IA/LLM. No hay prompts de LLM.

Los templates HTML de Nunjucks no son prompts de IA.

---

## 8. Dependencias

Fuente: `src/api/package.json` (dependencias del servicio principal)

| Categoría | Count |
|:---|:--:|
| Producción (`dependencies`) | 37 |
| Desarrollo (`devDependencies`) | 30 |

**Destacadas:** NestJS 10, Prisma 5, Socket.io 4, BullMQ 5, Passport, bcrypt, Nodemailer, Helmet, class-validator

---

## 9. Documentación del Repositorio

| Categoría | Documentos |
|:---|:--:|
| Enterprise docs (`docs/enterprise-documentation/`) | 18 (11 core + 6 inventory + README) |
| Metodología (`docs/methodology/`) | PTSA-V3-Especificacion-Oficial.md + otros |
| Implementación (`docs/implementation/`) | HISTORY.log, HANDOFF.md |
| Raíz | CLAUDE.md, README.md (si existe) |

---

## Checklist F0 ✅

- [x] Servicios/contenedores enumerados (8 — desde compose)
- [x] Endpoints enumerados (~84 — desde controllers)
- [x] Tablas enumeradas (27 — desde schema.prisma)
- [x] Prompts/templates → NO_APLICA (sin LLM)
- [x] Migraciones enumeradas y ordenadas (12)
- [x] Documentos del repo enumerados (18 enterprise + metodología + implementación)
- [x] Dependencias capturadas (37 prod + 30 dev)

**Nota:** Conteo de tablas basado en `schema.prisma` (segunda mano). Verificación contra BD real pendiente en F5 (BLQ-001).

**Estado: COMPLETADA** | Confidence: 90% (limitación: sin acceso a BD real para verificar esquema vivo)
