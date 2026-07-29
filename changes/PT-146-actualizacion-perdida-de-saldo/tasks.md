# PT-146 — Tareas atómicas

**Prerequisito**: PT-142 y PT-143 fusionados.
**Regla que gobierna todas**: esto es el dinero. Nada se da por bueno sin ejercer el flujo real; la
suite en verde no basta.
**Un commit por método**, con su prueba. Siete cambios en un diff hacen imposible saber cuál rompió qué.

---

## PT-146.1 — RED: la ráfaga concurrente sobre el saldo

- **Objetivo**: reproducir la pérdida. Sin esto no se puede saber si se arregló.
- **Salida**: prueba que lanza N acreditaciones simultáneas al mismo monedero y exige
  `saldo == suma de los importes`.
- **Validación**: **falla hoy**, con un saldo menor que la suma. Si no falla, la prueba no reproduce
  la carrera y se rehace antes de tocar el servicio.
- **Status**: PENDING

## PT-146.2 — RED: la invariante contable

- **Objetivo**: D4. Que el ledger y el saldo cuenten la misma historia.
- **Entrada**: cuidado con `pendingBalance` (PT-071), que vive fuera de `balance`. La invariante
  contempla los dos o se acota a los asientos que mueven `balance` — **escribirla mal sería peor que
  no escribirla**.
- **Salida**: prueba que suma `ledger` y lo compara con `wallets.balance` tras la ráfaga.
- **Validación**: falla hoy. Es la prueba de que el asiento del perdedor queda escrito con un
  `balanceAfter` que no cuadra.
- **Status**: PENDING

## PT-146.3 — `bloquearMonedero(tx, userId)`

- **Objetivo**: D2. Un solo punto.
- **Salida**: helper con `tx.$queryRaw` — `SELECT ... FROM wallets WHERE user_id = $1 FOR UPDATE` —
  que devuelve el monedero bloqueado.
- **Validación**: dos transacciones concurrentes sobre el mismo monedero **se serializan**; sobre
  monederos distintos, **no se esperan**. Las dos mitades importan: un bloqueo global funcionaría y
  sería el remedio caro.
- **Status**: PENDING

## PT-146.4 — El orden de bloqueo, fijado

- **Objetivo**: R1. `captureHeldFunds` toca comprador **y** vendedor: dos monederos en una
  transacción son un interbloqueo esperando a ocurrir.
- **Salida**: orden fijo —`userId` ascendente— documentado en el helper, y una prueba que lance dos
  operaciones cruzadas (A→B y B→A) a la vez.
- **Validación**: ninguna se queda colgada. **Sin esta prueba, el interbloqueo aparece en producción
  y no aquí.**
- **Status**: PENDING

## PT-146.5 — GREEN: `deposit`

- **Objetivo**: el camino que motiva el PT.
- **Validación**: PT-146.1 y PT-146.2 en verde para depósitos.
- **Status**: PENDING

## PT-146.6 — GREEN: los otros seis

- **Entrada**: `withdraw`, `holdFunds`, `releaseFunds`, `refundWithdrawal`, `releaseSettlement`,
  `captureHeldFunds`.
- **Salida**: un commit por método.
- **Validación**: la suite completa tras cada uno.
- **Status**: PENDING

## PT-146.7 — Casos de control

- **Salida**: (a) con bloqueo, N simultáneos → saldo exacto; (b) **revirtiendo un método**, la prueba
  vuelve a fallar; (c) secuencial → pasa en los dos casos.
- **Validación**: los tres. **(b) es el que importa**: demuestra que la prueba mide la concurrencia.
- **Status**: PENDING

## PT-146.8 — Los flujos reales, en la base

- **Objetivo**: la barra del PT.
- **Salida**: depósito real acreditado · retiro real · cierre de subasta con holdback (PT-071) ·
  liberación de liquidación.
- **Validación**: importes exactos **en la base**, y la invariante contable cumplida en cada uno.
- **Status**: PENDING

## PT-146.9 — Duración de las transacciones

- **Objetivo**: R2. El bloqueo se mantiene hasta el commit.
- **Salida**: duración de los siete flujos, antes y después.
- **Validación**: sin degradación relevante. Si la hay, **se declara** en vez de descubrirla luego.
- **Status**: PENDING

## PT-146.10 — ¿Hay monederos ya descuadrados?

- **Objetivo**: la invariante puede revelar daño **ya ocurrido**.
- **Salida**: consulta sobre la base de desarrollo comparando `sum(ledger)` con `balance` por
  monedero. El resultado se registra.
- **Validación**: **no se corrige aquí.** Reconciliar contabilidad con fecha pasada es decisión del
  humano. Lo que este PT debe es **saber si hace falta**.
- **Status**: PENDING

## PT-146.11 — Regresión, evidencia, segunda escritura

- **Salida**: 726 unitarias + las nuevas · 82 e2e en CI · **RULE-24** · `evidence/PT-146/` en `.md` ·
  `HISTORY.log` + `HANDOFF.md` · la nota de aviso de `CLAUDE.md` § monedero, actualizada.
- **Validación**: STATE 5. BUG → `VALIDATION_PENDING`.
- **Status**: PENDING
