# Enterprise Documentation — Iron Loot

**Generated:** 2026-06-23 · **Corregido incrementalmente:** 2026-07-27 (PT-109)  
**Scope:** Full monorepo — `src/` (api, apps/base, apps/client, admin, packages/core, nginx) + `docker-compose.yml` + `src/api/prisma/schema.prisma`  
**Foundation Protocol Version:** 1.0 (first run)

> **Esto es un recorrido del 23-jun con correcciones puntuales encima, no una regeneración.**
> Foundation Protocol dice que una nueva ejecución **sobrescribe** todo; eso no se ha hecho. Lo
> que sí se ha hecho es corregir, con cita, cada afirmación que se descubrió falsa — y esa
> disciplina tiene su propio historial: PT-090 reescribió tres deudas mal descritas, y F-33
> encontró que el registro había vuelto a mentir tres PT después. Desde PT-103 una prueba lo
> vigila (`coherencia-deuda-tecnica.spec.ts`).
>
> **Toca regenerar.** El criterio de Foundation Protocol es «más de 3 meses de desarrollo activo o
> un cambio de arquitectura principal». Estamos a mes y medio, pero han entrado 19 PT que tocaron
> CSP, pagos, retiros y pruebas. Decisión del humano.

### Corregido el 2026-07-27 (PT-109)

| Documento | Qué decía | Qué dice ahora |
|---|---|---|
| `03-TRD` · `05-UIUX-Brief` · `09-Security-Architecture` | `'unsafe-inline'` en la CSP «necesario para las plantillas» | **No está en ninguna directiva**: fuera de `script-src` por PT-096, de `style-src` por PT-105 |
| `09-Security-Architecture` | TOTP de admin «opcional» | **Obligatorio en producción** desde PT-093: el arranque aborta sin él |
| `10-Technical-Debt` (TD-005) | Citaba un comentario del código que ya no existe | Cita las dos guardas que lo vigilan |
| `inventory/services.md` | Faltaban 5 servicios | `AccountVerificationService`, `WithdrawalsService`, `EmailService`, `HealthService`, `AuditPersistenceService` |
| `inventory/endpoints.md` | Faltaban los 7 endpoints de métodos de cobro | Añadidos con su línea en el controlador |

## Index

| # | Document | Contents |
|---|---|---|
| 01 | [Platform Overview](./01-Platform-Overview.md) | What IronLoot is, actors, core value proposition, service map |
| 02 | [PRD — Product Requirements](./02-PRD.md) | Functional requirements, user stories, acceptance criteria, business rules |
| 03 | [TRD — Technical Requirements](./03-TRD.md) | NFRs, runtime constraints, security requirements, integration contracts |
| 04 | [App Flow](./04-App-Flow.md) | End-to-end user journeys: registration, bid, payment, dispute |
| 05 | [UI/UX Brief](./05-UIUX-Brief.md) | Frontend architecture, template structure, per-site conventions |
| 06 | [Backend Architecture](./06-Backend-Architecture.md) | Service topology, module graph, request pipeline, BullMQ, distributed lock |
| 07 | [Database Architecture](./07-Database-Architecture.md) | ERD, all entities, indexes, enum values, wallet ledger invariants |
| 08 | [API Catalog](./08-API-Catalog.md) | All REST endpoints, HTTP methods, auth requirements, rate limits |
| 09 | [Security Architecture](./09-Security-Architecture.md) | Auth model, CORS, CSP, Helmet, rate limiting, webhook validation, secrets |
| 10 | [Technical Debt](./10-Technical-Debt.md) | Known gaps, stubs, TODOs, undetermined facts |
| 11 | [Conventions](./11-Conventions.md) | Naming, folder rules, architectural patterns, HARD RULES, delta log |

## Inventory

| File | Contents |
|---|---|
| [inventory/routes.md](./inventory/routes.md) | All frontend routes (BASE + CLIENT + ADMIN) |
| [inventory/endpoints.md](./inventory/endpoints.md) | All API REST endpoints |
| [inventory/entities.md](./inventory/entities.md) | All Prisma models and enums |
| [inventory/components.md](./inventory/components.md) | All NestJS modules per service |
| [inventory/services.md](./inventory/services.md) | All injectable services |
| [inventory/integrations.md](./inventory/integrations.md) | All external integrations |

## Re-execution Criteria

Re-run Foundation Protocol when:
- A new service is added (e.g., new NestJS app under `src/apps/`)
- The Prisma schema gains or removes a model
- A new architectural pattern is introduced
- More than 3 months of active development pass without re-execution
- `[START FOUNDATION]` is explicitly invoked

**Next recommended re-execution:** 2026-09-23 (3-month mark)
