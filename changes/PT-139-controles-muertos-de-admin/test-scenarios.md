# PT-139 — Escenarios de prueba

## La guarda principal: bloques de plantilla

| # | Escenario | Esperado |
|---|---|---|
| AC-01 | **RED inicial** sobre ADMIN | **Falla**, nombrando `cms.html`, `seo.html`, `refunds.html` y `reconciliation.html` — bloque `title` no declarado en `layouts/admin.html` |
| AC-02 | **GREEN** tras retirar los cuatro bloques | Pasa |
| AC-03 | BASE y CLIENT | Pasan hoy: sus layouts **sí** declaran `{% block title %}` (`base.html:7`, `client.html:6`) |
| AC-04 | **Control** — bloque inventado en una plantilla | **Falla** |
| AC-05 | **Control** — bloque que sí existe | Pasa |
| AC-06 | **Control** — cadena `extends` de dos niveles | Resuelta correctamente |
| AC-07 | **Control** — plantilla sin `extends` (`login.html`) | Pasa, no revienta |

## La guarda menor: `data-bs-*` sin Bootstrap

| # | Escenario | Esperado |
|---|---|---|
| BS-01 | **RED** sobre `refunds.html` | **Falla**, nombrando `:8` y `:73` |
| BS-02 | **GREEN** tras retirar los atributos | Pasa |
| BS-03 | **Control** — `data-bs-*` en un sitio con Bootstrap cargado | Pasa |
| BS-04 | **Control** — `data-bs-*` sin Bootstrap | **Falla** |

## Conciliación — el defecto funcional

| # | Escenario | Esperado |
|---|---|---|
| REC-01 | Cargar `/reconciliation` y mirar la **pestaña de red** | `pages-reconciliation.js` **se pide y llega 200**. Hoy no se pide |
| REC-02 | Pulsar «Conciliar» | La pantalla responde. Hoy no hace nada |
| REC-03 | El título de la pestaña | Igual que antes — lo pone `reconciliation.controller.ts:13`, no el bloque |
| REC-04 | Consola del navegador | Limpia. Sin errores de CSP, sin `ReferenceError` |
| REC-05 | `orden-de-scripts.spec.ts` | Verde. **Es la avería literal de F-34** |

> REC-01 se comprueba en la pestaña de red, **no leyendo el HTML**. Que el `<script>` esté escrito no
> es que el navegador lo pida: ésa es exactamente la confusión que dejó esto muerto dos meses.

## Reembolsos — el modal

| # | Escenario | Esperado |
|---|---|---|
| REF-01 | Pulsar «+ Crear reembolso» | El modal **abre**. Hoy no pasa nada |
| REF-02 | Pulsar «Cancelar» | Cierra |
| REF-03 | Pulsar `Esc` | Cierra |
| REF-04 | Clic en el fondo | Cierra |
| REF-05 | Foco al abrir | Entra al modal |
| REF-06 | Foco al cerrar | **Vuelve al botón que lo abrió**. Un modal que atrapa el foco es peor que no tenerlo |
| REF-07 | Crear un reembolso real | La fila existe **en la base**. Que el formulario envíe no es que el reembolso se cree |
| REF-08 | Consola | Limpia, sin errores de CSP |

## Los tres títulos que no deben cambiar

| # | Página | Esperado |
|---|---|---|
| TIT-01 | `/cms` | Mismo título en la pestaña que hoy |
| TIT-02 | `/seo` | Ídem |
| TIT-03 | `/refunds` | Ídem |

> Los tres bloques eran peso muerto: el título lo pone el controlador. Se comprueba en navegador
> porque **es lo único que ese bloque podía estar afectando**, y darlo por hecho sería la clase de
> suposición que este PT corrige.

## CSP — el riesgo silencioso

| # | Escenario | Esperado |
|---|---|---|
| CSP-01 | `plantillas-sin-js-inline.spec.ts` | Verde |
| CSP-02 | `estilos-fuera-de-plantillas.spec.ts` | Verde |
| CSP-03 | `grep "style=\|onclick=" ` en lo tocado | Sin resultados |
| CSP-04 | `grep "style.display" pages-refunds.js` | **Sin resultados.** Vaciar el estilo devuelve el elemento a lo que diga el CSS, que ahora puede ser «oculto» |

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **944** (ADMIN aporta 13) |
| REG-02 | e2e | **77** |
| REG-03 | Navegador | **176** |
| REG-04 | Las 25 pantallas de ADMIN | Ninguna rota por retirar los bloques |

## Lo que NO se prueba aquí

- El resto de pantallas de ADMIN buscando controles muertos por **otras** causas. La guarda encuentra
  los de esta clase; si hay de otra, es otro trabajo.
- El rediseño de las dos pantallas. Se recupera la función que debían tener.
