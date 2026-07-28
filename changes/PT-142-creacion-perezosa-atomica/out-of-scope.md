# PT-142 — Fuera de alcance

## Explícitamente excluido

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **El aislamiento de la suite e2e entre workers** | Es el otro defecto que la misma corrida destapó, y es de naturaleza distinta: uno es producción, el otro es infraestructura de pruebas | **PT-143** |
| 2 | **Subir el nivel de aislamiento** de las transacciones | Caro y global, para resolver cuatro sitios que una restricción ya declarada resuelve | — |
| 3 | **Cerrojos distribuidos** | `distributed-lock.service.ts` existe. Usar coordinación de red para lo que el índice único resuelve sería el remedio caro | — |
| 4 | **Auditar toda la concurrencia del sistema** | Este PT cierra una clase concreta —crear una fila que puede no existir—. Otras carreras (leer-modificar-escribir sobre un saldo, por ejemplo) son otro trabajo | Barrido propio si se quiere |
| 5 | **Rendimiento bajo carga** | Se prueba la carrera, no el rendimiento | — |
| 6 | **Reorganizar los `needs` de CI** | Sigue fuera de alcance desde PT-136 | — |
| 7 | **Poner `build` y `docker` en verde** | Este PT los **desbloquea**; que pasen es otra cosa. Si fallan, se trian con la regla de PT-136: defecto del job → se corrige; defecto del repositorio → PT propio | PT propio si aparece |
| 8 | **Retirar `userId @unique` de `Wallet`** | Sería la peor «solución» posible: haría desaparecer el error y aparecer dos monederos por usuario, con el saldo dependiendo de cuál lea cada consulta. Se hace constar porque es la salida fácil y equivocada | — |

## Lo que sí entra aunque parezca de otro

- **Los tres sitios del monedero**, cuando CI sólo señaló `system-config`. El que se manifiesta
  primero no es el más importante, y arreglar sólo ése dejaría los graves.
- **La prueba concurrente con su caso de control invertido** (AC-02). Cuesta más que un `upsert` y es
  lo único que demuestra que la carrera se cerró.
- **El depósito real a un usuario sin monedero.** Verificación cara comparada con correr la suite, y
  la única que ejerce el camino que motiva el PT.

## Deuda que este PT NO deja

**Cero deuda diferida.** El barrido de PT-142.1 termina con **veredicto para cada sitio**. Lo que
quede fuera del alcance se declara por escrito con su motivo — no se calla y no se «registra para más
adelante», que es el mecanismo que dejó estos cuatro vivos.

## Riesgo aceptado explícitamente

**Este PT toca el monedero, que es el dinero.** `upsert` no debería cambiar nada observable, pero
«no debería» no es un criterio: por eso la barra incluye un depósito real y un cierre de subasta con
holdback, verificados **en la base**. Si alguna de las dos cosas no se puede ejercer, el PT no se
declara hecho.
