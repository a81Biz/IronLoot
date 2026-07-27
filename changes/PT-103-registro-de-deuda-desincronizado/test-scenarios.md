# PT-103 — test-scenarios.md

| ID | Escenario | Esperado |
|---|---|---|
| CD-01 | Toda deuda declarada cerrada en `HISTORY.log` tiene un `Status:` no-abierto en el registro | Ninguna incoherencia |
| CD-02 | Caso de control: historia dice cerrada, registro dice `Open` | **Rechazado**, nombrando la deuda |
| CD-03 | Caso de control: historia dice cerrada, registro dice `CERRADA … por PT-XXX` | Aceptado |
| CD-04 | Redacción que no encaja en ninguna lista | **No se acusa** — falso positivo es peor que falso negativo |
| CD-05 | Los ficheros no existen (clon limpio, `docs/` gitignored) | **Se salta**, no falla |
| CD-06 | El registro tiene una deuda que la historia no menciona | Irrelevante: no se exige lo contrario |

> CD-02 y CD-03 son los que dan valor a CD-01: sin ellos, un CD-01 verde podría significar que la
> guarda no sabe mirar. CD-05 es el que impide que la guarda muera de un rojo injusto.
