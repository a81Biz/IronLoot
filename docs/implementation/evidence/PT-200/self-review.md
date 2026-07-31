# PT-200 — autorrevisión

## Checklist FDGE STATE 5

- [x] Criterios de éxito del plan verificados **ejecutando**, no leyendo.
- [x] Las dos guardas vistas **fallar y pasar**. RED registrado abajo.
- [x] Casos de control en los dos sentidos, y uno que impide pasar en vacío en cada una.
- [x] Convenciones respetadas; sin `console.log` ni código comentado.
- [x] Commits atómicos y trazables a PT-200.
- [x] `HISTORY.log` y `PENDING_TASKS.md` actualizados; PT-200 queda `VALIDATION_PENDING`.

## RED verificado antes de tocar nada

**`afirmaciones-de-estado-verificadas.spec.ts § C4`** — con los documentos sin corregir:

```
● C4: ninguna linea cita un veredicto distinto del que declara el registro — PT-200
+   "docs-v2/5-qa/Master-Test-Plan.md: AUD-013 dice «sin verificar», el registro «corregido»",
Tests: 1 failed, 13 passed
```

**Cazó la línea real y ninguno de los cuatro falsos positivos** que dio mi primera medición a mano. Ésa
era la duda de diseño y quedó resuelta ejecutando.

**`handoff-es-estado-actual.spec.ts`** — con el `HANDOFF.md` de 428 líneas:

```
✕ C1  ✕ C2  ✕ C3  ✕ C4  ✕ C5  ✕ C6      (los cinco AC en verde)
C2: Expected 38, Received 36        C3: Expected 19, Received 15
C4: Expected 148, Received 150      C5/C6: Received null
Tests: 6 failed, 5 passed
```

## Cuatro cosas mías, y las cuatro del mismo tipo

**1. Mi guarda contó menciones en vez de definiciones.** `C2` esperaba **38** reglas porque contaba cada
`RULE-NN` que aparece en el texto; las definidas son **36** — los números 18 y 21 son huecos declarados en
`11-Conventions.md:584`. **Séptima vez en la jornada que mido la forma en vez de la cosa**, y esta vez
dentro de la guarda escrita para impedirlo.

**2. Y tenía una tercera definición encima.** `C4` recontaba encabezados por su cuenta y daba **148**; el
generador dice **151** (un encabezado agrupado vale por varios PT) y las líneas `## PT-` son **159**. Tres
cifras verdaderas para tres preguntas distintas. Lo corregí **leyendo el índice** en vez de recontar: una
cuarta definición dentro de una guarda de coherencia habría sido el defecto que persigue.

**3. Escribí «8 y 8» sin medir.** Al corregir `Master-Test-Plan` puse 8 pruebas de comisiones y 8 de
reembolsos porque el total era 16. Son **11 y 5**. Lo cacé antes de comitear, pero es **exactamente el
defecto que este PT corrige, cometido dentro de su propio arreglo**.

**4. Y la nota de corrección se acusó a sí misma.** Escribí *«sin verificar (AUD-013)»* para citar lo que
la fila decía, y `C4` la acusó — con razón: es indistinguible de la afirmación original. **Octava vez en
la jornada.** Reescrita para citar la frase sin ponerle el identificador al lado. El mismo arreglo hizo
falta en el comentario de la guarda nueva, que citaba dos reglas sin definir y despertó a
`reglas-citadas-existen.spec.ts`.

## Lo que NO queda vigilado, dicho aquí porque no se cita en otro sitio

El **recuento de pruebas** (1366 / 1113 / 144 / 93). Verificarlo exigiría ejecutar las cinco suites dentro
de una prueba de documentación. Lo sostiene una corrida manual, y por eso `HANDOFF.md` lo dice en su
propia cabecera en vez de dejarlo implícito.
