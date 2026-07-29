# PT-146 — Design: la actualización perdida sobre el saldo

**Tipo**: BUG · **Complejidad**: STANDARD
**Origen**: lo destapó la prueba concurrente de PT-142 al desaparecer el `P2002` que lo tapaba.

## El defecto, medido

```
2 depositos simultaneos de 100 y 250, a un usuario sin monedero
  estados:  fulfilled | fulfilled     <- ninguno falla
  esperado: 350
  real:     250   (y 100 en otra corrida)
```

**No determinista**: gana quien escriba el último.

## Por qué es peor que PT-142

PT-142 fallaba **ruidosamente**: `P2002`, el ciclo se reabre, PT-087 reintenta, el dinero llega.

Esto **no falla**. Devuelve 200. Y deja algo peor que un saldo equivocado: **deja el asiento del
perdedor escrito en `ledger`** con un `balanceAfter` que no coincide con el saldo real. La
contabilidad se contradice a sí misma, y sólo se ve sumando el ledger y comparándolo con
`wallets.balance` — cosa que hoy no comprueba nada.

`Payment.reference @unique` no protege: impide acreditar **el mismo** pago dos veces. Aquí son **dos
pagos distintos** llegando a la vez — un webhook y la vía garantizada del cron, por ejemplo.

## Son siete métodos, no cinco

| Línea | Método | Qué escribe |
|---|---|---|
| 105 | `refundWithdrawal` | `balance` |
| 141 | `releaseSettlement` | `balance` + `pendingBalance` |
| 205 | `deposit` | `balance` |
| 261 | `withdraw` | `balance` |
| 321 | `holdFunds` | `balance` |
| 371 | `releaseFunds` | `balance` |
| 485 | `captureHeldFunds` | `pendingBalance` |

Todos con la misma forma: **leer → calcular en memoria → escribir un absoluto**. Y todos escriben
además un asiento con `balanceBefore` y `balanceAfter` derivados de esa lectura.

## Decisiones de arquitectura

### D1 — `SELECT ... FOR UPDATE`, no `increment`

La vía obvia sería `data: { balance: { increment: amount } }`. **No sirve aquí**, y la razón es el
ledger:

```
const wallet    = await tx.wallet.findUnique(...)        <- lectura obsoleta bajo concurrencia
const newBalance = wallet.balance + amount
await tx.ledger.create({ balanceBefore: wallet.balance, balanceAfter: newBalance })   <- MIENTE
await tx.wallet.update({ data: { balance: { increment: amount } } })                  <- correcto
```

Con `increment`, el saldo quedaría bien y **el asiento quedaría mal**. Cambiar un saldo equivocado
por una contabilidad equivocada no es un arreglo: el ledger es el registro de auditoría, y es donde
se mira cuando alguien reclama.

`SELECT ... FOR UPDATE` bloquea la fila **en el momento de leerla**, así que `balanceBefore` es
autoritativo y toda la operación queda serializada por monedero. El código de cada método no cambia
de forma: cambia de dónde sale la lectura.

### D2 — Un solo punto: `bloquearMonedero(tx, userId)`

Los siete pasan por él. Un helper con `tx.$queryRaw` — `SELECT ... FROM wallets WHERE user_id = $1
FOR UPDATE` — que devuelve el monedero ya bloqueado.

Que sea uno solo importa: siete bloqueos escritos siete veces son siete oportunidades de escribir uno
mal, y un bloqueo mal puesto **no da error**, simplemente no bloquea.

### D3 — El bloqueo es por monedero, no global

`FOR UPDATE` sobre una fila. Dos usuarios distintos no se esperan. El coste es serializar las
operaciones **del mismo monedero**, que es exactamente lo que se quiere: son las que se pisan.

### D4 — La invariante contable, comprobada

`sum(ledger.amount) == wallets.balance` tras una ráfaga concurrente. **Hoy no lo comprueba nada**, y
es la única forma de demostrar que el ledger y el saldo cuentan la misma historia.

Matiz que hay que resolver al implementar: `pendingBalance` (PT-071) vive fuera de `balance`, así que
la invariante tiene que contemplar los dos o acotarse a los tipos de asiento que mueven `balance`.
Escribir la invariante mal sería peor que no escribirla.

### D5 — RED con concurrencia real, y por cada método que se toque

Una carrera «arreglada» sin prueba que falle no está arreglada. La lección de PT-142 fue literal:
`upsert` pasó una prueba de 8 llamadas **por suerte**, y sin una segunda prueba concurrente se habría
cerrado el PT con una corrección que no corrige.

## Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | **Interbloqueo**: dos transacciones bloqueando dos monederos en orden distinto. `captureHeldFunds` toca comprador **y** vendedor | **Orden de bloqueo fijo** —por `userId` ascendente— en toda operación que toque dos monederos. Es la mitigación clásica y hay que escribirla, no confiarla |
| R2 | El bloqueo se mantiene hasta el commit y alarga las transacciones | Son transacciones cortas. Se mide la duración antes y después |
| R3 | `$queryRaw` pierde el tipado de Prisma | El helper devuelve el monedero releído con `findUniqueOrThrow` tras el bloqueo, o se tipa a mano con cuidado |
| R4 | Tocar los siete de golpe y no saber cuál rompió qué | Un commit por método, con su prueba |

## Lo que este PT NO decide

- **No cambia el modelo de datos.** Ninguna migración.
- **No toca la idempotencia del asiento** (`Payment.reference @unique`).
- **No reconcilia los saldos históricos.** Si la invariante descubre monederos ya descuadrados, se
  **mide y se registra**; corregir contabilidad con fecha pasada es decisión del humano, no de un PT.
