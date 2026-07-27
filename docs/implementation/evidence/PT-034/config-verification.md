# PT-034 — Evidence: Configuration Verification

**Date:** 2026-06-23  
**Branch:** fix/PT-034-cookie-domain-docker

---

## docker-compose.yml — COOKIE_DOMAIN y JWT_SECRET

**Command:** `grep -n "COOKIE_DOMAIN\|JWT_SECRET" docker-compose.yml`

```
97:      - JWT_SECRET=${JWT_SECRET}
239:      - COOKIE_DOMAIN=${COOKIE_DOMAIN:-.localhost}
282:      - JWT_SECRET=${JWT_SECRET:-change-me-min-32-chars}
283:      - COOKIE_DOMAIN=${COOKIE_DOMAIN:-.localhost}
```

| Línea | Servicio | Variable | Valor |
|---|---|---|---|
| 97 | `api` | `JWT_SECRET` | `${JWT_SECRET:-change-me-min-32-chars}` — misma fuente y mismo fallback que CLIENT |
| 239 | `base` | `COOKIE_DOMAIN` | `${COOKIE_DOMAIN:-.localhost}` — default `.localhost` si vacío |
| 282 | `client` | `JWT_SECRET` | `${JWT_SECRET:-change-me-min-32-chars}` — preexistente |
| 283 | `client` | `COOKIE_DOMAIN` | `${COOKIE_DOMAIN:-.localhost}` — default `.localhost` si vacío |

✓ `base` y `client` usan el mismo default `.localhost`  
✓ `api` y `client` leen `JWT_SECRET` de la misma fuente (root `.env`)

---

## .env.example — COOKIE_DOMAIN

**Command:** `grep -n "COOKIE_DOMAIN" .env.example`

```
76: COOKIE_DOMAIN=.localhost
```

**Sección completa:**
```bash
# -------------------------------------------
# SSO / Cookie (PT-034)
# -------------------------------------------
# Cross-subdomain SSO: set domain WITH leading dot for cookie propagation.
# Docker dev (base.localhost + client.localhost): .localhost
# Local dev puro (todos en localhost, puertos distintos): dejar vacío
# ironloot.local (requiere entries en hosts file): .ironloot.local
# Production: .ironloot.com
COOKIE_DOMAIN=.localhost
```

---

## Build BASE y CLIENT

**Command:** `cd src/apps/base && npm run build && cd src/apps/client && npm run build`

```
> @ironloot/base@0.1.0 build
> nest build
(exit 0)

> @ironloot/client@0.1.0 build
> nest build
(exit 0)
```

---

## Git commit

**Command:** `git show dfb1f48 --stat`

```
commit dfb1f48db1721369e24bd07d8708f01e06caddc4
Author: Alberto Martínez <alberto@a81.biz>
Date:   Tue Jun 23 21:16:29 2026 -0600

    fix: PT-034 set COOKIE_DOMAIN default .localhost for Docker subdomain SSO

 .env.example       | 7 ++++---
 docker-compose.yml | 5 +++--
 2 files changed, 7 insertions(+), 5 deletions(-)
```

Solo 2 archivos — exactamente los definidos en `tasks.md`. Sin `src/` modificado.

---

## Nota: .gitignore working tree

`git status` muestra `.gitignore` modificado (añade `changes/`) en el working tree, sin staging. Esta modificación es **pre-existente** al inicio de PT-034 y **no fue incluida** en el commit. No es parte del scope de este PT.

---

## BLOQUEO DETECTADO EN STATE 5 — 2026-06-24

### Prueba E2E con curl

**Registro de usuario de prueba:**
```
POST http://base.localhost/api/v1/auth/register
→ 201 Created
Set-Cookie: access_token=...; Domain=.localhost; HttpOnly; SameSite=Lax  ✓ (servidor correcto)
Set-Cookie: refresh_token=...; Domain=.localhost; HttpOnly; SameSite=Lax ✓ (servidor correcto)
```

**Acceso a client.localhost con cookie jar:**
```
cat /tmp/cookies.txt → VACÍO (curl rechazó las cookies)
GET http://client.localhost/dashboard → 302 (no cookie enviada)
```

### Root Cause Real

El servidor genera el `Set-Cookie: Domain=.localhost` correctamente. El bloqueo es en el **cliente (navegador/curl)**:

- `localhost` está en la Public Suffix List como eTLD efectivo
- RFC 6265 §5.3 step 6: una cookie cuyo `domain-attribute` sea un public suffix es rechazada
- Chrome/Edge (Chromium), Firefox, y curl aplican esta restricción
- El navegador descarta la cookie `Domain=.localhost` antes de almacenarla → `client.localhost` nunca recibe el token

**Verificación:**
- `docker exec ironloot-base env | grep COOKIE_DOMAIN` → `COOKIE_DOMAIN=.localhost` ✓
- `docker exec ironloot-client env | grep COOKIE_DOMAIN` → `COOKIE_DOMAIN=.localhost` ✓
- Respuesta del servidor incluye `Domain=.localhost` en Set-Cookie ✓
- curl cookie jar vacío tras el request ← **cookies rechazadas por el cliente**

### Opciones para desbloquearlo

**Opción A — ironloot.local** (entorno local con hosts file — ya documentado en CLAUDE.md):
- Configurar `/etc/hosts` (Windows: `C:\Windows\System32\drivers\etc\hosts`) con `127.0.0.1 base.ironloot.local`
- Cambiar `COOKIE_DOMAIN=.ironloot.local` en `.env`
- `ironloot.local` NO es un public suffix → cookies con `Domain=.ironloot.local` aceptadas por todos los navegadores

**Opción B — SSO token handoff** (sin hosts file — requiere nuevo PT):
- BASE no redirige directamente a `client.localhost/dashboard`
- En cambio: guarda el JWT en Redis con TTL 30s, redirige browser a `client.localhost/auth/handoff?sid=<redis-key>`
- CLIENT hace lookup en Redis, obtiene el JWT, establece su propia cookie HttpOnly en su dominio
- Más complejo; requiere PT-035

### Estado

PT-034 — VALIDATION_PENDING (bloqueado: la configuración del servidor es correcta pero los navegadores rechazan `Domain=.localhost`)
