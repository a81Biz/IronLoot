# PT-174 — Design

## Decisión de negocio recibida

**Opción B, 72 h.** El humano dio «adelante» sobre el supuesto declarado en `PLAN_ACTUAL.md`, que decía:
*«si el ACK llega sin elegir, asumo B con 72 h y lo dejo escrito para que se pueda revocar»*. Queda
escrito aquí. **Revocable**: es un parámetro de entorno, no una decisión incrustada.

## Lo que cambia el diagnóstico respecto al plan

Al leer el código antes de escribir apareció algo mejor que lo previsto: **la máquina de estados ya
existe y ya dice lo correcto.**

`@ironloot/core` → `OrderStateMachine`:

```ts
[OrderStatus.PAID]:    new Set([OrderStatus.SHIPPED, OrderStatus.REFUNDED]),
[OrderStatus.SHIPPED]: new Set([OrderStatus.DELIVERED]),
```

Y **se usa** — `orders.service.ts:160` y `refunds.service.ts:20` la consultan antes de mover un pedido.

El defecto no es que falte la guarda: es que **`shipments.service.ts` escribe `order.status` a mano** y se
la salta:

```ts
await this.prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'DELIVERED' } });
```

**Hay dos puertas al mismo estado y sólo una tiene cerradura.** Es la familia de AUD-005 (el doble
mecanismo de comisión que cerró PT-042): dos caminos para lo mismo, uno sin control.

Consecuencia: **no hay que escribir una máquina nueva.** PT-173 conecta la que hay.

## Decisiones de diseño

### 1. `shipments.service` deja de escribir el pedido: delega en `orders.service`

Reutiliza `ordersService.updateStatus()`, que ya valida con la máquina y lanza `ValidationException`.
Una puerta, una cerradura.

**Alternativa rechazada:** duplicar la comprobación dentro de `shipments.service`. Sería un tercer sitio
donde se decide lo mismo, y el problema de origen es exactamente ése.

### 2. La autorización se parte por transición, no por rol global

| Transición | Quién | Hoy |
|---|---|---|
| `PENDING → SHIPPED` | **vendedor** | vendedor ✔ |
| `SHIPPED → DELIVERED` | **comprador** | **vendedor** ✘ |

Se comprueba en el **servicio**, no en el controlador: el controlador es una puerta, no la cerradura.

### 3. La liberación se dispara por tiempo desde la confirmación, no por el estado

Hoy `releaseMaturedSettlements` libera con `{ status: DELIVERED }`, es decir **en cuanto el pedido está
entregado**. Con B eso pasa a:

```ts
OR: [
  { shipment: { deliveredAt: { lte: ahora - SETTLEMENT_HOLDBACK_HOURS } } },  // confirmado + 72 h
  { createdAt:  { lte: ahora - DISPUTE_WINDOW_DAYS } },                       // vencimiento
]
```

**Se lee de `shipment.deliveredAt`, no de `order.updatedAt`** — es la lección de H-011, que medía la
ventana de disputa desde la última modificación y no desde la entrega.

**El vencimiento se conserva** (AC-07): un comprador que calla no puede retener el dinero del vendedor
para siempre. Es la mentira simétrica, y ahora está declarada en vez de ser un efecto lateral.

### 4. `SETTLEMENT_HOLDBACK_HOURS`, sin valor por defecto peligroso

Nueva variable, **72** por defecto. Va con defecto a propósito, al contrario que las de conexión
(RULE-17): aquí un valor ausente no configura «hacia ninguna parte», sólo elige una política. Y en QA se
pone a **0**, que es **configurar, no falsear** — la diferencia con el `UPDATE` que hace hoy la suite.

### 5. Un disparador del cron, sólo en desarrollo

`releaseMaturedSettlements` corre cada 30 min. Para que la fase de QA no espere media hora, un endpoint
en `diagnostics`, que ya lleva `DevelopmentOnlyGuard` a nivel de clase y **aborta con 403 si
`NODE_ENV=production`**. No se inventa un mecanismo: se usa el que existe.

## Lo que NO cambia

- `releaseSettlement()` no se toca: ya bloquea la fila (RULE-24) y ya es idempotente
  (`pendingBefore < amt → return`).
- `sellerSettledAt` sigue siendo la marca de «ya liberado».
- El subsistema de retiro no se toca.
