# Evidencia — PT-100 (F-30)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-100-sesion-admin`

## El síntoma apuntaba en la dirección equivocada

24 checks de administración rebotaban a `/login` con `bouncedToLogin: true`. La lectura natural
—«la sesión no persiste»— era **falsa**.

## Cómo se descartó esa hipótesis

| Comprobación | Resultado | Qué descarta |
|---|---|---|
| `POST /login` con `curl` por el subdominio | **302**, cookie emitida | El login funciona |
| `GET /` con esa cookie, sin seguir redirecciones | **200**, sin rebote | **La sesión SÍ persiste en el servidor** |
| Mismo flujo en navegador, `localhost:3001` | sesión OK, `connect.sid@localhost` | El código es correcto |
| Mismo flujo en navegador, `admin.ironloot.local` | `chrome-error://chromewebdata/`, **cero cookies** | El fallo es del navegador, y ocurre **antes** de la cookie |

Que `curl` funcionara y el navegador no, con el mismo servidor, dejaba una sola familia de causas:
algo que el navegador hace y `curl` no.

## La causa

```
FALLO: GET  https://admin.ironloot.local/css/admin.css :: net::ERR_CONNECTION_REFUSED
FALLO: POST https://admin.ironloot.local/login         :: net::ERR_CONNECTION_REFUSED
```

**El navegador subía cada petición a HTTPS**, donde no escucha nadie. Es
`upgrade-insecure-requests`, que Helmet añade por defecto.

No se notaba con `localhost` porque **los navegadores lo eximen** de esa subida. Al mover la suite
a subdominios (PT-088/PT-097) la directiva empezó a aplicarse de verdad.

La sesión nunca fue el problema: **la petición no llegaba**.

## La corrección

```ts
upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
```

**BASE y CLIENT ya lo hacían así** (`base/src/main.ts:67`). ADMIN se había quedado fuera — por eso
solo se rompió el panel.

## Verificado

```
                              antes                        ahora
admin.ironloot.local   chrome-error, 0 cookies    SESION OK, connect.sid@admin.ironloot.local
localhost:3001         SESION OK                  SESION OK   (sin regresión)
```

Cabecera comprobada: ADMIN ya no envía `upgrade-insecure-requests` en desarrollo.

## La guarda

`QA-CSP-UIR-{BASE,CLIENT,ADMIN}` en la fase de extras: comprueba que **ningún sitio** fuerza HTTPS
en desarrollo. Si alguno vuelve a hacerlo, falla ahí y no en 24 checks cuyo mensaje apunta a otra
cosa.

## Anotado de paso

**ADMIN no tiene infraestructura de tests**: sin script `test` ni carpeta. PT-091 le dio linter,
pero no pruebas — por eso esta guarda vive en la suite de navegador y no en un test unitario. Es
deuda propia y queda registrada.
