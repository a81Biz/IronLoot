# PT-034 — Tasks

**PT:** PT-034  
**Branch:** `fix/PT-034-cookie-domain-docker`  
**Fecha:** 2026-06-23

---

## PT-034.1

**Objetivo:**    Corregir `COOKIE_DOMAIN` en el servicio `base` de docker-compose para que la cookie se escriba con `Domain=.localhost` por defecto en Docker.  
**Input:**       `docker-compose.yml` línea ~238 — `- COOKIE_DOMAIN=${COOKIE_DOMAIN}` (servicio `base`).  
**Output:**      Línea cambiada a `- COOKIE_DOMAIN=${COOKIE_DOMAIN:-.localhost}`.  
**Validación:**  `docker-compose config | grep -A 30 "base:"` muestra `COOKIE_DOMAIN: .localhost` cuando el root `.env` tiene `COOKIE_DOMAIN=` vacío.  
**Status:**      DONE

---

## PT-034.2

**Objetivo:**    Aplicar el mismo cambio de `COOKIE_DOMAIN` al servicio `client` para coherencia en `clearCookie` del guard.  
**Input:**       `docker-compose.yml` línea ~281 — `- COOKIE_DOMAIN=${COOKIE_DOMAIN}` (servicio `client`).  
**Output:**      Línea cambiada a `- COOKIE_DOMAIN=${COOKIE_DOMAIN:-.localhost}`.  
**Validación:**  `docker-compose config | grep -A 30 "client:"` muestra `COOKIE_DOMAIN: .localhost`.  
**Status:**      DONE

---

## PT-034.3

**Objetivo:**    Añadir `JWT_SECRET` explícito al bloque `environment` del servicio `api` para garantizar coherencia con el servicio `client` en Docker.  
**Input:**       `docker-compose.yml` bloque `environment` del servicio `api` (alrededor de la línea 95) — actualmente sin `JWT_SECRET`.  
**Output:**      Nueva línea `- JWT_SECRET=${JWT_SECRET}` añadida al bloque `environment` del servicio `api`.  
**Validación:**  `docker-compose config | grep -A 5 "JWT_SECRET"` muestra el mismo valor para `api` y `client`.  
**Status:**      DONE

---

## PT-034.4

**Objetivo:**    Actualizar `.env.example` para documentar el valor correcto de `COOKIE_DOMAIN` según el entorno y reflejar el nuevo default Docker.  
**Input:**       `.env.example` línea ~75 — `COOKIE_DOMAIN=` (vacío, sin comentario de entornos).  
**Output:**      Sección `# Cross-subdomain SSO` actualizada con comentario de 3 entornos y valor `COOKIE_DOMAIN=.localhost`.  
**Validación:**  `grep -A 5 "COOKIE_DOMAIN" .env.example` muestra el nuevo comentario y valor.  
**Status:**      DONE

---

## PT-034.5

**Objetivo:**    Verificar ausencia de regresiones: tests API pasan, builds BASE y CLIENT limpios.  
**Input:**       Cambios de PT-034.1–PT-034.4 aplicados.  
**Output:**      Reporte de `npm test` (API): todos pasan. `npm run build` (BASE y CLIENT): 0 errores.  
**Validación:**  `npm test` en `src/api/` → 153/153. `npm run build` en `src/apps/base/` → exit 0. `npm run build` en `src/apps/client/` → exit 0.  
**Status:**      DONE

---

## PT-034.6 — Corrección de enfoque: `.ironloot.local` en lugar de `.localhost`

**Objetivo:**    Corregir el default de `COOKIE_DOMAIN` y las URLs base a `.ironloot.local` porque Chrome/Edge rechazan cookies con `Domain=.localhost` (public suffix — RFC 6265 §5.3).  
**Input:**       `docker-compose.yml` — defaults `.localhost`; `.env.example` — valor `.localhost`.  
**Output:**      `COOKIE_DOMAIN` default cambiado a `.ironloot.local`; `CLIENT_URL` y `BASE_URL` en docker-compose actualizados a `ironloot.local`; `.env.example` corregido con nota de `IMPORTANT`.  
**Validación:**  E2E con hosts file + `.ironloot.local` → cookie aceptada → `client.ironloot.local/dashboard` carga sin 302.  
**Status:**      DONE — pendiente de validación E2E humana (TS-034.1/2/3)
