# test-scenarios — PT-096

## Lo que hoy está roto y debe funcionar

| # | Escenario | Antes | Esperado |
|---|---|---|---|
| C-01 | Ordenar el catálogo en BASE | **no hace nada** | reordena |
| C-02 | Filtrar por estado en ADMIN | **no hace nada** | aplica el filtro |
| C-03 | Forzar cierre de subasta | **sin preguntar** | pregunta y cancela si se dice que no |
| C-04 | Cancelar subasta permanentemente | **sin preguntar** | ídem |
| C-05 | Banear usuario | **sin preguntar** | ídem |

## Lo que no debe cambiar

| # | Escenario | Verificación |
|---|---|---|
| C-06 | Depósito por PayPal y Mercado Pago | fase QA 70 y 71 |
| C-07 | Puja en vivo entre dos navegadores | WebSocket por el propio origen |
| C-08 | Login entre subdominios | bootstrap de la suite |
| C-09 | Retiro con cuenta verificada | QA-WD-04b y QA-WD-05 |
| C-10 | Suite completa | **168/168** |

## Guardas contra la reaparición

| # | Guarda |
|---|---|
| C-11 | Ninguna plantilla contiene `on*=` |
| C-12 | Ninguna plantilla contiene `<script>` con cuerpo |
| C-13 | Ninguna plantilla interpola `{{ }}` dentro de un script |
| C-14 | Ningún sitio sirve `script-src 'unsafe-inline'` |

Las cuatro son estáticas —leen los ficheros— y por eso corren en milisegundos y no dependen de
levantar nada.
