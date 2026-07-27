# PT-118 — test-scenarios.md

| ID | Escenario | Esperado |
|---|---|---|
| AC-01 | Todos los avisos están en la línea base | **Pasa**, código 0 |
| AC-02 | Aparece un paquete que no está en la base | **Falla**, y lo nombra |
| AC-03 | Un paquete de la base sube de `moderate` a `critical` | **Falla** |
| AC-04 | Un paquete de la base baja de severidad | **Pasa** |
| AC-05 | Un paquete de la base ya no tiene aviso | **Pasa**, y sugiere quitarlo de la base |
| AC-06 | Sin avisos en absoluto | **Pasa** |
| AC-07 | La línea base no existe | **Falla** con un mensaje que dice cómo generarla — no en silencio |

> AC-02 y AC-03 son los que dan valor a AC-01: sin ellos, un verde podría significar que el
> comparador no compara.

## Verificación de punta a punta

| ID | Escenario | Esperado |
|---|---|---|
| E2E-01 | `npm run audit:check` con el estado real de hoy | Pasa |
| E2E-02 | Con un aviso inventado añadido a la salida | Falla nombrándolo |
