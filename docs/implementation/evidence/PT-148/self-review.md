# PT-148 — Self-Review

- [x] Alcance respetado: se amplía una guarda. **Cero cambios en rutas, controladores o SSR.**
- [x] Los tres defectos encontrados se corrigieron **enseñando a la guarda**, nunca exceptuando un
      fichero. Una excepción exime a uno; una regla sirve al siguiente.
- [x] Casos de control para los dos comportamientos nuevos (C6 bases, C7 dos controladores).
- [x] Guarda contra el paso en vacío: cada sitio exige haber leído ≥ 1 fichero.
- [x] Fichero renombrado con `git mv` — ya no es «del client».
- [x] Sin artefactos de depuración; `git status` revisado.

## Lo que casi sale mal, y merece quedar escrito

**Estuve a punto de "corregir" `bids-view.ts`.** La guarda decía que invocaba dos rutas inexistentes,
con la autoridad de un mecanismo automático. Existen las dos. Lo que lo evitó fue abrir
`bids.controller.ts` antes de tocar el llamante.

Es exactamente el riesgo que el paquete de propuesta anticipó —*«va a acusar rutas que hoy nadie
mira»*— sólo que al revés de como lo esperaba: **la acusación era falsa**. Una guarda recién ampliada
merece la misma desconfianza que el código al que acusa.

## Lo que no queda cubierto

La resolución de bases sólo entiende `const X = '/api/v1/…'` **literal**. Una base compuesta
(`const API = BASE + '/admin'`) seguiría sin resolverse, y volvería a producir el doble fallo del
punto 2. No hay ninguna hoy; si aparece, la guarda no avisará de que dejó de mirar. **Queda dicho.**

## Estado

`VALIDATION_PENDING`.
