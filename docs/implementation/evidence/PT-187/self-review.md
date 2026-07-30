# PT-187 — Autorrevisión (FDGE STATE 5)

**Fecha**: 2026-07-29 · **Rama**: `docs/PT-187-indice-de-estado`
**Cierra**: la deuda de registro que hizo reportar PT-147 como pendiente

---

## Checklist

- [x] **Criterio verificado.** El estado real de cualquier PT se lee en un sitio, sin recorrer 3.400 líneas y sin
      reescribir el registro. El índice dice **0 realmente abiertos** sobre 139 encabezados.
- [x] **Escenarios pasando.** 8 casos, suite completa **985 / 121 suites**, 144 pruebas de documentación en verde.
- [x] **C2 y C4 vistos fallar** por su motivo: tocar el índice a mano, y quitar el bloque de VoBo.
- [x] **Append-only respetado.** No se ha modificado ni una línea `Status:`. El índice se añade al final y se
      regenera desde el propio fichero.
- [x] **Commits atómicos**, trazables a PT-187.
- [x] **RULE-37** documentada, con la advertencia de leer C4 antes de tocarla.

---

## Lo que no salió como estaba planeado

**1. El índice encontró un defecto de proceso mío en su primera ejecución.** Para eso se escribió, pero no
esperaba que fuese tan inmediato:

- **PT-181** estaba `VALIDATION_PENDING` **sin bloque de cierre**: su VoBo se anotó en `PENDING_TASKS.md` y nunca
  en `HISTORY.log`, que es el registro que manda para lo terminado.
- **PT-182 … PT-186** se escribieron con **`Status: DONE` directamente**, y los cinco son BUG. FDGE STATE 6 dice
  que **el agente no cierra bugs**.

El VoBo estaba dado de antemano, así que el resultado era correcto. Lo que faltaba era **la constancia**, y eso no
es un detalle administrativo: **un cierre sin registro de quién lo autorizó es indistinguible de uno que el agente
se dio a sí mismo**, y esa distinción es la razón de ser de STATE 6. Corregido con el bloque de cierre que faltaba,
no reescribiendo las cinco líneas.

**2. Mi guarda midió mal dos veces antes de medir bien.** Van cuatro en la jornada:

| Caso | Qué medía de verdad |
|---|---|
| `C4`, 1ª versión | El regex acababa en `(?=\n## \|$)` **con la bandera `m`**, donde `$` casa fin de **línea**. Cada bloque se cortaba en su encabezado, así que comprobaba **títulos** y acusaba a cinco PT nombrados en el cuerpo del bloque de al lado |
| `C3`, 1ª versión | Trataba `SIN_DECLARAR` como «abierto» y acusaba a seis entradas anteriores al campo `Status:` (PT-039…PT-044). **Un desconocido no es un pendiente**, y tratarlo como tal es inventar trabajo |

El patrón de mis errores es siempre el mismo y ya conviene nombrarlo: **compruebo que exista una cadena en vez de
una relación.** La extracción de bloques es ahora una **función con nombre** y no un regex dentro de un `expect`,
precisamente para que el próximo que la lea vea qué mide.

**3. Es una herramienta de host, y eso no era la primera intención.** El generador escribe en el repo, y el
contenedor lo monta `:ro` **a propósito**. En vez de tocar esa decisión, el script vive en la raíz junto a
`lock:*`, que son los otros comandos de host.

---

## Lo que este PT NO afirma

- **Que el índice sustituya a leer el log.** Da el estado; el *por qué* sigue estando en la entrada y en su bloque
  de cierre.
- **Que las 102 líneas `Status:` estén corregidas.** No lo están, y no deben estarlo: son históricas. Lo que hay
  es un sitio donde el estado de hoy no depende de interpretarlas.
- **Que el criterio de «totalidad» sea infalible.** Reconoce cuatro frases concretas. Un VoBo escrito de otra
  forma no lo detectaría, y entonces el índice diría «abierto» algo cerrado — un falso positivo, que es el lado
  correcto en el que equivocarse.
