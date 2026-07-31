# PLAN ACTUAL — PT-200

**BUG · STANDARD · 2026-07-30**

## Objetivo

Que los documentos que declaran el estado del sistema digan lo que se mide hoy, y que las dos clases que
lo permitieron **queden vigiladas**: el veredicto citado que no coincide con el registro, y el documento
de estado actual que acumula historia.

## Solución propuesta

**1. `HANDOFF.md` vuelve a ser lo que declara ser.** Se sobrescribe con el estado de ahora. Las siete
secciones «Antes de eso» **no se archivan en otro sitio**: ya están en `HISTORY.log`, íntegras y con su
fecha, que es el registro que manda para el trabajo terminado. Duplicarlas fue el defecto.

**2. La guarda de RULE-38 pasa de comprobar la forma a comprobar la relación.** Caso nuevo en
`afirmaciones-de-estado-verificadas.spec.ts`: si una línea de `docs-v2` nombra **un solo** `AUD-XXX` y usa
una palabra de veredicto, esa palabra tiene que ser **la que el registro declara**.

**3. Guarda nueva sobre la cabecera de `HANDOFF`**: las cifras que declara de sí mismo se comprueban
contra su fuente, y el documento no puede acumular secciones históricas.

**4. Las trece afirmaciones medidas, corregidas** en `HANDOFF.md`, `docs-v2/README.md`,
`docs-v2/5-qa/Master-Test-Plan.md` y `10-Technical-Debt.md` (el hueco `TD-018…023`, declarado en vez de
renumerado: renumerar rompería las citas de ADR-058, `HISTORY.log` y dos guardas).

## Alternativas consideradas

| Alternativa | Por qué se rechaza |
|---|---|
| Archivar el cuerpo de `HANDOFF` en `docs/implementation/archive/` | Sería una **tercera** copia de lo que ya está en `HISTORY.log`. El problema no es dónde vive la historia: es que estaba **dos veces**, y una de las dos envejecía |
| Guardar `HANDOFF` entero (todas sus cifras, en cualquier párrafo) | Produce falsos positivos sobre prosa. Se acota a la cabecera, con formato declarado |
| Comprobar también el recuento de **pruebas** (1366, 1113…) | Exigiría ejecutar las cinco suites dentro de una prueba. **No se hace, y se dice**: la guarda declara en su cabecera qué no comprueba |
| Renumerar `TD-024/025` a `TD-018/019` para cerrar el hueco | Rompe citas vivas en ADR-058, `HISTORY.log` y `coherencia-deuda-tecnica.spec.ts`. El hueco se **declara** |
| Prohibir toda cifra en `HANDOFF` | Un estado sin cifras no es un estado. El defecto no es declarar: es declarar y no volver a medir |

## Análisis de regresión

| Qué puede romperse | Mitigación |
|---|---|
| El caso nuevo de RULE-38 acusa líneas con **varios** `AUD` | Sólo se aplica a líneas con **uno**. Es el falso positivo que produjo mi primera medición (4 de 5), y va como caso de control |
| La guarda de `HANDOFF` acusa al reescribir el documento mañana | Lee sólo etiquetas de formato fijo (`**Reglas duras**: **NN**`); si la etiqueta no está, **falla nombrándola** en vez de pasar en vacío |
| La guarda se nombra a sí misma y se acusa | Sexta vez hoy. Los ficheros de prueba **no** están en el corpus vigilado: la de veredictos lee sólo `docs-v2/**`, la de `HANDOFF` sólo `HANDOFF.md` |
| Recortar `HANDOFF` pierde información | `HISTORY.log` es append-only y ya la tiene. Se comprueba: cada PT nombrado en las secciones retiradas tiene su entrada |

## Criterios de éxito

1. Las **trece** afirmaciones medidas, corregidas y vueltas a medir.
2. `afirmaciones-de-estado-verificadas.spec.ts` **falla** con `Master-Test-Plan.md:79` como está hoy, y
   pasa tras corregirlo. Con caso de control de línea multi-`AUD`.
3. La guarda de `HANDOFF` **falla** con el documento de hoy (428 líneas, «15 suites», «150 encabezados») y
   pasa con el reescrito. Con caso de control que la vea fallar en los dos sentidos.
4. Ninguna de las dos pasa **en vacío**: caso de control que comprueba que leyó su corpus.
5. Suite completa del API en verde.
6. `graphify` regenerado y todo en `origin/master`.

## Fuera de alcance

- Recontar los anexos fechados de `Master-Test-Plan` (§«Estado real de las suites (2026-07-27, PT-109)»):
  **declaran su fecha**, y una medición fechada no envejece — informa.
- `PTSA/Evidencias/E-XXX.md`: son inmutables por `[A6]`. Sus cifras son de su día y así deben quedar.
- `CONTEXT_ANALYSIS.md` y `MATRIZ-DEUDA-TECNICA.md`: registran lo medido **en su PT**, con fecha.
