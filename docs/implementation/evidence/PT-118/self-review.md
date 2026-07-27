# PT-118 — Self-Review

**Fecha**: 2026-07-27 · **Rama**: `feature/PT-118-checkpoint-de-dependencias` ·
**Estado**: VALIDATION_PENDING

## Checklist FDGE STATE 5

- [x] **¿Criterios de aceptación verificados?** Los seis de `PLAN_ACTUAL.md` §5.
- [x] **¿Escenarios del Proposal Package pasando?** AC-01…AC-07 (7/7) y las dos verificaciones de
      punta a punta.
- [x] **¿Efectos colaterales?** El CI gana un job; nada más cambia. `npm test` verde.
- [x] **¿Reglas de `11-Conventions.md` respetadas?** Sí.
- [x] **¿Commits atómicos?** Uno.
- [x] **¿Sin artefactos de depuración?** Sí.
- [x] **¿Documentación actualizada?** TD-015 corregida, `audit-scope.yaml` dice dónde corre.

## Lo que casi se me cuela

Comprobé el código de salida con `npm run audit:check 2>&1 | tail -12; echo $?` y me devolvió **0**
con el checkpoint fallando. Era el código de `tail`, no el del script.

Si me quedo ahí, habría dado por bueno un control que **parece** funcionar y no rompería el CI
jamás. Lo repetí sin tubería: **1 cuando falla, 0 cuando pasa**.

Es exactamente el patrón que llevamos toda la sesión encontrando —algo que anuncia éxito sin
comprobarlo— y esta vez estuve a punto de escribirlo yo.

## La decisión que sostiene el diseño

Una **línea base**, no un umbral. `--audit-level=high` fallaría desde el primer día por las 13 ya
triadas, el CI quedaría rojo permanente, y alguien lo desactivaría en una semana.

Así es como muere un control: no se borra, se ignora hasta que estorba. La línea base dice qué se ha
mirado **y por qué sigue ahí**; lo que no esté en ella es nuevo, y lo nuevo es lo único que nadie ha
decidido tolerar.

Y se compara **paquete y severidad**, nunca la cifra: 13 hoy y 13 mañana puede ser un arreglo y una
entrada nueva.

## Lo que este PT NO resuelve

Las **13 de la línea base** siguen ahí. Exigen saltos mayores sobre Express o `@nestjs/core` y son
TD-015 — trabajo de plataforma, con su propia verificación.

Este PT no las arregla: hace que **la número 14 se vea el día que llegue**.
