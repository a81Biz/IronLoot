# PT-120 — design.md

**FEATURE · STANDARD · `[R57]` / checkpoint D1.N1**

## D1 — Las reglas son datos, no código

Un catálogo de entradas `{id, enunciado, peso, sql, esperado}` en vez de un script con quince
funciones.

F12 (Gobernanza de Dominio) existe para **ampliar y versionar** las reglas del dominio. Si añadir
una obliga a tocar el motor, F12 depende de que alguien sepa programar el motor — y entonces no se
amplía.

## D2 — Tres veredictos, no dos

`CUMPLE` · `VIOLADA` · `SIN_DATOS`.

Un catálogo que devuelve «cumple» sobre una base vacía **miente**, y miente en la dirección
cómoda. Es la misma familia que el `catch` mudo de F-34 y que el «Sesiones en Redis» de F-39: un
éxito anunciado sin comprobación.

Y las `SIN_DATOS` quedan **fuera del denominador** del score: no se puede puntuar lo que no se ha
podido mirar. Meterlas como cumplidas inflaría el número; como violadas, lo hundiría. Ninguna de las
dos sería cierta.

## D3 — Cada regla lleva su caso de control

Una regla que sólo ha visto verde no ha demostrado que sepa ver rojo. Es la lección que esta sesión
ha repetido en `orden-de-scripts`, `coherencia-deuda-tecnica`, `estilos-fuera-de-plantillas` y
`audit-check`.

Aquí el control es más barato que en ninguno: se inyecta la violación en la BD, se comprueba que la
regla la detecta, y se deshace.

## D4 — El score se calcula, no se transcribe

En DS-008 escribí `rubric_compliance_score = 100` a mano tras leer once resultados. Salió bien, pero
**un número de auditoría que nadie puede reproducir no es un número de auditoría**.

## D5 — Lo que NO se convierte en código

`[R57]` dice que las reglas que exigen juicio «permanecen como evaluación reproducible documentada,
no como código». Aquí:

- **CR-007** (ventana de disputa): binaria, pero su entrada no es el producto — exige provocar un
  rechazo contra la API. Vive en `ventana-desde-la-entrega.spec.ts` (PT-115) y en la fase de QA.
- **CR-008** (firma HMAC): su entrada es la petición, no el producto. Vive en la fase 70.

Forzarlas al catálogo sería inventar un veredicto sobre algo que no se está midiendo.

## Lo que este PT NO hace

- No sustituye a la suite de QA: aquélla prueba **caminos**; esto verifica **invariantes**.
- No añade los checkpoints D3 ni D5: van en PT-121 y PT-122.
- No amplía el catálogo más allá de F-1.
