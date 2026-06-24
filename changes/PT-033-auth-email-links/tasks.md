# PT-033 — Tasks

**PT**: PT-033  
**Branch**: `fix/PT-033-auth-email-links`  
**Fecha**: 2026-06-23

---

## PT-033.1
**Objetivo:**    Escribir el test de unidad de `EmailService` en RED — debe fallar antes de aplicar el fix.  
**Input:**       Patrón de test de `notifications.service.spec.ts`; código actual de `email.service.ts:17` (usa `CLIENT_URL`).  
**Output:**      `src/api/test/unit/notifications/email.service.spec.ts` con 3 tests:
  - `sendVerificationEmail()` genera URL que empieza con `BASE_URL`
  - `sendPasswordResetEmail()` genera URL que empieza con `BASE_URL`
  - Fallback cuando `BASE_URL` no configurada → `http://localhost:5174`  
**Validación:**  `npx jest --testPathPattern="email.service" --no-coverage` falla con "Expected: http://localhost:5174... Received: http://localhost:5173..." (RED confirmado).  
**Status:**      DONE

---

## PT-033.2
**Objetivo:**    Corregir `EmailService.frontendUrl` para usar `BASE_URL` con default correcto.  
**Input:**       `src/api/src/modules/notifications/email.service.ts:17` — test RED de PT-033.1.  
**Output:**      Línea 17 cambiada:
  ```typescript
  // ANTES:
  this.frontendUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:5173');
  // DESPUÉS:
  this.frontendUrl = this.configService.get<string>('BASE_URL', 'http://localhost:5174');
  ```  
**Validación:**  `npx jest --testPathPattern="email.service" --no-coverage` pasa (GREEN). `npm run typecheck` 0 errores.  
**Status:**      DONE

---

## PT-033.3
**Objetivo:**    Registrar `NotFoundExceptionFilter` en BASE para que los 404 rendericen una página HTML pública (sin sidebar).  
**Input:**       `src/apps/base/src/main.ts` (sin `useGlobalFilters`); filtro existente en `src/apps/base/src/common/filters/not-found.filter.ts`.  
**Output:**      `src/apps/base/src/main.ts` con las dos líneas añadidas:
  ```typescript
  import { NotFoundExceptionFilter } from './common/filters/not-found.filter';
  // ...
  app.useGlobalFilters(new NotFoundExceptionFilter());
  ```  
**Validación:**  `npm run build` (BASE) sin errores. Navegando a una ruta inexistente en BASE devuelve status 404 con HTML (no JSON).  
**Status:**      DONE

---

## PT-033.4
**Objetivo:**    Añadir `BASE_URL` al bloque `environment` del servicio `api` en docker-compose para que `EmailService` use el hostname correcto dentro de Docker.  
**Input:**       `docker-compose.yml` bloque `api.environment` (líneas 83–95).  
**Output:**      Nueva línea `- BASE_URL=http://base.localhost` en el bloque `environment` del servicio `api` (coherente con `CLIENT_URL=http://client.localhost` que ya existe para el servicio `base`).  
**Validación:**  `docker-compose config` no arroja errores; email de verificación generado en Docker apunta a `http://base.localhost/auth/verify-email?token=...`.  
**Status:**      DONE

---

## PT-033.5
**Objetivo:**    Documentar `BASE_URL` en `.env.example` para que los desarrolladores sepan que es necesaria.  
**Input:**       `.env.example` (actualmente sin `BASE_URL`).  
**Output:**      Entrada añadida con comentario explicativo en la sección de URLs de servicios.  
**Validación:**  `grep BASE_URL .env.example` devuelve la nueva línea.  
**Status:**      DONE

---

## PT-033.6
**Objetivo:**    Verificar que todos los cambios no producen regresiones en el test suite completo de la API.  
**Input:**       Todos los cambios de PT-033.1–PT-033.5 aplicados.  
**Output:**      Reporte de `npm test` (API): todos los tests pasan; reporte de `npm run build` (BASE): 0 errores.  
**Validación:**  `npm test` en `src/api/` — todos pasan. `npm run build` en `src/apps/base/` — 0 errores.  
**Status:**      DONE
