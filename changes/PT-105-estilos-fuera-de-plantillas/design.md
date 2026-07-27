# PT-105 — design.md

**REFACTOR · STANDARD · TD-014** · Entrada: `REFACTOR_SCOPE.md` · `PLAN_ACTUAL.md`

## D1 — Por qué esto no es «PT-096 otra vez»

PT-096 sacó el JavaScript porque `unsafe-inline` en `script-src` permite **ejecutar código**. Aquí
el riesgo es mucho menor: un atacante que pueda inyectar marcado alteraría la apariencia, y
`script-src` ya le impide ejecutar nada.

Se hace igualmente porque **una CSP a medias es difícil de razonar**: quien la lea tiene que
recordar cuál de las dos mitades estaba cerrada. Y porque TD-014 sólo existe como deuda separada
desde ayer — dejarla es dejar el trabajo a medio terminar dos veces seguidas.

## D2 — La CSP no cubre lo que hace el JavaScript

Esto es lo que hace el refactor posible, y conviene que quede escrito porque no es obvio:

| Origen del estilo | ¿Lo bloquea `style-src` sin `unsafe-inline`? |
|---|---|
| `<div style="…">` en la plantilla | **Sí** |
| `<style>…</style>` en la plantilla | **Sí** |
| `el.style.display = 'block'` desde JS | **No** — CSSOM queda fuera de la CSP |
| `el.classList.add('oculto')` | **No** |

Por eso los 30 usos de `style.display` con valor explícito no se tocan: siguen funcionando, y el
estilo inline que escribe el JS gana en especificidad a la clase.

## D3 — Las cuatro pestañas: `= ''` es el caso que rompe

```js
tab.style.display = '';   // «vuelve a lo que diga el CSS»
```

Mientras el CSS no dijera nada, eso mostraba el elemento. Si ahora una clase lo oculta, «lo que
diga el CSS» es *oculto*, y la pestaña no abre. Se pasan a `classList`, que además expresa la
intención mejor que vaciar una propiedad.

**Cuatro ficheros, no uno**: `pages-commissions`, `pages-notifications`, `pages-reports`,
`pages-user-detail`. Arreglar sólo el que se pruebe primero dejaría tres rotos — el patrón que
PT-104 acaba de corregir en otro sitio.

## D4 — Clases con nombre, no atómicas

Para lo repetido, utilidades cortas (`.oculto`, `.en-linea`, `.texto-tenue`). Para los one-offs,
una clase con el nombre de dónde vive (`.detalle-subasta`, `.notif-linea`).

No se adopta un sistema atómico completo: sería introducir una convención nueva en un CSS que hoy
es semántico, y eso es una decisión de arquitectura, no un arreglo de deuda.

## Lo que este PT NO hace

- No cambia ninguna apariencia.
- No unifica los tres CSS.
- No toca `script-src` ni ninguna otra directiva.
- No toca los estilos que el JavaScript genera en ejecución.
- No cierra el bug.
