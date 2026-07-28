# PT-131 — Las capas, medidas una a una

**42 fallos → 8. De 6 suites en verde a 13 de 16.** Cero cambios en `src/api/src/`.

Cada corrección destapaba la siguiente. No era dispersión: era **sedimento**. Los specs dejaron de
ejecutarse (H-015 impedía que el job terminara) y el contrato del producto siguió cambiando debajo
de ellos, cambio tras cambio, sin que nadie lo notara.

## Las once capas

| # | Capa | Qué cambió en el producto |
|---|---|---|
| 1 | `startsAt` en el pasado | Se añadió `isFutureDate` al DTO |
| 2 | Duración de 2 s | Se impuso duración mínima de **1 hora** |
| 3 | Subasta creada ya en curso | No se puede: hay que crear futura y mover el reloj |
| 4 | Puja de 105 sobre 100 | **PT-041** impuso incremento mínimo de 10 |
| 5 | Usuario sin monedero | Pujar pasó a **retener fondos** |
| 6 | Monedero inactivo | Se activa con el primer depósito real |
| 7 | `GET /auctions` como array | Pasó a respuesta **paginada** `{data,total,page,limit}` |
| 8 | `POST /orders` | **Eliminado.** El pedido lo crea el cierre de la subasta |
| 9 | `CreateCheckoutDto` sin `amount` | Se añadió `amount` obligatorio |
| 10 | Borrado de datos sin cascada | Aparecieron `shipments`, `ratings`, `commission_records`, `notifications` colgando |
| 11 | Neto del vendedor en `balance` | **PT-071**: va a `pendingBalance` (retención de liquidación) |

Once cambios de contrato. **Todos correctos en el producto. Ninguno llegó a los tests.**

## Lo que queda, y por qué NO es sedimento

Tres suites, 8 tests. Ninguno es contrato viejo:

| Suite | Causa | Dónde vive |
|---|---|---|
| `settings` | **H-019** — `PATCH` parcial borra las ramas no enviadas | Defecto real de producto |
| `wallet` | **H-018** — el depósito devuelve 500 con referencia desconocida | Defecto real de producto |
| `payments` | Prueba contra la pasarela **real**; sin simulación no puede pasar en CI | Diseño de test |

Los dos primeros **están registrados como hallazgos y el test los está delatando correctamente**.
Maquillarlos para que pasen sería certificar el defecto.

El tercero es una conversación aparte: un e2e que llama a `api-m.sandbox.paypal.com` no es un test
de integración, es un test de contrato contra un tercero.

## La lección

**El producto no tenía ni un defecto en las once capas.** Los tests eran un registro fósil de un
contrato de hace meses.

Y los dos defectos reales que sí había —H-018 y H-019— **los encontraron estos mismos tests**, que
llevaban meses diciendo la verdad sin que nadie los escuchara.
