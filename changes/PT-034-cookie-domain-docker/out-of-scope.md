# PT-034 — Out of Scope

**PT:** PT-034  
**Fecha:** 2026-06-23

---

Las siguientes áreas NO forman parte de PT-034:

1. **Configuración de COOKIE_DOMAIN para producción (`ironloot.com`)** — requiere decisión de negocio sobre el dominio final. PT-034 solo cubre el default de Docker dev (`.localhost`). La producción debe configurar `COOKIE_DOMAIN=.ironloot.com` manualmente en su entorno.

2. **Configuración de hosts file para `ironloot.local`** — es una alternativa opcional documentada en `CLAUDE.md`. PT-034 no cambia la topología de subdominios ni provee soporte explícito para `ironloot.local`.

3. **Implementar refresh token automático** — el token `access_token` expira en 15 minutos. El flujo de refresh (`/auth/refresh`) existe en el API pero no está implementado en el lado del cliente (BASE/CLIENT JS). Esto es deuda técnica preexistente y está fuera del scope de este PT.

4. **Tests E2E automatizados del flujo de login** — PT-034 no incluye la creación de tests de Playwright, Cypress, u otro framework E2E. Las verificaciones TS-034.1 a TS-034.3 son manuales.

5. **Resolver el error Docker de `nestjs-throttler-storage-redis`** — el TypeScript compilation error observado en el log Docker (módulo no instalado en el volumen anónimo de node_modules) es un issue operacional separado. Fix: `docker-compose build api`. No está relacionado con la causa raíz del login.

6. **Cambios en `src/apps/base/src/main.ts` o `ClientAuthGuard`** — la lógica de cookies y la lógica del guard son correctas. No requieren modificación.

7. **Validación adicional de JWT en BASE** — BASE no valida el JWT del usuario en sus rutas de páginas estáticas (by design: el API valida cuando se hacen llamadas). Este comportamiento no cambia.

8. **2FA (TOTP)** — el módulo de 2FA existe en la API pero el flujo de login de BASE no lo integra aún. Fuera de scope.

9. **Sincronización de `./src/api/.env` con root `.env`** — aunque se añade `JWT_SECRET` explícito al bloque `environment` de la API en docker-compose (garantizando coherencia en Docker), la gestión de los dos archivos `.env` para desarrollo local puro queda en manos del developer.
