# PT-140 — Fuera de alcance

## Explícitamente excluido

| # | Qué | Por qué | Dónde va |
|---|---|---|---|
| 1 | **Resolver los pendientes** | Este PT hace que el registro diga la verdad, no que la verdad sea mejor | PT-136…139 y los que salgan |
| 2 | **Cerrar hallazgos PTSA** | `[R44]`: el agente no cierra hallazgos. H-005 es del humano | — |
| 3 | **Cerrar los BUG en `VALIDATION_PENDING`** | Son veinticuatro y los cierra el humano. Este PT no toca su estado | Validación humana |
| 4 | **Fusionar FDGE, PTSA y FPGE** | Cada uno tiene su autoridad y su ciclo. Se declara la precedencia entre sus artefactos, que es lo que falta | — |
| 5 | **Una guarda sobre la prosa** | Obligaría a redactar de cierta forma para pasar, y la gente aprendería a escribir para el linter. Por eso la contradicción de `10-Technical-Debt.md:103-105` seguirá sin cazarse | Se corrige a mano en **PT-141** |
| 6 | **Decidir el árbol documental** | `docs-v2/` vs `docs/enterprise-documentation/` | **PT-141** |
| 7 | **Automatizar la escritura de `HISTORY.log`** | Un generador que escriba la historia por ti produce historia que nadie ha pensado. La guarda comprueba que **existe**, no la redacta | — |
| 8 | **Reordenar `HISTORY.log`** para que PT-129 y PT-130 queden en su sitio cronológico | Es append-only. Reordenarlo sería falsificar el registro que este PT existe para hacer fiable | — |
| 9 | **Auditar `changes/PT-XXX/tasks.md`** de los 37 paquetes | Son estado por tarea dentro de un PT cerrado; su desfase no engaña a nadie que lea `HISTORY.log` | — |

## Lo que sí entra aunque parezca de otro

- **Las dos entradas que faltan en `HISTORY.log`.** Podrían parecer de PT-129 y PT-130, que están
  cerrados. Entran aquí porque **son la prueba viva del defecto**: dos PT con evidencia, commits y
  hallazgos PTSA cerrados, invisibles en el registro que FDGE declara fuente de verdad.
- **`ROADMAP.md`.** Podría parecer trabajo de FPGE. Entra porque el bucle
  `FDGE → PTSA → FPGE → FDGE` está roto en su tercer eslabón, **y ésa es la causa mecánica de la
  acumulación que este PT investiga**. Dejarlo intacto sería documentar la causa y no tocarla.
- **La regla de precedencia en `CLAUDE.md`.** Sin ella, el resto del PT es una limpieza que dura un mes.

## Deuda que este PT NO deja

**Cero deuda diferida.** Cada fila del barrido termina con veredicto y cita. Ninguna se marca «revisar
más adelante»: eso es literalmente el mecanismo que produjo las diez incoherencias.

## Riesgo aceptado explícitamente

**La contradicción de `10-Technical-Debt.md:103-105` seguirá sin guarda.** TD-005 se declara «cerrada
del todo» y catorce líneas después dice «queda `styleSrc`», con TD-014 cerrada en `:289`. Se corrige a
mano en PT-141, y **ninguna guarda la habría cazado** porque es prosa. Se acepta a conciencia: el
remedio —una guarda sobre el texto— sería peor que la enfermedad.
