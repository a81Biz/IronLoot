# Evidencia — PT-096 (TD-005 + TD-010)

**Fecha**: 2026-07-27 · **Rama**: `refactor/PT-096-js-inline-y-csp`

## El descubrimiento que cambió el carácter del PT

`script-src-attr 'none'` **bloquea los manejadores inline**. Los 24 que había estaban **muertos
desde que se añadió la CSP**. Verificado en navegador antes de tocar nada:

```
BASE, ordenar el catálogo:  NO HACE NADA
consola: Executing inline event handler violates the following
         Content Security Policy directive 'script-src-attr 'none''
```

| Manejador | Consecuencia real |
|---|---|
| `onchange="window.location.search=…"` | ordenar el catálogo, muerto |
| `onchange="this.form.submit()"` | filtros del admin, muertos |
| `onsubmit="return confirm('¿Cancelar permanentemente?')"` | **la confirmación nunca aparecía** |

El tercero es el grave: si el manejador no corre, **nada devuelve `false`** y el formulario se
envía igual. Forzar cierre, reabrir y cancelar permanentemente se ejecutaban **sin preguntar**.

## Lo hecho

| | |
|---|---|
| Manejadores `on*` convertidos a `data-*` | **24**, en los tres sitios |
| Plantillas con script extraído | **22** (BASE 5 · CLIENT 9 · ADMIN 8) |
| Interpolaciones `{{ }}` movidas a `data-*` | 3 |
| `'unsafe-inline'` en `scriptSrc` | **retirado de los tres** |

### La decisión: delegación, no extracción manual

```html
<form data-confirm="¿Cancelar permanentemente?">
<select data-autosubmit>
<select data-navega-param="sort">
<button data-accion="abrir-rechazo" data-id="…">
```

Un listener en `document` cubre lo que hay **y lo que se añada después**. Extraer 24 manejadores
uno a uno habría resuelto hoy y dejado el patrón intacto: la página 25 volvería a escribir
`onclick`, y volvería a estar muerta sin que nadie lo note.

## Verificado

```
CSP servida:
  base    script-src 'self'
  client  script-src 'self' https://cdn.socket.io
  admin   script-src 'self' https://cdn.jsdelivr.net

En navegador:
  confirmación admin   lanza la pregunta y CANCELA el envío al responder que no
  filtros admin        FUNCIONAN
  catálogo BASE        FUNCIONA
  violaciones de CSP   0
```

### Suites

| | |
|---|---|
| API | 458 |
| CLIENT | **83** (era 71: +12 de las guardas) |
| CORE | 134 |
| **unitarios** | **675** |
| Navegador | **155/156** |

El único fallo, `QA-TR-03`, es **latencia de Mercado Pago**: la suite miró la orden en `processing`
y al comprobarla después estaba `processed / accredited`. No es defecto nuestro.

## Las guardas

`plantillas-sin-js-inline.spec.ts` recorre **los tres sitios** y exige que ninguna plantilla lleve
un manejador `on*`, un `<script>` con cuerpo, ni interpole `{{ }}` dentro de un script. Son
estáticas: corren en milisegundos y no dependen de levantar nada.

## Dos tropiezos propios, dichos

**Mis comentarios rompieron mi guarda.** Escribí `{# … <script> … #}` explicando por qué el código
ya no estaba ahí, y la guarda lo tomó por código. La corrección correcta no era reescribir el
comentario: era que la guarda **descarte los comentarios de plantilla** antes de mirar. Ahora lo
hace.

**El hook rechazó un commit, con razón.** `lint-staged` lintea lo que está en el índice, incluidos
los tests, pero el `tsconfig` de compilación los excluye. Era el mismo hueco que PT-091 cerró en
CORE y dejó abierto en los otros tres. Corregido con `tsconfig.eslint.json` en los tres — y de
paso, los tests de CLIENT pasaron por el linter por primera vez: 71 errores de formato.
