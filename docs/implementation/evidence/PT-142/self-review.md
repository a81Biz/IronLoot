# PT-142 — Self-Review

**Fecha**: 2026-07-28 · **Rama**: `fix/PT-142-creacion-perezosa-atomica` · **Estado**:
`VALIDATION_PENDING`. Es un BUG: **lo cierra el humano.**

## Lo que consigue

La creación perezosa de una fila con restricción de unicidad es atómica en **siete** sitios, tres de
ellos en el camino del dinero. La medición completa está en `medicion.md`.

## Criterios de éxito

| # | Criterio | Estado |
|---|---|---|
| 1 | La prueba concurrente falla antes y pasa después | ✅ `P2002` reproducido; 5/5 después |
| 2 | Los sitios sin `findX` + `create` | ⚠️ **Siete de nueve.** Dos van a **PT-145** con excepción declarada |
| 3 | `test-integration` en verde → `build` y `docker` se ejecutan | ⏳ en CI cuando escribo esto |
| 4 | Un depósito real acreditado a un usuario **sin monedero previo** | ✅ 0 → 1 monedero, saldo 321.50, 1 asiento, invariante `ledger == saldo` |
| 5 | Regresión sin pérdidas | ✅ **713/713** en 95 suites (702 + 11 de la guarda) |

## Lo que encontré y no esperaba

**El barrido devolvió nueve sitios, no cuatro.** La ventana de seis líneas del `DISCOVERY` original se
quedaba corta. Y son de **dos clases**: creación perezosa (una operación legítima falla) y guarda de
negocio (500 en vez de 400) — salvo cuando no hay restricción única, y entonces **crea un duplicado
en silencio**, que es peor que cualquier error.

**Las dos salidas evidentes no funcionan**, y sólo se supo midiendo:

1. `upsert` **dentro** de una transacción interactiva no es atómico — Prisma hace `SELECT` + `INSERT`.
2. `upsert` **fuera** tampoco lo garantiza. Y aquí está lo incómodo: **la prueba de 8 llamadas pasó
   con `upsert`**. Si no hubiera una segunda prueba concurrente sobre el depósito, habría cerrado el
   PT con una corrección que no corrige. Pasó por suerte.

**En `watchlist` había un comentario** que decía haber considerado `upsert` y haberlo descartado por
«cleaner logic». La lógica era más clara y **no era idempotente**: el código prometía «Idempotent 200
OK» y daba 500. La duda que el comentario registraba —«`upsert` requiere un `where` sobre la clave
única»— tenía respuesta dos líneas más abajo, donde ya se usaba `userId_auctionId`.

## Lo grave: PT-146

Quitado el `P2002`, aparece la carrera de debajo. **Dos acreditaciones simultáneas responden las dos
con éxito y una se pierde en silencio** — 250 o 100 donde tocaban 350, según quién escriba el último.

Es peor que lo que este PT arregla. Lo de aquí fallaba **ruidosamente**: `P2002`, el ciclo se reabre,
PT-087 reintenta y el dinero llega. PT-146 **no falla**: devuelve 200, deja el asiento del perdedor
escrito con un `balanceAfter` que no cuadra con el saldo, y nadie se entera.

Estaba declarado fuera de alcance **antes** de medirlo, y por eso no lo toco. Pero conviene decirlo
sin rodeos: **es lo más serio que ha salido en toda esta tanda de PT**, y toca los cinco caminos que
mueven saldo, no sólo el depósito.

## Decisiones que conviene poder discutir

- **`isActive` va como parámetro** de `asegurarMonedero()`. Los caminos no coincidían: la creación
  perezosa nacía inactiva y la del depósito activa. **Conservé la diferencia** en vez de unificarla:
  sería un cambio de comportamiento colado dentro de una corrección de concurrencia. Si esa
  diferencia no tiene razón de ser, merece su propio PT.
- **La creación sale de la transacción** en `deposit()` y `captureHeldFunds()`. No se pierde ninguna
  garantía: lo que tiene que ser atómico es el asiento con el saldo, y sigue dentro. Un monedero con
  saldo cero y sin asiento no es un estado inconsistente — es lo que deja cualquier visita a la
  página del monedero.
- **La lista de excepciones de la guarda tiene caducidad**: una prueba comprueba que cada excepción
  **sigue haciendo falta**. Si PT-145 corrige uno de los dos y nadie retira su línea, la guarda lo
  dice. Sin eso, una lista de excepciones es el cajón donde estos nueve sitios vivieron meses.

## Lo que NO hice, a propósito

- **No amplié el alcance a los dos sitios sin restricción única.** Exigen migración (RULE-10) sobre el
  camino del dinero, y hacerlo sin avisar sería justo lo que el Proposal Gate existe para evitar.
- **No debilité la aserción de CC-03** a un número que pasara. La quité, con el motivo escrito y
  apuntando a PT-146: lo que se comprueba es lo que este PT arregla, y lo que no, está registrado.
- **No unifiqué `isActive`.**

## Lista de STATE 5

- [x] Criterios verificados — **y los dos parciales, declarados**
- [x] Escenarios del paquete de propuesta (los que este PT cubre)
- [x] Sin efectos colaterales: 713/713, `lint` 0 errores
- [x] **RULE-22** añadida; guarda con 7 casos de control
- [x] Commits atómicos trazables a PT-142
- [x] Documentación: `CLAUDE.md` (§ monedero, con el aviso de PT-146), `11-Conventions.md`
- [x] Sin `console.log` ni código comentado

## Lo que falta para cerrarlo

1. **La corrida de CI** con `test-integration` en verde → `build` y `docker` ejecutándose por primera
   vez en la historia del repositorio.
2. **El VoBo humano.** Es un BUG.
