# PT-146 — Self-Review

**Fecha**: 2026-07-28 · **Rama**: `fix/PT-146-actualizacion-perdida-de-saldo` ·
**Estado**: `VALIDATION_PENDING`. Es un BUG: **lo cierra el humano.**

## Lo que consigue

Los siete métodos que mueven saldo leen bloqueando la fila. La actualización perdida se cierra, y con
ella el descuadre entre `ledger` y `wallets.balance`.

## Criterios de éxito

| # | Criterio | Estado |
|---|---|---|
| 1 | La ráfaga concurrente falla antes y pasa después | ✅ 100 → 600 |
| 2 | La invariante contable | ✅ ledger == saldo |
| 3 | Los siete métodos | ✅ |
| 4 | Orden de bloqueo fijo en `captureHeldFunds` | ✅ `bloquearDosMonederos()` |
| 5 | Monederos distintos no se esperan | ✅ BLQ-02 |
| 6 | ¿Hay descuadres previos? | ✅ **Cero**, medido |
| 7 | Regresión | ✅ 726/726 · 9/9 concurrencia |
| 8 | Duración de las transacciones (PT-146.9) | ⚠️ **No medida por separado.** Las suites no muestran degradación, pero no es lo mismo que medirlo |
| 9 | Los flujos reales en la base (PT-146.8) | ⚠️ **Parcial**: depósito sí; retiro, cierre con holdback y liberación **no se ejercieron uno a uno** |
| 10 | BLQ-03 — operaciones cruzadas A→B / B→A | ✅ **Escrita y en verde** tras este repaso |

## Lo que NO declaro cumplido, y es importante

**El criterio 10 estaba sin cumplir cuando escribí este repaso**, y escribirlo fue lo que me hizo
hacerlo. `bloquearDosMonederos()` ordena por `userId` y eso *debería* impedir el interbloqueo — pero
*debería* no es un criterio, y lo había escrito yo mismo en el paquete: *«es la mitigación clásica, y
se escribe en vez de confiarse»*. **BLQ-03 ya existe y pasa**: dos capturas cruzadas A→B y B→A
simultáneas, con A y B pagándose mutuamente.

Lo dejo anotado en vez de borrar el párrafo: el self-review sirvió para algo, y eso vale más
registrado que disimulado.

**Los criterios 8 y 9** siguen parciales. El bloqueo se mantiene hasta el commit: eso alarga
transacciones y no lo he medido.

## El error propio

**CI cazó un fallo mío de PT-142**: dejé `system-config.seed()` con `upsert` porque su prueba pasaba
en local — **por la misma suerte contra la que ese PT advertía por escrito**. Escribí la lección, la
apliqué al monedero, y dejé el otro sitio atrás.

Lo que lo hizo visible no fue releer el código: fue que **CI se ejecuta**, cosa que empezó hace unas
horas con PT-136. Es el argumento más limpio a favor de toda esta tanda.

## Lo que NO hice, a propósito

- **No reconcilié saldos históricos.** Medí que no hacía falta (cero descuadres). Corregir
  contabilidad con fecha pasada es del humano.
- **No usé `increment`**, aunque es más corto: dejaría el asiento mintiendo.
- **No introduje un cerrojo global.** BLQ-02 existe precisamente para distinguirlo.

## Lista de STATE 5

- [x] Criterios verificados — **y los tres incompletos, declarados**
- [x] Sin efectos colaterales: 726/726, `lint` 0 errores
- [x] Commits atómicos trazables a PT-146
- [x] **Sin artefactos de depuración** — comprobado buscando ficheros nuevos
- [x] **RULE-24** escrita en `11-Conventions.md`, y la nota de `CLAUDE.md` § monedero reescrita: ya
      no anuncia PT-146 como pendiente, describe lo que quedó

## Lo que falta para cerrarlo

1. **Los flujos reales** que faltan de ejercer uno a uno: retiro, cierre con holdback, liberación.
   BLQ-03 los toca de refilón —usa `holdFunds` y `captureHeldFunds` de verdad— pero no comprueba sus
   importes.
2. **La duración de las transacciones** (criterio 8), sin medir.
3. **El VoBo humano.**
