# PT-146 — Evidencia

> En `.md` por **F-136-A**.

## 1. RED — y la medición fue peor que el diagnóstico

El `DISCOVERY` hablaba de perder **una** acreditación de dos. Con seis simultáneas de 100:

```
CC-01   esperado: 600        saldo real: 100      <- cinco de seis, perdidas
INV-01  ledger:   600        monedero:   100      <- descuadre de 500 MXN
```

**Los seis asientos estaban escritos**, cada uno con su `balanceAfter`, y ninguno coincidía con la
fila del monedero. Ninguna de las seis llamadas devolvió error.

Los dos controles pasaban ya, y son los que dan valor a lo anterior:

- **AC-03**: secuencialmente el saldo es exacto → lo que distingue no es el entorno, es la
  concurrencia.
- **BLQ-02**: dos monederos distintos no se esperan → sin este caso, un bloqueo **global** haría
  pasar CC-01 y sería el remedio caro.

## 2. Por qué `increment` no servía

```
const wallet     = await tx.wallet.findUnique(...)      <- lectura obsoleta bajo carrera
const newBalance = wallet.balance + amount
await tx.ledger.create({ balanceBefore: wallet.balance, balanceAfter: newBalance })   <- MIENTE
await tx.wallet.update({ data: { balance: { increment: amount } } })                  <- correcto
```

Habría dejado **el saldo bien y el asiento mal**. El ledger es el registro de auditoría: es donde se
mira cuando alguien reclama. Cambiar un saldo equivocado por una contabilidad equivocada no es un
arreglo.

## 3. GREEN

```
CC-01 ✓   INV-01 ✓   AC-03 ✓   BLQ-02 ✓        4/4
```

`SELECT ... FOR UPDATE` en los siete métodos, por un único `bloquearMonedero()`.
`captureHeldFunds` toca dos monederos y va por `bloquearDosMonederos()`, en orden fijo.

## 4. ¿Había daño ya hecho? — PT-146.10

```sql
SELECT count(*) monederos_con_movimiento,
       count(*) FILTER (WHERE descuadre <> 0) descuadrados,
       sum(abs(descuadre)) importe
```
```
2 | 0 | 0.00
```

**Cero descuadres.** El defecto era real y alcanzable, pero no llegó a materializarse en datos
almacenados. **No había nada que reconciliar** — y saberlo era la tarea: descubrirlo por una
reclamación habría sido la peor forma.

## 5. El error propio, que es lo que más vale anotar

**CI cazó un fallo mío de PT-142.** Aquel PT dejó `system-config.seed()` con `upsert` y lo dio por
bueno porque su prueba concurrente pasaba en local.

Pasaba **por la misma suerte contra la que ese mismo PT advertía por escrito**. Su `design.md` dice,
literalmente, que un `upsert` que pasa una prueba concurrente puede estar pasando por casualidad — y
por eso el monedero acabó en `createMany({ skipDuplicates })`. **Este sitio se quedó atrás.**

Contra base vacía y con varios workers —o sea, en CI—:

```
Invalid `upsert()` invocation — Unique constraint failed on the fields: (`key`)
```

La lección estaba escrita, aplicada a un sitio y no al otro. Lo que la hizo visible no fue leer el
código: fue que CI se ejecuta, cosa que empezó a pasar hace unas horas con PT-136.

## 6. Regresión

```
Unitarias:                726 / 726  en 96 suites
Suites de concurrencia:     9 / 9    (PT-142 + PT-146, en contenedor)
```

Doce unitarias simulaban la forma anterior. Se actualizaron: los dobles necesitan `$queryRaw` —el
bloqueo— y que `findUnique` sirva el monedero, porque `bloquearMonedero()` lee y relee.
