# PT-038 — Design: BFF proxy en CLIENT + corrección de escrituras

**Tipo**: BUG (arquitectónico) · **Complejidad**: MAJOR · **Origen**: AUD-003
**Fuentes**: PT-038 Discovery/Context, `PLAN_ACTUAL.md`, `ADR-003`/`ADR-004`, `Catalogo-de-API`, referencia `base/src/main.ts:76-87`.

## Decisiones

### D1 — Función pura para inyección de header (testable)
Nuevo `src/apps/client/src/common/bff/inject-auth-header.ts`:
```
export function injectAuthHeader(proxyReq, req): void {
  const token = req.cookies?.['access_token'];
  if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`);
}
```
Permite unit-testar la lógica sin arrancar Nest (patrón de PT-036 con `validateStartupConfig`).

### D2 — Cablear el proxy BFF en CLIENT (`src/apps/client/src/main.ts`)
Espejo de BASE: `app.use('/api', createProxyMiddleware({ target: API_URL, changeOrigin: true, pathRewrite: { '^/': '/api/' }, on: { proxyReq: injectAuthHeader } }))`. Montado **antes** del render SSR; solo intercepta `/api/*`. `API_URL` desde env (igual que BASE).

### D3 — Corregir las 8 plantillas (`views/pages/*`)
`fetch(API + '/api/v1/...')` → `fetch('/api/v1/...')` (relativo, same-origin → proxied) + alinear método/ruta con `Catalogo-de-API`:

| Plantilla | Método/ruta final |
|---|---|
| `wallet/deposit.html` | `POST /api/v1/wallet/deposit` |
| `wallet/withdraw.html` | `POST /api/v1/wallet/withdraw` |
| `auction/create.html` | `POST /api/v1/auctions` |
| `auction/edit.html` | `PATCH /api/v1/auctions/:id` |
| `disputes/create.html` | `POST /api/v1/disputes` |
| `profile.html` | `PATCH /api/v1/users/me` |
| `settings.html` | `PATCH /api/v1/users/me/settings` |
| `seller/onboarding.html` | `POST /api/v1/users/me/enable-seller` |

### D4 — CSRF sin cambios
Se mantiene la postura de BASE (Bearer + `sameSite: Lax`). No se aborda AUD-014 aquí.

## Componentes tocados
- `src/apps/client/src/common/bff/inject-auth-header.ts` — **nuevo**.
- `src/apps/client/src/main.ts` — cablear proxy (+ import http-proxy-middleware, ya en package.json).
- 8 plantillas `views/pages/*`.
- Test: `src/apps/client/test/inject-auth-header.spec.ts` (nuevo) — requiere config jest en CLIENT (ver tasks).

## No se toca
API, dominio core, BD, path de lectura `apiGet`/`getToken`, BASE, ADMIN.
