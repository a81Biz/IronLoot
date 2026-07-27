# PT-034 — Design Decisions

**PT:** PT-034  
**Slug:** cookie-domain-docker  
**Tipo:** BUG  
**Fecha:** 2026-06-23

---

## Decisión principal: fix de configuración pura, cero cambios en `src/`

### Contexto

El login no funciona en el entorno Docker porque la cookie `access_token` es escrita por BASE (`base.localhost`) sin atributo `Domain`. Sin ese atributo, los navegadores modernos (RFC 6265) restringen la cookie al host exacto que la emitió. Cuando el usuario es redirigido a `client.localhost`, el navegador no envía la cookie y `ClientAuthGuard` redirige de vuelta a login.

La lógica en `src/apps/base/src/main.ts` ya es correcta:

```typescript
const cookieDomain = process.env.COOKIE_DOMAIN || undefined;
// ...
...(cookieDomain ? { domain: cookieDomain } : {}),
```

El código lee `COOKIE_DOMAIN` y lo aplica si existe. El problema es que `COOKIE_DOMAIN` no está configurado para el entorno Docker. No hay nada que corregir en el código.

### Decisión: corregir en docker-compose, no en `main.ts`

**Opción elegida:** Añadir un valor por defecto `.localhost` al nivel de docker-compose usando la sintaxis de sustitución `${COOKIE_DOMAIN:-.localhost}`.

**Por qué no en `main.ts`:** La topología de red (subdominios) es una propiedad del entorno de despliegue, no de la aplicación. Hardcodear un fallback en el código acoplaría la aplicación a una decisión de infraestructura. El patrón correcto en NestJS/12-factor es: la aplicación lee variables de entorno; el entorno proporciona valores apropiados.

**Por qué `:-` y no `-`:** El operador `:-` aplica el default si la variable está vacía O no definida. El `.env.example` define `COOKIE_DOMAIN=` (vacío), por lo que sin `:-` el string vacío no activaría el default. Con `:-`, tanto `COOKIE_DOMAIN=` como ausencia total de la variable usan `.localhost`.

### Por qué el mismo cambio en `client` y no solo en `base`

`ClientAuthGuard` llama `res.clearCookie('access_token', { domain: COOKIE_DOMAIN, path: '/' })` en el caso de JWT inválido (línea 26 del guard). Si la cookie fue escrita con `domain=.localhost` pero se intenta borrar sin domain, el navegador trata la operación como cookies distintas y la sesión no se limpia. Coherencia obligatoria entre set y clear.

### Decisión secundaria: `JWT_SECRET` explícito en `api` environment

**Problema:** La API usa `env_file: ./src/api/.env` y `CLIENT` usa `${JWT_SECRET}` del root `.env`. Dos archivos distintos. Si difieren, `jwt.verify()` falla incluso cuando la cookie llega correctamente.

**Solución elegida:** Añadir `- JWT_SECRET=${JWT_SECRET}` al bloque `environment` del servicio `api` en docker-compose. Los valores en `environment` tienen precedencia sobre `env_file` — esto fuerza a que la API use el mismo JWT_SECRET que CLIENT cuando corre bajo Docker.

**Alternativa rechazada:** Instruir al usuario a mantener sincronizados dos archivos `.env` distintos. Frágil y propenso a errores silenciosos.

### Cambio en `.env.example`

El `.env.example` actual tiene `COOKIE_DOMAIN=` (vacío). Cambiarlo a `COOKIE_DOMAIN=.localhost` con un comentario de tres entornos comunica la intención correcta para Docker. Un developer que use desarrollo local puro (no Docker) puede sobreridirlo con el valor vacío.

---

## Ramas descartadas

- Modificar `main.ts` (BASE) para inferir el dominio → acopla infraestructura al código
- Cambiar topología Docker a `ironloot.local` obligatorio → requiere acción manual por developer
- Eliminar `jwt.verify()` en ClientAuthGuard → degrada seguridad del portal CLIENT
