// PT-096 — Comportamientos de interfaz que antes vivían en atributos `onclick`/`onsubmit`.
//
// Los tres sitios declaran `script-src-attr 'none'`, que **bloquea los manejadores inline**. Los
// 24 que había estaban muertos desde que se añadió la CSP, y nadie lo notó. Comprobado en el
// navegador:
//
//     Executing inline event handler violates the following Content Security Policy
//     directive 'script-src-attr 'none''
//
// El caso grave era éste: `onsubmit="return confirm('¿Cancelar permanentemente?')"`. Si el
// manejador no corre, **nada devuelve `false`**, así que el formulario se envía igual. Las
// acciones destructivas del panel se ejecutaban SIN PREGUNTAR — su única guarda no existía.
//
// Se resuelve con delegación en vez de extraer 24 manejadores uno a uno: un solo listener en
// `document` cubre todo lo que hay y todo lo que se añada después, sin volver a tocar este
// fichero.
(function () {
  'use strict';

  // ── Confirmación antes de una acción destructiva ────────────────────────
  //
  //   <form data-confirm="¿Cancelar permanentemente?"> … </form>
  //
  // Se escucha en fase de captura para llegar antes que cualquier otro manejador del formulario.
  document.addEventListener(
    'submit',
    function (evento) {
      var formulario = evento.target;
      if (!formulario || !formulario.getAttribute) return;

      var pregunta = formulario.getAttribute('data-confirm');
      if (!pregunta) return;

      if (!window.confirm(pregunta)) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    },
    true,
  );

  // ── Confirmación puesta en el botón, no en el formulario ────────────────
  //
  //   <button type="submit" data-confirm-click="¿Banear usuario?">
  //
  // Existe porque algunas tablas tienen varios botones en el mismo formulario y la pregunta
  // depende de cuál se pulse.
  document.addEventListener(
    'click',
    function (evento) {
      var boton = evento.target.closest ? evento.target.closest('[data-confirm-click]') : null;
      if (!boton) return;

      if (!window.confirm(boton.getAttribute('data-confirm-click'))) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    },
    true,
  );

  // ── Acciones con nombre, resueltas por la propia página ──────────────────
  //
  //   <button data-accion="abrir-rechazo" data-id="…" data-titulo="…">
  //
  // La página registra qué hace cada acción en `window.accionesAdmin`. Así el marcado declara
  // QUÉ quiere y el script de la página decide CÓMO, sin volver a meter código en el HTML.
  document.addEventListener('click', function (evento) {
    var elemento = evento.target.closest ? evento.target.closest('[data-accion]') : null;
    if (!elemento) return;

    var acciones = window.accionesAdmin || {};
    var accion = acciones[elemento.getAttribute('data-accion')];
    if (typeof accion === 'function') {
      evento.preventDefault();
      accion(elemento.dataset || {});
    }
  });

  // ── Filtros que se aplican al cambiar ───────────────────────────────────
  //
  //   <select name="status" data-autosubmit> … </select>
  document.addEventListener('change', function (evento) {
    var control = evento.target;
    if (!control || !control.hasAttribute || !control.hasAttribute('data-autosubmit')) return;
    if (control.form) control.form.submit();
  });
})();
