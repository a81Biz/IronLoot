# PT-139 — Tareas atómicas

**Prerequisito**: PT-136 cerrado.
Ninguna empieza antes del ACK del Proposal Gate.
**Regla que gobierna las de frontend**: la CSP no lleva `'unsafe-inline'` en ninguna directiva. Nada
de `style=`, nada de `onclick=`. Para mostrar y ocultar, `classList` — **nunca** `style.display = ''`.

---

## PT-139.1 — RED: la guarda de bloques de plantilla

- **Objetivo**: una prueba que falle **hoy**, nombrando las cuatro plantillas.
- **Entrada**: `src/admin/views/`, `src/apps/base/views/`, `src/apps/client/views/`. Resuelve la
  cadena de `{% extends %}`.
- **Salida**: `src/api/test/unit/web-views/bloques-de-plantilla-existen-en-su-layout.spec.ts` — junto a
  `rutas-que-el-client-invoca.spec.ts`, que es su familia.
- **Validación**: **falla**, nombrando `cms.html`, `seo.html`, `refunds.html` y `reconciliation.html`
  con el bloque `title` que su layout no declara.
- **Status**: PENDING

## PT-139.2 — RED: la guarda de `data-bs-*` sin Bootstrap

- **Objetivo**: D5.
- **Entrada**: las plantillas de los tres sitios y sus `<script>` cargados.
- **Salida**: guarda que exige que ningún `data-bs-*` aparezca donde Bootstrap no esté cargado.
- **Validación**: falla, nombrando `refunds.html:8` y `:73`.
- **Status**: PENDING

## PT-139.3 — GREEN: los tres bloques muertos, retirados

- **Objetivo**: D2. `cms`, `seo` y `refunds` no necesitan `{% block title %}`.
- **Entrada**: los controladores ya pasan `title` (`cms.controller.ts:36`, `seo.controller.ts:30`,
  `refunds.controller.ts:24`).
- **Salida**: las tres plantillas sin el bloque.
- **Validación**: las tres páginas siguen mostrando **el mismo título** en la pestaña. Se comprueba en
  navegador, no por lectura: es lo único que ese bloque podía estar afectando.
- **Status**: PENDING

## PT-139.4 — GREEN: el `<script>` de conciliación, donde se carga

- **Objetivo**: D3. El defecto funcional.
- **Entrada**: `reconciliation.html:2-3`; el idioma de las otras seis plantillas que ya usan
  `{% block scripts %}`.
- **Salida**: `{% block title %}` retirado; `<script src="/js/pages/pages-reconciliation.js">` dentro
  de `{% block scripts %}`.
- **Validación**: PT-139.1 en verde. **El fichero se carga** — verificado en la pestaña de red del
  navegador, no por lectura del HTML.
- **Status**: PENDING

## PT-139.5 — El botón «Conciliar» hace algo

- **Objetivo**: la función, no el fichero.
- **Entrada**: `pages-reconciliation.js` (1749 B, extraído en PT-096) — **leerlo antes**: lleva dos
  meses sin ejecutarse y puede referirse a un DOM o a un endpoint que ya cambiaron.
- **Salida**: el botón dispara su acción y la pantalla responde.
- **Validación**: en navegador real. Si el JS está desfasado, **se corrige aquí**: recuperar la
  función es el objetivo, no cargar un fichero.
- **Status**: PENDING

## PT-139.6 — El orden de los `<script>`, comprobado

- **Objetivo**: no repetir F-34 mientras se arregla su hermano.
- **Entrada**: `admin.html:168-169` carga `ui-behaviours.js` y `admin.js`; el bloque `scripts` va en
  `:171`.
- **Salida**: verificado que `pages-reconciliation.js` no usa ningún global antes de que se defina, y
  que todos llevan `defer` si corresponde.
- **Validación**: `orden-de-scripts.spec.ts` en verde.
- **Status**: PENDING

## PT-139.7 — `refunds.html` gana su `{% block scripts %}`

- **Objetivo**: hoy no tiene dónde poner JavaScript.
- **Salida**: el bloque añadido, con `pages-refunds.js` nuevo.
- **Validación**: el fichero se carga.
- **Status**: PENDING

## PT-139.8 — GREEN: el modal, escrito a mano

- **Objetivo**: D4. Que «+ Crear reembolso» abra.
- **Entrada**: `refunds.html:8,73`; el patrón de `ui-behaviours.js`.
- **Salida**: `data-bs-*` retirados; comportamiento en `public/js/pages/pages-refunds.js` con
  `classList`. **Nada de `style.display`.**
- **Validación**: PT-139.2 en verde. El modal abre y cierra.
- **Status**: PENDING

## PT-139.9 — El modal se comporta como un modal

- **Objetivo**: lo que es fácil olvidar al no usar una librería.
- **Salida**: cierra con `Esc` · cierra al pulsar el fondo · el foco entra al abrir y **vuelve** al
  cerrar · el botón «Cancelar» cierra.
- **Validación**: los cuatro, en navegador real. **Un modal que atrapa el foco es peor que no tenerlo.**
- **Status**: PENDING

## PT-139.10 — El reembolso, de punta a punta

- **Objetivo**: abrir el modal no es crear un reembolso.
- **Salida**: crear un reembolso real desde ADMIN y verlo en la base.
- **Validación**: la fila existe. **Reembolsos toca dinero**: que el formulario envíe no es que el
  reembolso se cree.
- **Status**: PENDING

## PT-139.11 — Casos de control de las dos guardas

- **Objetivo**: RULE-14.
- **Salida**: (a) bloque inexistente en el layout → **falla**; (b) bloque existente → pasa;
  (c) cadena `extends` de dos niveles → resuelta; (d) `data-bs-*` con Bootstrap cargado → pasa;
  (e) sin Bootstrap → **falla**.
- **Validación**: los cinco.
- **Status**: PENDING

## PT-139.12 — La CSP no se ha relajado

- **Objetivo**: el riesgo silencioso de tocar frontend en este repositorio.
- **Salida**: `plantillas-sin-js-inline.spec.ts` y `estilos-fuera-de-plantillas.spec.ts` en verde.
- **Validación**: **sin `style=` ni `onclick=` nuevos**. La consola del navegador, limpia en las dos
  pantallas.
- **Status**: PENDING

## PT-139.13 — Regresión, evidencia, registro

- **Salida**: 944 · 77 · 176 · `evidence/PT-139/` con capturas antes/después de las dos pantallas, la
  petición de red del JS que antes no se cargaba, y el reembolso creado · `HISTORY.log` + `HANDOFF.md`
  · `PENDIENTES.md` § S-002-G filas 9 y 10, resueltas.
- **Validación**: STATE 5 completo. BUG → `VALIDATION_PENDING`.
- **Status**: PENDING
