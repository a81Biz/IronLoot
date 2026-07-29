# PT-174 — Escenarios de prueba

## Autorización (PT-174.1)

| # | Actor | Transición | Esperado |
|---|---|---|---|
| 1 | vendedor | a `SHIPPED` | 200 |
| 2 | **vendedor** | a `DELIVERED` | **403** — *hoy devuelve 200; es el defecto* |
| 3 | comprador | a `DELIVERED` | 200 |
| 4 | comprador | a `SHIPPED` | 403 |
| 5 | tercero | cualquiera | 403 |

## Máquina de estados (PT-173 + PT-174.2)

| # | Camino | Esperado |
|---|---|---|
| 6 | `PAID` a `SHIPPED` a `DELIVERED` | pasa |
| 7 | **`PAID` a `DELIVERED` directo** | **rechazado** — *hoy se acepta* |
| 8 | `DELIVERED` a `SHIPPED` | rechazado |
| 9 | `deliveredAt` | sellado con la hora real de la confirmación |

## Liberación (PT-174.3)

| # | Situación | Esperado |
|---|---|---|
| 10 | confirmado hace **1 h** | **no** libera |
| 11 | confirmado hace **73 h** | libera, con asiento `SETTLEMENT_RELEASE` |
| 12 | sin confirmar, pedido de hace **15 d** | libera (vencimiento) |
| 13 | ya liberado (`sellerSettledAt`) | no vuelve a liberar |
| 14 | **dos liberaciones simultáneas** | un solo asiento (RULE-24) |
| 15 | `SETTLEMENT_HOLDBACK_HOURS=0` | libera en el primer tic |

## Disparador de desarrollo (PT-174.4)

| # | Situación | Esperado |
|---|---|---|
| 16 | `NODE_ENV=development` | 200, devuelve cuántos liberó |
| 17 | **`NODE_ENV=production`** | **403** |

## Interfaz (PT-174.5)

| # | Situación | Esperado |
|---|---|---|
| 18 | envío `PENDING`, comprador | **no** ve el control de confirmar |
| 19 | envío `SHIPPED`, comprador | lo ve, con `confirm()` previo |
| 20 | envío `SHIPPED`, vendedor | no ve el control de confirmar |
| 21 | toda `data-accion` de la página | registrada (RULE-30) |
| 22 | plantillas | sin JS ni estilos inline |

## La cadena completa, sin sembrar (PT-175)

| # | Paso | Comprobación |
|---|---|---|
| 23 | la subasta cierra sola | `CLOSED`, pedido `PAID`, comisión registrada |
| 24 | el vendedor declara el envío | `SHIPPED` y aviso al comprador |
| 25 | el comprador confirma | `DELIVERED`, `deliveredAt` sellado |
| 26 | liberación con `HOLDBACK_HOURS=0` y el disparador | `pending_balance` a `balance`, `SETTLEMENT_RELEASE` |
| 27 | el vendedor retira **esa** ganancia | reserva real, aprobación, `PAID` |
| 28 | **cero `INSERT` sembrados** en toda la fase | revisión del código de la fase |
