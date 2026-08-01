# Evidencia — PT-204 (R-023) + PT-213 (R-051)

**Fecha:** 2026-07-31 · **Rama:** `fix/PT-204-contrato-forma-de-lista`
**Hallazgos que cierra:** `H-UI-001`, `H-UI-002`, `H-UI-003`, `H-UI-004` (los cuatro P0 de pantalla vacía)

---

## 1. El contrato, medido en vivo antes de tocar nada

```
$ curl -s "http://localhost:3000/api/v1/auctions?status=ACTIVE&limit=6"
{"data":[],"total":0,"page":1,"limit":6}
```

**No hay clave `items`.** El catálogo público leía `data?.items` y la portada medía `auctions.length`
sobre ese objeto. Las dos operaciones dan `undefined` **con cualquier número de subastas**, y `undefined`
en Nunjucks no es un error: es un `{% else %}`.

Origen del contrato: `src/api/src/modules/auctions/auctions.service.ts:150-155`.
Confirmado que no hay interceptor global de transformación en `main.ts` / `app.module.ts`.

## 2. RED — la guarda falla contra el código anterior

`npx jest --testPathPattern=forma-de-lista-ssr` sobre el árbol previo:

```
× CLIENT: toda lista que viene del API pasa por toItems y se lee como X.items
× BASE:   toda lista que viene del API pasa por toItems y se lee como X.items

  "CLIENT pages/dashboard.html: la plantilla lee «auctions.items» pero el controlador
   devuelve «auctions» sin normalizar."
  "CLIENT pages/watchlist.html: «items» viene del API y la plantilla la recorre en crudo."
  "CLIENT pages/notifications/list.html: la plantilla lee «notifications.items» … sin normalizar."
  "CLIENT pages/disputes/list.html: la plantilla lee «disputes.items» … sin normalizar."
  "CLIENT pages/auction/detail.html: «bids» viene del API y la plantilla la recorre en crudo."
  "BASE pages/home.html: «auctions» viene del API y la plantilla la recorre en crudo."
  "BASE pages/auctions/list.html: «auctions» viene del API y la plantilla la recorre en crudo."

Tests: 2 failed, 5 passed, 7 total
```

**Siete consumidores rotos, dos más de los cuatro que la auditoría había encontrado a mano.** Los dos
extra —`watchlist` y `bids`— funcionan hoy porque esos endpoints devuelven arrays planos; están en la
lista porque se romperían del mismo modo el día que el API los pagine, que es exactamente lo que le pasó
a `/auctions`.

## 3. Tres veces que la guarda midió otra cosa, y cómo se vio

Se anota porque es el mismo defecto que la guarda persigue, cometido por la guarda:

| # | Qué medía mal | Cómo se vio |
|---|---|---|
| 1 | `pages/pages/x.html` — el prefijo de carpeta duplicado: **no cruzaba ninguna plantilla** y salía verde | Leerla con desconfianza. Se añadió `expect(cruzadas).toBeGreaterThan(5)`, que es lo que la habría delatado sola |
| 2 | `'fetchJson('` como subcadena literal, cuando BASE escribe `fetchJson<any[]>(` | El resultado absurdo: CLIENT en rojo y BASE —con los dos peores casos— en verde |
| 3 | `const auctions =` resuelto **en el fichero entero**: encontraba la de `home()` en vez de la de `auctionsList()` | Acusó a código ya corregido. Se acotó la resolución al cuerpo del método |

La lección queda escrita en el propio fichero: **una guarda que no cruza nada sale en verde y parece que
protege.** Por eso lleva cuenta de cruces y seis casos de control en las dos direcciones.

## 4. GREEN

```
$ npx jest --testPathPattern="forma-de-lista-ssr|rutas-que-los-ssr"
Test Suites: 2 passed, 2 total
Tests:       21 passed, 21 total
```

Sin regresión en el resto:

```
CLIENT   Test Suites: 12 passed · Tests: 144 passed
BASE     Test Suites:  2 passed · Tests:  10 passed   (era 1 suite / 3 tests)
typecheck CLIENT y BASE: sin errores
```

`src/apps/base/test/list-view.spec.ts` prueba el normalizador **contra la respuesta literal capturada
arriba**, no contra una forma recordada. Incluye los dos casos que reproducen el defecto: `.items` sobre
la respuesta cruda da `undefined`, y `.length` sobre el objeto también.

---

## 5. Self-Review (STATE 5)

- [x] **Criterios verificados.** Los cuatro hallazgos P0 tienen su consumidor normalizado y una prueba
      que falla si vuelve.
- [x] **Escenarios del Proposal Package pasando** (`PT-204.1`, `.2`, `.3`, `PT-213.1`).
- [x] **Sin efectos colaterales.** `toItems` es aditivo: acepta las tres formas y las tres rutas que ya
      lo usaban desde PT-067 no cambian de comportamiento. 144 pruebas de CLIENT intactas.
- [x] **`11-Conventions.md` respetado.** Sin JS ni `style=` en plantillas; sin `<script>` nuevos; el
      fichero duplicado en BASE declara por qué lo está, siguiendo el criterio de
      `variable-obligatoria.ts`.
- [x] **Commits atómicos** trazables a PT-204 / PT-213.
- [x] **Sin artefactos de depuración.** `salida-guarda.txt` es temporal y no se versiona.
- [x] **Documentación:** el cambio de forma de las plantillas queda descrito en el propio normalizador.

## 6. Lo que esta evidencia NO demuestra

**Que el catálogo pinte subastas de verdad.** La base está vacía (`total: 0`) porque `run-all.sh` la
truncó. Lo demostrado es que **el contrato ya coincide** —medido contra la respuesta real del API— y que
una guarda falla si deja de coincidir. La comprobación con datos reales corresponde a la suite de
navegador tras un `run-all.sh`, y se declara pendiente en vez de darse por hecha.
