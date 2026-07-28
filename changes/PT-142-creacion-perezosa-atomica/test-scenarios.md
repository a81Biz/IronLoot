# PT-142 — Escenarios de prueba

## Las pruebas concurrentes — el corazón del PT

Una carrera «arreglada» sin una prueba que falle no está arreglada: no hay forma de saberlo.

| # | Escenario | Hoy | Esperado |
|---|---|---|---|
| CC-01 | N creaciones simultáneas del monedero del mismo usuario | **Falla con `P2002`** | 1 monedero, **0 errores** |
| CC-02 | `seed()` en paralelo consigo mismo, base vacía | **Falla**: `Unique constraint failed on the fields: (key)` | 0 errores |
| CC-03 | Dos depósitos simultáneos a un usuario **sin** monedero | Uno puede perder | Los dos acreditan; **un solo monedero** |
| CC-04 | Cierre de subasta con vendedor sin monedero, concurrente | Ídem | Abono correcto |

**CC-01 y CC-02 deben fallar antes de tocar el servicio.** Si no fallan, la prueba no reproduce la
carrera y se rehace.

## Casos de control — que la prueba mida lo que dice

| # | Escenario | Esperado |
|---|---|---|
| AC-01 | Con `upsert`, N simultáneos | 1 fila, 0 errores |
| AC-02 | **Revirtiendo a `findX` + `create`**, la prueba vuelve a fallar | **Falla.** Es el control que importa: demuestra que mide la concurrencia y no otra cosa |
| AC-03 | Creación **secuencial** | Pasa en los dos casos. Lo que distingue es la concurrencia |

> Sin AC-02, una prueba de concurrencia que pasa siempre no prueba nada.

## La barra del PT: el dinero, ejercido de verdad

| # | Escenario | Criterio |
|---|---|---|
| DIN-01 | **Depósito real a un usuario sin monedero previo** | Acreditado. **Un solo asiento** en `payments` para esa referencia. Saldo exacto |
| DIN-02 | Ese mismo depósito, reintentado | **No duplica.** `Payment.reference` sigue siendo la garantía; PT-142 no la toca |
| DIN-03 | Cierre de subasta completo | Ingreso del vendedor a `pendingBalance`, **no** a disponible (PT-071) |
| DIN-04 | `getWallet()` y una acreditación a la vez, mismo usuario sin monedero | Las dos ven **la misma fila**. Es el caso concreto que motiva el PT |

> DIN-01 se comprueba **en la base**, no en un log. Si no pasa, el PT no está hecho aunque todo lo
> demás esté verde.

## La guarda RULE-22

| # | Escenario | Esperado |
|---|---|---|
| G-01 | **RED** contra el código de hoy | **Falla**, nombrando los cuatro sitios |
| G-02 | **GREEN** tras los `upsert` | Pasa |
| G-03 | **Control** — `findX` + `create` de **modelos distintos** | Pasa. No es la carrera |
| G-04 | **Control** — `upsert` | Pasa |
| G-05 | **Control** — `findX` + `create` del **mismo modelo** | **Falla** |
| G-06 | **Control** — `create` con manejo explícito de `P2002` y motivo escrito | Pasa. Es la salida declarada |

## Arranque

| # | Escenario | Esperado |
|---|---|---|
| ARR-01 | Arranque limpio contra base vacía | La configuración se siembra entera |
| ARR-02 | Segundo arranque sobre base ya sembrada | **No pisa** lo que hay. `update: {}` es creación perezosa, no sincronización |
| ARR-03 | Dos instancias arrancando a la vez | Las dos llegan a `healthy` |

## Lo que este PT desbloquea

| # | Escenario | Esperado |
|---|---|---|
| CI-01 | `test-integration` en CI | **Verde**, 77/77 |
| CI-02 | `build` | **Se ejecuta por primera vez en la historia del repositorio** |
| CI-03 | `docker` | Ídem |

> Si `build` o `docker` fallan, **se trian igual**: defecto del job → se corrige aquí; defecto del
> repositorio → PT propio. La regla de PT-136 sigue en vigor.

## Regresión

| # | Suite | Línea base |
|---|---|---|
| REG-01 | Unitarias | **702** + las nuevas |
| REG-02 | e2e | **77** |
| REG-03 | Navegador | **176** — incluye el cobro real, que atraviesa los sitios 2 y 3 |
| REG-04 | `lint` | 0 errores |

## Lo que NO se prueba aquí

- El aislamiento de la suite e2e entre workers. Es **PT-143**.
- Comportamiento bajo carga sostenida. Se prueba la carrera, no el rendimiento.
