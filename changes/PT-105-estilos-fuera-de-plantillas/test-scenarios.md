# PT-105 — test-scenarios.md

## Guarda estática

| ID | Escenario | Esperado |
|---|---|---|
| ES-01 | Ninguna plantilla de los tres sitios lleva `style=` | 0 infractoras |
| ES-02 | Ninguna plantilla lleva `<style>` con cuerpo | 0 |
| ES-03 | `styleSrc` de los tres `main.ts` sin `'unsafe-inline'` | Los tres limpios |
| ES-04 | Control: un marcado con `style=` inventado | **Rechazado** |
| ES-05 | Control: `style=` dentro de un comentario `{# … #}` | **No** se acusa |

> ES-04 y ES-05 son los que dan valor a ES-01: sin ellos, un verde podría significar que la guarda
> no mira. ES-05 además es un fallo que ya ocurrió en PT-096.

## Navegador

| ID | Escenario | Esperado |
|---|---|---|
| NV-01 | Las 4 páginas de pestañas de ADMIN | La pestaña cambia al pulsar, en las cuatro |
| NV-02 | Violaciones de CSP en todo el recorrido | **Cero** |
| NV-03 | Un mensaje de error que el JS muestra (login inválido) | Se ve |
| NV-04 | Elementos que nacen ocultos | Siguen ocultos al cargar |
| NV-05 | Ancho del contenido en BASE y CLIENT | No se desborda |

## Regresión

| ID | Escenario | Esperado |
|---|---|---|
| R-01 | `npm test` | 703 + nuevos |
| R-02 | `bash run-all.sh` | 193, incluidas `extras` (responsive/CSP) y `admin-writes` |
| R-03 | `plantillas-sin-js-inline` (PT-096) | 12/12 |
