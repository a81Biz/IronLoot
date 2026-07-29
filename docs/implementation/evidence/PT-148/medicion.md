# PT-148 — Evidencia

## Lo que la ampliación destapó

La guarda pasó de mirar **un** sitio a mirar **tres**, y al hacerlo salieron **tres defectos de la
propia guarda**. Ninguna ruta de producción estaba rota. Eso también es un resultado, y conviene
decirlo claro: la ampliación no encontró bugs en BASE ni en ADMIN — encontró que **la guarda no
sabía mirar**.

### 1. Un fichero con dos `@Controller` sólo registraba el primero

`bids.controller.ts` declara `@Controller('auctions/:auctionId/bids')` **y** `@Controller('bids')`.
El analizador usaba `src.match(...)`, que devuelve la primera coincidencia, así que
`@Get('my-active')` quedaba registrado como `/auctions/:auctionId/bids/my-active`.

```
CLIENT/bids-view.ts: /api/v1/bids/my-active     ← acusada
CLIENT/bids-view.ts: /api/v1/bids/my-history    ← acusada
```

**Las dos existen** (`bids.controller.ts:54` y `:65`). Estuve a punto de "corregir" código sano por
creerle a la guarda; lo que lo evitó fue mirar el controlador antes de tocar nada.

### 2. Una constante de base rompía la comprobación por los dos lados

ADMIN escribe `const API = '/api/v1/admin'` y llama `fetch(\`${API}/reconciliation?…\`)`. La guarda
acusaba `/api/v1/admin` —que es un prefijo, no una ruta— y **no veía ninguna de las llamadas
reales**, porque empiezan por `${`.

Resolver las bases no fue silenciar un falso positivo: **es lo que hace que ADMIN quede cubierto de
verdad**. Ahora se verifican `/api/v1/admin/reconciliation` y `/api/v1/admin/reconciliation/export`
contra `admin.controller.ts:662` y `:698`. Antes no se verificaba nada de ese fichero.

### 3. No recorría subdirectorios del SSR

`readdirSync(CLIENT).filter(n => n.endsWith('.ts'))` — plano. `bids-view.ts` vive en
`src/apps/client/src/common/bff/` y **nunca se había mirado**, ni siquiera en el sitio que la guarda
sí cubría.

## Resultado

```
✓ se han leido rutas del API — si no, la guarda no compara nada
✓ CLIENT no invoca ninguna ruta inexistente
✓ BASE   no invoca ninguna ruta inexistente
✓ ADMIN  no invoca ninguna ruta inexistente
✓ C1 … C7  (siete casos de control)
```

Cada sitio comprueba además que **leyó al menos un fichero**. Sin eso, un sitio cuya ruta cambiara
pasaría en vacío: cero ficheros, cero rotas, verde — la forma en que una guarda deja de proteger sin
que nadie lo note.

## Suite

`796` en 103 suites (790 → 796: **+4** de la guarda ampliada más los dos casos de control nuevos).
