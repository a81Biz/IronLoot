# spec-changes — PT-088

## Configuración (contrato de despliegue)

| Variable | Antes | Ahora |
|---|---|---|
| `PUBLIC_SCHEME` | no existía | `http` local / `https` producción |
| `PUBLIC_DOMAIN` | no existía | `ironloot.local` local / `ironloot.com` producción |
| `COOKIE_DOMAIN` | vacío (cookie host-only) | `.ironloot.local` |
| `NGINX_HTTP_PORT` | `8080` | `80` |
| `BASE_URL` / `CLIENT_URL` | escritas a mano en 3 sitios, con 2 valores distintos | **derivadas** de las dos primeras |

## API

**Nuevo**: `GET /payments/status/:reference` (autenticado, `JwtAuthGuard`).

```json
{
  "reference": "DEP-<userId>-<ts>",
  "provider": "PAYPAL",
  "status": "SETTLED",
  "amount": 275.4,
  "currency": "MXN",
  "settled": true,
  "failed": false,
  "pending": false,
  "requestedAt": "2026-07-27T03:21:10.888Z",
  "settledAt": "2026-07-27T03:22:41.020Z"
}
```

`404` si no existe **o no es del usuario** — deliberadamente indistinguibles.

## Contrato con las pasarelas

Las cuatro devuelven ahora a `/wallet/deposit/return?ref=<referencia>&status=<estado>`, con
`status` ∈ `success | failure | pending | cancel`. Stripe añade su `session_id` sobre esa URL.

**Acción de despliegue**: hoy las URLs de retorno viajan en cada petición, no están registradas en
los paneles de las pasarelas, así que no hay nada que actualizar del lado de ellas. Si en algún
momento se registraran, habría que cambiarlas allí también.

## Frontend (CLIENT)

Nueva ruta `GET /wallet/deposit/return` con su vista y su script de refresco.

## Base de datos

Ninguna.
