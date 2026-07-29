# PT-146 — Cambios de especificación

## Los siete métodos de `wallet.service.ts`

| Línea | Método | Antes | Después |
|---|---|---|---|
| 105 | `refundWithdrawal` | `findUnique` → calcula → escribe absoluto | Lee con `bloquearMonedero()` |
| 141 | `releaseSettlement` | ídem | ídem |
| 205 | `deposit` | ídem | ídem |
| 261 | `withdraw` | ídem | ídem |
| 321 | `holdFunds` | ídem | ídem |
| 371 | `releaseFunds` | ídem | ídem |
| 485 | `captureHeldFunds` | ídem, **dos monederos** | ídem, con **orden de bloqueo fijo** |

**La forma del código no cambia**: sigue leyendo, calculando y escribiendo un absoluto. Lo que cambia
es que la lectura bloquea la fila, así que `balanceBefore` es autoritativo y el cálculo no puede
quedar obsoleto.

## Método nuevo

`private async bloquearMonedero(tx, userId): Promise<Wallet>` — `SELECT ... FOR UPDATE`.

## Lo que NO cambia

- **Ninguna migración.** El modelo no se toca.
- **`Payment.reference @unique`** sigue siendo la idempotencia del asiento.
- **`asegurarMonedero()`** (PT-142) se queda: resuelve la creación, que es otra carrera.
- Ningún contrato de API.

## Nueva regla de convenciones

`11-Conventions.md` — **RULE-24**:

> **Leer un saldo, calcular sobre él y escribir un absoluto exige bloquear la fila.**
> Siete métodos de `WalletService` lo hacían sin bloqueo. Dos acreditaciones simultáneas respondían
> **las dos con éxito** y una se perdía: 250 o 100 donde tocaban 350, según quién escribiera el
> último (PT-146).
> Lo grave no es el saldo: es que **el asiento del perdedor queda escrito en `ledger`** con un
> `balanceAfter` que no coincide, así que la contabilidad se contradice a sí misma.
> **`increment` no basta aquí**: dejaría el saldo bien y el asiento mal, porque `balanceBefore` sale
> de la lectura previa. Cambiar un saldo equivocado por una contabilidad equivocada no es un arreglo
> — el ledger es donde se mira cuando alguien reclama.
> **Correcto:** `SELECT ... FOR UPDATE` al leer, con **orden de bloqueo fijo** cuando la operación
> toca dos monederos (`captureHeldFunds`), o es un interbloqueo esperando a ocurrir.
> Lo vigilan la ráfaga concurrente y la invariante `sum(ledger) == balance`.

## `CLAUDE.md`

El aviso que PT-142 dejó —*«no tocar los caminos de dinero sin leer PT-146 antes»*— se sustituye por
la descripción de lo que quedó: bloqueo por monedero, orden fijo, e invariante comprobada.
