# PT-146 — Fuera de alcance

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Reconciliar saldos históricos** | La invariante puede revelar monederos ya descuadrados. Se **mide y se registra** (PT-146.10); corregir contabilidad con fecha pasada es decisión del humano, no de un PT | Humano |
| 2 | **Aislamiento `serializable`** | Global y caro para resolver siete métodos que un bloqueo por fila cubre | — |
| 3 | **Cerrojos distribuidos** | `distributed-lock.service.ts` existe. Coordinación de red para lo que Postgres hace dentro de la misma transacción | — |
| 4 | **`ratings` y `account-verification`** | Son PT-145: les falta restricción única y exigen migración | **PT-145** |
| 5 | **Rendimiento bajo carga** | Se prueba la carrera. La duración se **mide** (PT-146.9) y se declara si empeora | — |
| 6 | **Carreras sobre otras tablas** | Este PT cierra *leer-modificar-escribir sobre `wallets`*. Si el patrón está en otra tabla, se declara | Barrido propio |
| 7 | **El job `docker`** | PT-147 | — |

## Lo que sí entra aunque parezca de otro

- **Los siete métodos**, no sólo `deposit`. El que se manifestó primero no es el más importante:
  `withdraw` bajo carrera puede dejar el saldo **en negativo**.
- **La invariante contable.** Es más ancha que la carrera, y es lo único que demuestra que el ledger
  y el saldo cuentan la misma historia.
- **El orden de bloqueo fijo.** Cuesta poco y evita un interbloqueo que sólo aparecería en producción.
- **Medir si ya hay descuadres.** No corregirlos, pero **saber** si los hay: descubrirlo por una
  reclamación sería la peor forma.

## Deuda que este PT NO deja

**Cero deuda diferida.** Los siete se corrigen aquí. Si alguno tiene una particularidad que impida el
bloqueo, se declara por escrito con su motivo — no se deja «para más adelante», que es el mecanismo
que mantuvo vivos los nueve sitios de PT-142.

## Riesgo aceptado explícitamente

**El bloqueo se mantiene hasta el commit**, así que dos operaciones sobre el mismo monedero se
serializan. Es intencionado: son exactamente las que se pisan. Monederos distintos no se esperan, y
hay una prueba (BLQ-02) que lo comprueba — porque un bloqueo global también «funcionaría» y sería el
remedio caro.
