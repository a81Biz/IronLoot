# Registro de Hallazgos — QA Visual por Navegador (2026-07-24)

> Estado metodológico: hallazgos **NO cerrados**. La corrección sigue el flujo FDGE (no se modificó código
> de aplicación en esta corrida de QA). Los bugs requieren validación humana; no se auto-cierran.

Severidades: `CRÍTICA` (bloquea negocio) · `ALTA` (función rota, sin workaround para el usuario) ·
`MEDIA` (defecto visible sin bloquear) · `BAJA` (cosmético).

---

## BUG-QA-N01 — El saldo del wallet no se muestra (contrato CLIENT↔API)

- **Severidad:** ALTA
- **Dimensión:** D2 (Integridad) — patrón de desincronización de contrato
- **Área:** CLIENT (SSR/BFF) ↔ API

**Descripción.** El portal CLIENT llama server-side a `GET /api/v1/wallet`, que **no existe** en la API
(devuelve 404). La ruta correcta es `GET /api/v1/wallet/balance` (200, `{available, held, currency, isActive}`).
Como la llamada falla, la vista recibe `wallet = null` y muestra saldo **$0** aunque el usuario tenga fondos.

**Evidencia.**
- `error_events`: **18** entradas `Cannot GET /api/v1/wallet` durante la corrida.
- curl: `/api/v1/wallet` → **404**; `/api/v1/wallet/balance` → **200** `{"available":5000,"held":0,...}`.
- Impacto visible: detalle de subasta muestra `saldo disponible: $0 MXN` con `balance=5000` real en BD.
- Screenshots: `30-e2e/buyer1_before_bid.png`, `20-authed/QA-CLI-04__wallet.png`.

**Ubicación (código).** `src/apps/client/src/app.controller.ts`
- Línea 35 (dashboard), 86 (`/wallet`), 206 (detalle de subasta): `apiGet(token, '/api/v1/wallet')`.

**Reproducción.** Login como comprador con saldo → abrir `/wallet` o `/dashboard` o `/auctions/:id` →
el saldo aparece como `$0`. En logs de API: `Cannot GET /api/v1/wallet`.

**Corrección propuesta.** Cambiar las 3 llamadas a `/api/v1/wallet/balance` y mapear `available`/`held`
al modelo que espera la plantilla.

**Estado:** ABIERTO · VALIDATION_PENDING (requiere PT vía FDGE).

---

## BUG-QA-N02 — Las pujas del usuario no se listan (contrato CLIENT↔API)

- **Severidad:** ALTA
- **Dimensión:** D2 — desincronización de contrato
- **Área:** CLIENT (SSR/BFF) ↔ API

**Descripción.** El portal llama `GET /api/v1/bids/my` (dashboard y "Mis pujas"), ruta **inexistente** (404).
La API expone `GET /api/v1/bids/my-active` y `GET /api/v1/bids/my-history`. Resultado: el dashboard no muestra
"pujas recientes" y `/my-bids` no lista el historial.

**Evidencia.**
- `error_events`: **14** `Cannot GET /api/v1/bids/my?limit=5` + **1** `?page=1`.
- curl: `/api/v1/bids/my` → **404**; `/api/v1/bids/my-active` → **200**.

**Ubicación (código).** `src/apps/client/src/app.controller.ts`
- Línea 36 (dashboard): `apiGet(token, '/api/v1/bids/my?limit=5')`.
- Línea 65 (`/my-bids`): `apiGet(getToken(req), '/api/v1/bids/my?page=${page}')`.

**Reproducción.** Login como comprador que ya pujó → `/dashboard` no muestra pujas; `/my-bids` sale vacío.
En logs de API: `Cannot GET /api/v1/bids/my`.

**Corrección propuesta.** Usar `/api/v1/bids/my-active` (dashboard) y `/api/v1/bids/my-history` (paginado en
`/my-bids`), ajustando el mapeo de la respuesta.

**Estado:** ABIERTO · VALIDATION_PENDING (requiere PT vía FDGE).

---

## OBS-01 — Onboarding habilita vendedor sin submission de KYC

- **Severidad:** BAJA (observación de dominio)

`/seller/onboarding` → `enable-seller` deja `is_seller=true` **sin** crear fila en `kyc_submissions`.
No existe gate de KYC en ese flujo (QA-BOOT-08 quedó N/A: no hay nada que aprobar). Verificar si el diseño
pretende un KYC obligatorio antes de vender; si es así, falta el paso de creación de KYC en el onboarding.

**Evidencia.** `kyc_submissions=0` tras onboarding con `is_seller=true`.

---

## OBS-02 — console.error cosméticos

- **Severidad:** BAJA (cosmético)

Dos fuentes de `console.error` sin impacto funcional:
1. `favicon.ico` 404 en algunas vistas (previamente "no reproduce"; reaparece intermitente en primera carga).
2. `401` esperado al cargar `/auth/verify-email?token=<inválido>` (la validación del token responde 401 y el
   fetch lo registra en consola). La página renderiza correctamente. Considerar manejar el 401 sin log a consola.

---

## OBS-03 — API mantiene conexiones Prisma muertas tras `prisma migrate reset`

- **Severidad:** Nota de infraestructura / testing (no afecta operación normal)

Tras un `prisma migrate reset` con la API en ejecución, las primeras escrituras fallan (pool Prisma apuntando
a la BD anterior) hasta que el pool se reconecta. Para QA "desde cero" reproducible, **reiniciar la API**
(`docker restart ironloot-api`) tras el reset. No es un defecto de producto; es relevante para scripts de QA/CI.

---

## Casos que PASARON (resumen)

- 57/57 rutas smoke (0 caídas, guards OK).
- 41/41 pantallas privadas autenticadas (comprador, vendedor, admin) con **0 errores de consola**.
- E2E puja + outbid con contabilidad de ledger correcta.
- Auth: login inválido, registro duplicado, validaciones, logout, **cookie `access_token` HttpOnly sin fuga a JS**.
- Responsive 0px overflow @375/768/1366 (BASE + CLIENT); CSP presente en las 3 apps; cross-browser Firefox + WebKit.
- Escrituras admin: comisión global, SEO, CMS, suspensión de usuario — todas persistidas.
