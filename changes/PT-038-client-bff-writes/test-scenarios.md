# PT-038 — Escenarios de prueba

## A — `injectAuthHeader` (unit)
| # | Given | When | Then |
|---|---|---|---|
| A1 | `req.cookies.access_token = 'tok'` | `injectAuthHeader(proxyReq, req)` | `proxyReq.setHeader` llamado con `Authorization`, `Bearer tok` |
| A2 | `req.cookies` sin `access_token` | idem | **no** se setea `Authorization` |
| A3 | `req.cookies` undefined | idem | no lanza; no setea header |

## B — Paridad de rutas en las 8 plantillas (estático)
| # | Comprobación |
|---|---|
| B1 | Ninguna de las 8 plantillas usa `fetch(API + ...)` para escritura (todas relativas `/api/v1/...`) |
| B2 | Método/ruta de cada plantilla ∈ `Catalogo-de-API`: deposit/withdraw `POST`, auctions `POST`, edit `PATCH /auctions/:id`, disputes `POST`, profile `PATCH /users/me`, settings `PATCH /users/me/settings`, onboarding `POST /users/me/enable-seller` |

## C — Build / typecheck
| # | Comprobación |
|---|---|
| C1 | `npm run build` (CLIENT) OK |
| C2 | `tsc --noEmit` (CLIENT) OK |

## D — E2E (opcional, si CLIENT+API arriba)
| # | Given | When | Then |
|---|---|---|---|
| D1 | Usuario autenticado (cookie `access_token`) | escritura desde la UI (p. ej. deposit) | request al API llega con `Authorization: Bearer` y responde 2xx (no 401/404) |

> D1 requiere CLIENT+API+DB levantados; si no, se documenta como pendiente de entorno (como en PT-036 con el e2e de throttle).
