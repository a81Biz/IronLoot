# PT-173 — Self-Review (STATE 5)

**Fecha**: 2026-07-29 · **Tipo**: BUG (seguridad/dominio) · **Complejidad**: STANDARD
**Hallazgo**: `DISCOVERY.md § F-172-A`

## Qué se hizo

`shipments.service.updateStatus` escribía `order.status` a mano y **se saltaba `OrderStateMachine`**, que
vive en `@ironloot/core`, dice lo correcto (`PAID → SHIPPED → DELIVERED`) y **ya se consulta** en
`orders.service.ts:160` y `refunds.service.ts:20`.

**Dos puertas al mismo estado y sólo una con cerradura.** Un pedido `PAID` saltaba directo a `DELIVERED`
sin pasar por `SHIPPED`, y con eso el cron liberaba el holdback del vendedor.

**No se escribió ninguna máquina nueva**: se conectó la que había.

## El descubrimiento que simplificó el PT

El plan preveía *«máquina de estados de envío en `@ironloot/core`»*. Al leer el código antes de escribir,
**ya existía y ya decía lo correcto**. Lo único que faltaba era llamarla. Es la diferencia entre añadir y
conectar, y vale registrarla: el defecto no era una ausencia de diseño, era un camino que lo eludía.

## Desviación respecto al diseño, con su motivo

`design.md` proponía delegar en `ordersService.updateStatus()`. **Se hizo distinto**: se consulta
`OrderStateMachine` directamente y las dos escrituras van en `$transaction`.

**Por qué:** `ordersService.updateStatus()` no acepta un cliente de transacción, así que delegar habría
dejado las dos escrituras sueltas — y un fallo entre ambas produce **un envío `DELIVERED` con su pedido en
`PAID`**, que es peor que el defecto original: el sistema contradiciéndose. La condición de «una sola
fuente de verdad» se cumple igual, porque las dos puertas consultan **la misma máquina de `core`**.

## Evidencia

| Fichero | Qué prueba |
|---|---|
| `guarda-RED.txt` | C1 y C2 **vistas fallar**: el salto `PAID → DELIVERED` se aceptaba |
| `guarda-GREEN.txt` | **11/11** tras el arreglo |

## Y una prueba que fijaba el defecto

`should update status and set deliveredAt` pasaba `order: { sellerId }` **sin estado**, así que no había
transición que validar: **la suite afirmaba lo incorrecto**. Se corrigió a un pedido en `SHIPPED`, el único
estado desde el que `DELIVERED` es legal. Una prueba que afirma lo incorrecto es peor que no tenerla,
porque convierte el arreglo en una regresión aparente.

## Checklist

- [x] Prueba **vista fallar** antes de arreglar (RULE-14)
- [x] Casos de control: AC-01 fija lo que la máquina de `core` decide; AC-02 que el 404 sigue antes
- [x] C2 comprueba que una transición rechazada **no toca el envío** — sin eso el arreglo dejaría un
      estado incoherente
- [x] Atomicidad: las dos escrituras en `$transaction`
- [x] `RETURNED` deliberadamente fuera del mapa, con su motivo escrito
- [x] Sin `catch` mudos; nada que suba la línea base de silencios

## Lo que NO hace este PT

- **No cambia quién puede qué.** El vendedor sigue pudiendo marcar `DELIVERED` (pasando por `SHIPPED`).
  Eso es PT-174, y hasta entonces la vía de autoliberación **sigue abierta en dos pasos**.
- No toca `releaseMaturedSettlements` ni la interfaz.
