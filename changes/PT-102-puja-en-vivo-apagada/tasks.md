# PT-102 — tasks.md

Rama: `fix/PT-102-puja-en-vivo-apagada`

| ID | Tarea | Estado |
|---|---|---|
| PT-102.1 | Guarda estática del orden de scripts — **en RED** | PENDING |
| PT-102.2 | Fase de navegador: dos ventanas, propagación real — **en RED** | PENDING |
| PT-102.3 | Corregir el orden con `defer` en `detail.html` | PENDING |
| PT-102.4 | El `catch` deja de ser mudo en `pages-auction-detail.js` | PENDING |
| PT-102.5 | Verificar que la guarda estática caza la regresión (invertir a propósito) | PENDING |
| PT-102.6 | Suites completas y evidencia | PENDING |

---

## PT-102.1 — Guarda estática del orden de scripts

**Objetivo**: que una plantilla que use `io` sin haber cargado socket.io antes **falle en
`npm test`**.

**Entradas**: las plantillas de CLIENT (`views/**/*.html`) y el JS de `public/js/`.

**Salidas**: `src/apps/client/test/orden-de-scripts.spec.ts`.

**Validación**: debe **fallar contra el código actual** (orden invertido) antes de PT-102.3. Si
pasa en verde de primeras, la guarda no prueba nada y hay que rehacerla.

## PT-102.2 — Fase de navegador con dos ventanas

**Objetivo**: fijar lo que ninguna guarda estática puede prometer — que A ve subir el precio.

**Entradas**: actores y subasta de `10-bootstrap.cjs`/`30-e2e.cjs`.

**Salidas**: `tests/qa-browser-suite/32-puja-en-vivo.cjs` + su línea en `run-all.sh`.

**Validación**: contra el código actual, `V-LIVE-3` (propagación) debe **fallar**. Tras PT-102.3,
debe pasar.

## PT-102.3 — El orden, con `defer`

**Objetivo**: que `io` exista cuando se le llama.

**Salidas**: `src/apps/client/views/pages/auction/detail.html` — CDN primero, ambos con `defer`,
`integrity` y `crossorigin` intactos.

**Validación**: PT-102.1 pasa a verde.

## PT-102.4 — El `catch` avisa

**Objetivo**: que el próximo fallo de la puja en vivo sea observable.

**Salidas**: `src/apps/client/public/js/pages/pages-auction-detail.js` — comprobación explícita de
`io` y `console.error` en el `catch`.

**Validación**: con socket.io bloqueado, la consola recoge el mensaje y la página sigue permitiendo
pujar por HTTP.

## PT-102.5 — Comprobar que la guarda caza la regresión

**Objetivo**: demostrar que PT-102.1 sirve. Se invierte el orden a propósito, se corre la guarda,
se comprueba que falla, se revierte.

**Validación**: salida del test capturada como evidencia. Sin esto, la guarda es decorativa.

## PT-102.6 — Suites y evidencia

**Validación**: `npm test` (691 + nuevos) y `bash run-all.sh` (168 + nuevos), todo verde.
Evidencia en `docs/implementation/evidence/PT-102/`.
