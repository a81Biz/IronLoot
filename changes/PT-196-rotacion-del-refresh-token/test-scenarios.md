# PT-196 — test-scenarios.md

Los **10 escenarios** del enrichment, con dónde se comprueban y qué los haría fallar.

| # | Escenario | Dónde | Qué lo haría fallar |
|---|---|---|---|
| 1 | Refrescar → token nuevo ≠ anterior | PT-196.6 | No rotar, o rotar sin guardar el anterior |
| 2 | Refrescar con el nuevo → funciona | PT-196.6 | Buscar sólo por `refreshToken` sin actualizar la fila |
| 3 | Navegación **y** `fetch`: los dos persisten | PT-196.2 / .3 | Escribir sólo `access_token` — **el defecto de hoy** |
| 4 | Token viejo **pasada la gracia** → sesión revocada | PT-196.6 | No comparar contra `previousRefreshToken` |
| 5 | Tras esa revocación, el **nuevo** tampoco vale | PT-196.6 | Revocar el token en vez de la sesión |
| 6 | El legítimo acaba en el login. **Es correcto** | PT-196.6 | — (es la consecuencia aceptada) |
| 7 | Dos refrescos simultáneos **dentro** de la gracia → los dos reciben sesión | PT-196.6 | Gracia = 0, o comparar sin `rotatedAt` |
| 8 | Dos instancias del CLIENT, mismo token → igual que 7 | PT-196.6 | Confiar en la deduplicación por proceso de PT-194, que **no** cubre esto |
| 9 | Sesión creada **antes** de la migración sigue valiendo | PT-196.5 | Columnas no anulables, o exigir `previousRefreshToken` |
| 10 | Si la escritura falla, el anterior **sigue valiendo** | PT-196.7 | Entregar el token antes de confirmar la escritura |

## Y tres que puso el diseño

| # | Escenario | Dónde | Por qué |
|---|---|---|---|
| 11 | Una sesión **ya revocada** no dispara un evento de reuso en cada reintento | PT-196.6 | Si no, el registro se llena de ruido justo cuando hay que leerlo |
| 12 | Dos refrescos concurrentes con el **vigente** no se pisan | PT-196.6 (`FOR UPDATE`) | Sin bloqueo, la segunda rotación pisa a la primera y el token ya entregado deja de existir |
| 13 | El evento de reuso lleva **las dos** IP y los **dos** `userAgent` | PT-196.8 | Con una sola punta queda «hubo un reuso» y no se puede investigar |

## Cómo se prueba la gracia sin esperar treinta segundos

**Se escribe `rotatedAt` en el pasado.** Una fila con `rotatedAt = ahora − 31 s` es exactamente lo que
el sistema vería pasada la ventana. No se espera ni se toca el reloj de la máquina.

Es el mismo criterio que la fase 35 de QA con `SETTLEMENT_HOLDBACK_HOURS=0` y que los tokens firmados
con `exp` en el pasado de PT-194: **se ejerce el mismo camino y sólo se adelanta el reloj**.

## Lo que estos escenarios NO cubren

- **Un robo que llega tras dos rotaciones** del legítimo: se lee como sesión caducada. Es la limitación
  declarada de recordar **un** token hacia atrás (D-1). Una prueba de eso mediría la limitación, no un
  defecto.
- **El aviso al usuario**: fuera de alcance.
