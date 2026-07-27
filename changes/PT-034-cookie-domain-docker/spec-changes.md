# PT-034 — Specification Changes

**PT:** PT-034  
**Fecha:** 2026-06-23

---

## TRD — Cambios requeridos

### Sección 3.2 Authentication (09-Security-Architecture.md / 03-TRD.md)

Añadir nota explícita en la sección de BFF Cookie Pattern:

> **Requisito Docker dev:** Para que la cookie `access_token` sea accesible desde `client.localhost` cuando BASE corre en `base.localhost`, `COOKIE_DOMAIN` debe estar configurado como `.localhost`. Sin este valor, el atributo `Domain` no se incluye y la cookie queda scoped al host exacto.
>
> Configuración por entorno:
> - Docker dev: `COOKIE_DOMAIN=.localhost`
> - Local dev (todos en localhost con distintos puertos): `COOKIE_DOMAIN=` (vacío)
> - Producción: `COOKIE_DOMAIN=.ironloot.com`

Este requisito NO estaba documentado explícitamente en la TRD. La nota existía en `.env.example` pero no en la documentación técnica.

---

## docker-compose.yml — Cambios de configuración

| Servicio | Variable | Antes | Después |
|---|---|---|---|
| `base` | `COOKIE_DOMAIN` | `${COOKIE_DOMAIN}` | `${COOKIE_DOMAIN:-.localhost}` |
| `client` | `COOKIE_DOMAIN` | `${COOKIE_DOMAIN}` | `${COOKIE_DOMAIN:-.localhost}` |
| `api` | `JWT_SECRET` | (no existía en `environment`) | `${JWT_SECRET}` |

---

## .env.example — Cambio de documentación

| Variable | Antes | Después |
|---|---|---|
| `COOKIE_DOMAIN` | `COOKIE_DOMAIN=` (vacío, sin comentario diferenciado) | `COOKIE_DOMAIN=.localhost` + comentario de 3 entornos |

---

## Sin cambios en

- Prisma schema (`schema.prisma`)
- API endpoints (`08-API-Catalog.md`)
- PRD (`02-PRD.md`) — los requisitos funcionales no cambian
- Lógica de código (`src/`) — sin modificaciones
- Modelos de datos — sin cambios
