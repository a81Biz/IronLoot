# PT-171 — Self-Review (STATE 5)

**Fecha**: 2026-07-29 · **Tipo**: BUG · **Complejidad**: STANDARD
**Hallazgo que cierra**: F-167-G

## Qué se hizo

`10-Technical-Debt.md` es la autoridad de la deuda técnica, y dos de sus siete `ND-XXX` contradecían al
código.

| Entrada | Afirmaba | La realidad |
|---|---|---|
| **ND-002** | *«no `ThrottlerStorageRedisService` referenced»*, citando `app.module.ts:75-85` | Está en `app.module.ts:90` **desde PT-030** — el PT que cerró **H-002** |
| **ND-003** | *«email templates not found in reconnaissance»* | `verification.hbs` y `reset-password.hbs`, **con fecha del 19 de junio**, exactamente donde `ND-003` manda mirar |
| **ND-004** | *«no `coverageThreshold` confirmed»* | **Cierto.** No se toca |

## Por qué ND-002 era el peor de los dos

No es sólo que estuviera desfasado: **contradecía el cierre de un hallazgo**. El mismo defecto —el
throttler en memoria— está registrado como `H-002`, `CERRADA` por PT-030. Así que **dos registros
oficiales decían cosas opuestas sobre el mismo hecho**, y el que mentía es el que gobierna la deuda.

Y la forma de la mentira es la que envejece peor: **una afirmación de ausencia**. El día que alguien
añade lo que se declaraba ausente, la frase sigue ahí y ya es falsa, sin que nada cambie de color. Es
H-016 aplicado a la deuda. `ND-003` es la otra familia: los pendientes que PT-141 cerró leyendo dónde
ellos mismos decían mirar — **el coste no es el trabajo, es que nadie vuelve a mirar**.

## La guarda declara hechos, no redacción

`RULE-35` encoda el **hecho** verificable de cada `ND` cerrado, no su prosa. Una guarda que exija
redactar de cierta forma enseña a escribir para el linter, y entonces el documento deja de decir la
verdad. Comprueba **las dos direcciones**:

- **C1** — el hecho que cerró cada `ND` sigue siendo cierto. Si `ThrottlerStorageRedisService`
  desaparece, el rate limiting vuelve a ser por instancia y **H-002 se reabre**: esto lo caza.
- **C2** — el documento **declara cerrado** lo que está verificado. Es el que estaba roto: el hecho era
  cierto desde PT-030 y el documento seguía diciendo «not verified». Fue el único RED.
- **C3** — toda ruta que la sección cita existe.
- **C4** — cada hecho declarado explica por qué importa.

Añadir una fila a `HECHOS_QUE_CIERRAN` es lo que cuesta cerrar un `ND` con cita. Es deliberado: es la
diferencia entre cerrarlo y **darlo por** cerrado.

## Evidencia

| Fichero | Qué prueba |
|---|---|
| `guarda-RED.txt` | **1 fallo**, y el correcto: C2 acusa `ND-002` y `ND-003`. C1 ya pasaba — el hecho era cierto; lo falso era el documento |
| `guarda-GREEN.txt` | **17/17** junto con `coherencia-deuda-tecnica` |
| `verificacion.txt` | `app.module.ts:90` con el storage de Redis, las dos plantillas con su fecha, y `coverageThreshold` ausente |

## Checklist

- [x] Guarda **vista fallar** antes de arreglar, y el RED señaló exactamente el defecto real
- [x] 6 casos de control, incluidos los dos límites del parser (`Status:` que no se atribuye al `ND`
      siguiente, ruta extraída con `:línea`) y AC-04, que fija la ausencia que ya era falsa
- [x] `ND-004` **intacto**: sigue siendo cierto, y cerrarlo habría sido el error simétrico
- [x] RULE-35 declarada, en el Delta Log, y añadida a `test:guardas`
- [x] No se tocó `H-002` ni ningún hallazgo: sólo el registro de deuda que los contradecía

## Lo que queda fuera, dicho explícitamente

`ND-001`, `ND-005`, `ND-006` y `ND-007` **no se cierran aquí**. No son falsos: dicen que algo *no se
inspeccionó*, que es una afirmación sobre la auditoría y no sobre el código. Cerrarlos exige mirar y
citar —inventariar las colas de BullMQ, los esquemas de los eventos WebSocket—, y eso es trabajo con
alcance propio, no una corrección de coherencia. **Se dejan como están, que es lo honesto**, en vez de
declararlos cerrados por haberlos leído de pasada.
