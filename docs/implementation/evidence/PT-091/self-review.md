# Self-Review — PT-091

## Protocolo

| Estado | Cumplido |
|---|---|
| STATE 1-B | Sí — medido proyecto a proyecto antes de escribir el plan |
| STATE 2 | Sí — con la decisión central argumentada: medir antes de `--fix` |
| STATE 3 | Condensado en el PLAN (el trabajo es de configuración, no de diseño) |
| Proposal Gate | ACK delegado para toda la matriz |
| STATE 4 rama propia | Sí — `fix/PT-091-linter-tres-servicios` |
| STATE 4 tests RED | **No aplica**: el «rojo» aquí es el propio linter, y se midió antes |
| STATE 5 | Sí |
| STATE 6 | `VALIDATION_PENDING` |
| STATE 7 | Al cerrar |

## La decisión que más valor aportó

Separar **medición → fondo → formato** en commits distintos. Si hubiera lanzado `--fix` de
entrada, los tres `bootstrap()` sin manejar habrían quedado sepultados entre 1.099 líneas
reformateadas, y el hallazgo de que **la API sí maneja el fallo de arranque y los otros no** no
habría aparecido.

## Criterios de éxito

- [x] `lint:check` se ejecuta en los cinco proyectos
- [x] Recuento por proyecto y por regla, escrito arriba
- [x] Formato en commit propio, separado del fondo
- [x] Cero errores de fondo en los cinco
- [x] `pre-commit` cubre los cinco, autoverificado
- [x] Suites verdes y los cuatro compilan

## Lo que NO se hizo, a propósito

- **Los avisos** (`no-console`, `no-explicit-any`, `explicit-function-return-type`): 1.295 en
  total. Convertirlos en errores es una decisión de estándar de código, no una corrección de
  defecto, y merece su propia conversación.
- **El JavaScript de navegador** sigue fuera del linter: es TD-010, en la matriz como PT-096.
- **F-26** no se arregló de paso, aunque es de una línea. Va a la matriz como PT-099, que es la
  regla que esta serie se impuso.
