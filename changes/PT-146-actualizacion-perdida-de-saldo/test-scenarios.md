# PT-146 — Escenarios de prueba

## La ráfaga concurrente

| # | Escenario | Hoy | Esperado |
|---|---|---|---|
| CC-01 | N acreditaciones simultáneas al mismo monedero | Saldo < suma | `saldo == suma` |
| CC-02 | Retiradas simultáneas con saldo justo para una | Podrían pasar las dos | Una pasa, la otra rechaza por saldo |
| CC-03 | Depósito y retirada a la vez | Indeterminado | Saldo coherente con los dos asientos |
| CC-04 | Retención y liberación simultáneas (`holdFunds`/`releaseFunds`) | Ídem | `heldFunds` exacto |

> CC-02 no es cosmético: **una carrera ahí deja el saldo en negativo**, que es peor que perder una
> acreditación.

## La invariante contable

| # | Escenario | Esperado |
|---|---|---|
| INV-01 | Tras CC-01 | `sum(ledger.amount) == wallets.balance` |
| INV-02 | Tras un ciclo completo de subasta | Se cumple, contemplando `pendingBalance` (PT-071) |
| INV-03 | **Hoy, antes de arreglar** | **Falla.** Es la prueba de que el asiento del perdedor queda escrito con un `balanceAfter` que no cuadra |

## El bloqueo

| # | Escenario | Esperado |
|---|---|---|
| BLQ-01 | Dos transacciones sobre **el mismo** monedero | Se serializan |
| BLQ-02 | Dos transacciones sobre monederos **distintos** | **No se esperan.** Un bloqueo global también funcionaría y sería el remedio caro |
| BLQ-03 | Dos operaciones cruzadas A→B y B→A a la vez | Ninguna se queda colgada. **Sin esta prueba el interbloqueo aparece en producción** |

## Casos de control

| # | Escenario | Esperado |
|---|---|---|
| AC-01 | Con bloqueo, N simultáneos | Saldo exacto |
| AC-02 | **Revirtiendo un método**, la prueba vuelve a fallar | **Falla.** Demuestra que mide la concurrencia |
| AC-03 | Secuencial | Pasa en los dos casos |

## Los flujos reales, en la base

| # | Flujo | Criterio |
|---|---|---|
| DIN-01 | Depósito real | Importe exacto; un solo asiento; invariante cumplida |
| DIN-02 | Retiro real | Ídem |
| DIN-03 | Cierre de subasta con holdback | Ingreso a `pendingBalance`, **no** a disponible (PT-071) |
| DIN-04 | Liberación de liquidación | `pendingBalance` → `balance`, sin perder importe |

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **726** + las nuevas |
| REG-02 | e2e en CI | **82** |
| REG-03 | Navegador | 176 — incluye el cobro real |
| REG-04 | Duración de los siete flujos | Sin degradación relevante; si la hay, **se declara** |

## Lo que NO se prueba aquí

- Reconciliar saldos históricos. Se **mide** si hay descuadres (PT-146.10) y se registra; corregir
  contabilidad con fecha pasada es del humano.
- Carga sostenida. Se prueba la carrera, no el rendimiento.
