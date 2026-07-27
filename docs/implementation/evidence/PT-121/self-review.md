# PT-121 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `feature/PT-121-checkpoint-observabilidad` ·
**Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios verificados?** Los cinco del enriquecimiento.
- [x] **¿Escenarios pasando?** CM-01…CM-09 (9/9) y las dos verificaciones de punta a punta.
- [x] **¿Efectos colaterales?** Sólo lee. El silencio inyectado se restauró y se comprobó.
- [x] **¿Commit atómico?** Uno.
- [x] **¿Documentación actualizada?** `audit-scope.yaml` dice dónde corre D3.

## Por qué esta métrica y no otra

`silent_failure_count` es la que esta sesión ha ganado el derecho a medir. Cinco hallazgos, todos de
la misma familia —**el código anuncia una cosa y hace otra, sin ruido**— y ninguno lo encontró un
test:

| | |
|---|---|
| F-34 | «live feed is optional» → la puja en vivo apagada días, con 168/168 en verde |
| F-39 | «Sesiones en Redis» anunciado mientras cada escritura fallaba |
| H-010 | Una función probada que nadie invocaba |
| H-011 | Dos `as any` sobre un campo inexistente |
| H-012 | Un tipo reutilizado, declarado en un comentario |

## La decisión que más pensé: el comentario no cuenta

Casi los 25 llevan explicación y son deliberados. Mi primer instinto fue aceptarlos por eso.

Pero **F-34 también tenía comentario**. Un comentario dice que alguien pensó en ello; no dice que
siga siendo cierto tres refactores después.

Así que el detector **no juzga cuáles son aceptables** — los fija en línea base, como PT-118 con las
dependencias, y falla cuando aparece el 26. `CM-04` reproduce el catch de F-34 literal.

## Lo que incluí y casi se me olvida

El **JavaScript de navegador**. Ocho de los 25 están ahí, y es justo donde vivía F-34 — el ámbito
que ninguna herramienta de este repositorio miraba. Un barrido sólo sobre `.ts` habría dado 17 y
habría dejado fuera el caso que originó todo.

## Lo que NO hace

- **No arregla los 25.** Son decisiones tomadas, muchas correctas.
- `fallback_quality` queda como evaluación documentada: exige juicio sobre cada fallback, y `[R57]`
  dice que lo que exige juicio no se fuerza a código.
