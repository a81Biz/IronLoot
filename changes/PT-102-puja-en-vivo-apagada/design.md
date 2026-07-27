# PT-102 — design.md

**BUG · STANDARD · F-34** · Entrada: `DISCOVERY.md` § PT-102 · `PLAN_ACTUAL.md`

## La decisión de fondo

F-34 no es «un `<script>` en el sitio equivocado». Es **una dependencia implícita que nada
declaraba**: `pages-auction-detail.js` necesita que `socket.io` se haya ejecutado antes, y lo único
que lo garantizaba era el orden en que dos etiquetas aparecían en un fichero HTML. Un refactor
legítimo —sacar el JS inline— movió una de las dos y rompió el contrato sin que nada protestara.

De ahí salen las tres decisiones de diseño.

## D1 — `defer` en lugar de reordenar

Reordenar arregla hoy. `defer` **declara la garantía**:

| | Reordenar | `defer` en ambos |
|---|---|---|
| Orden de ejecución | Por posición en el HTML | Por posición, **garantizado por la especificación** |
| Momento de ejecución | Al encontrarlos el parser | Tras completarse el DOM |
| Si alguien mueve una etiqueta | Se rompe otra vez | Se rompe otra vez — **pero la guarda estática lo caza** |

`defer` no hace el fallo imposible: hace que el orden sea *lo declarado*, y quita del medio un
segundo problema latente —el script lee el DOM sin esperarlo, y hoy funciona por accidente—.

**Alternativa descartada**: empaquetar socket.io localmente. Elimina la clase entera de fallo, pero
introduce un empaquetador en un frontend que es JS plano por decisión explícita
(`11-Conventions.md`). Es un cambio de arquitectura y no cabe en un arreglo de bug. Queda anotado.

## D2 — El `catch` deja de ser mudo

El `try/catch` es **correcto**: si el CDN cae, la página debe seguir sirviendo para pujar por HTTP.
Lo que estaba mal es que no dejara rastro. Un fallo que nadie puede observar no es un fallo
tolerado: es un fallo oculto.

```js
if (typeof io !== 'function') {
  console.error('Puja en vivo no disponible: socket.io no se cargó …');
} else { … }
```

La comprobación explícita da un mensaje que se entiende. El `catch` se queda, con `console.error`.

**Por qué `console.error` y no un aviso en pantalla**: el usuario no puede hacer nada al respecto, y
la página sigue siendo utilizable. Avisarle sería ruido. Al desarrollador, en cambio, hay que
decírselo — y ese es el canal.

## D3 — Dos guardas, no una

| | Guarda estática | Guarda de navegador |
|---|---|---|
| Qué prueba | Que el **contrato** está declarado | Que el **producto** funciona |
| Cuándo corre | `npm test`, pre-commit, CI | Suite completa, con Docker |
| Cuesta | Milisegundos | Un minuto y un entorno |
| Frágil | No | Moderadamente |
| ¿Habría cazado F-34? | **Sí** | **Sí** |

Se escriben las dos porque prueban cosas distintas. La estática es la que va a correr mil veces; la
de navegador es la única que puede afirmar que un usuario ve subir el precio.

## Lo que este PT NO hace

- No revierte PT-096: el JS no vuelve a la plantilla.
- No toca la CSP: `script-src 'self' https://cdn.socket.io` ya es correcta.
- No toca nginx, el namespace `/auctions`, ni la URL relativa de PT-098.
- No introduce un empaquetador.
- No arregla las capturas `undefined.png` de la suite: es otro defecto, y mezclar haría el commit
  irrevisable.
