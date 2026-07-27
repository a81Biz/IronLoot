# Evidencia — PT-098 (F-25)

**Fecha**: 2026-07-27 · **Rama**: `fix/PT-098-puja-en-vivo`

## El fallo, medido antes

| Eslabón | Valor |
|---|---|
| `API_URL` en el contenedor de CLIENT | `http://api:3000` (interna de Docker) |
| `app.controller.ts:269` | `return { …, apiUrl: API_URL }` |
| `detail.html:69` | `io(API + '/auctions', …)` |
| CSP `connect-src` | `'self' http://api:3000 ws://api:3000` |

La política de seguridad permitía **exactamente lo que el navegador no puede alcanzar, y nada
más**. El defecto se había propagado de la plantilla a la CSP.

## La corrección

No se cambió la dirección por otra: **se quitó**. La vista conecta a su propio origen y CLIENT
reenvía `/socket.io` a la API con `ws: true`.

> Una URL relativa no puede apuntar mal. La alternativa —usar el origen público de la API— habría
> sustituido una dirección incorrecta por otra que hay que mantener sincronizada con el entorno,
> que es justo lo que falló en PT-088, PT-089 y aquí.

## Verificado

### Infraestructura

```
CSP servida:   connect-src 'self'          (ya no menciona api:3000)
proxy nginx:   GET /socket.io/?EIO=4&transport=polling  ->  HTTP 200
```

### La prueba que importa: dos navegadores, misma subasta

```
WebSocket abierto por el navegador B:
  ws://client.ironloot.local/socket.io/?EIO=4&transport=websocket

puja del navegador A (por API):  HTTP 201, importe 777
B ve 777 SIN recargar:           SI
```

La captura `puja/02-despues.png` muestra en el navegador B, sin recarga:

```
Precio actual: $777 MXN
Pujas recientes
  $777 — 2026-07-27T04:55:46.465Z
```

### Suites

| | |
|---|---|
| API | **60 suites / 406 tests** |
| CLIENT | **5 suites / 71 tests** (era 4/14: +1 suite, +57 casos de la guarda) |
| CORE | 8 / 134 |
| BASE | compila |

## La guarda que impide la tercera vez

`no-absolute-api-origin.spec.ts` recorre **todas** las plantillas de CLIENT y exige que ninguna
incruste `http://api:<puerto>`, `ws://api:<puerto>` ni `localhost:<puerto>`, que ninguna declare ya
`{{ apiUrl }}`, y que la puja en vivo conecte a `/auctions` relativo. Añadir una plantilla con el
defecto rompe la suite.

## De regalo: 9 plantillas dejaron de filtrar el nombre interno

`const API = '{{ apiUrl }}'` se declaraba en nueve plantillas y **se usaba en una**. Las nueve
imprimían `http://api:3000` en el HTML servido al navegador: topología interna revelada a cambio
de nada. Ya no aparece en ninguna.
