/**
 * PT-096 — Extraído de `views/pages/moderation.html`.
 * PT-160 — Y ahora **conectado**, que es lo que le faltaba desde entonces.
 *
 * ## El modal de rechazo no funcionaba
 *
 * Este fichero definía `openRejectModal` y `closeRejectModal` como funciones sueltas, y la plantilla
 * las invoca con `data-accion="abrir-rechazo"` / `data-accion="cerrar-rechazo"`. El puente entre las
 * dos cosas es `window.accionesAdmin`, que `ui-behaviours.js` consulta — y **nadie lo rellenaba**.
 *
 * Resultado: el botón «Rechazar» de moderación **no abría nada**. Sin error en consola, porque
 * `ui-behaviours.js` comprueba `typeof accion === 'function'` antes de llamar y simplemente no hace
 * nada si no la encuentra. Un control muerto, silencioso, en el panel que aprueba y rechaza subastas.
 *
 * Es el mismo hallazgo que PT-139 encontró dos veces en ADMIN, y la causa de fondo también: PT-096
 * sacó el JS de la plantilla **tal cual**, y «tal cual» perdió los `onclick=` que lo conectaban. Se
 * movió bien el código; se perdió el cableado.
 *
 * ## `classList`, nunca `style.display`
 *
 * Abría con `style.display = 'flex'` y cerraba con `'none'`, mientras la plantilla ya declara
 * `class="modal-backdrop oculto"` y el CSS de ADMIN ya sabe ocultarlo. Dos mecanismos para lo mismo,
 * con el inline ganando siempre.
 *
 * RULE-19 avisa de esto: `style.display = ''` devuelve el elemento **a lo que diga el CSS**, y el CSS
 * de ADMIN ahora puede decir `display: none`. Las pestañas se pasaron a `classList` por eso mismo, y
 * `pages-refunds.js` (PT-139) ya nació con la forma correcta.
 */
(function () {
  'use strict';

  /** Quién abrió el modal, para devolverle el foco al cerrar. */
  var abridor = null;

  function modal() {
    return document.getElementById('reject-modal');
  }

  function abrir(datos) {
    var m = modal();
    if (!m) return;

    abridor = document.activeElement;
    document.getElementById('reject-modal-title').textContent = datos.titulo || '';
    document.getElementById('reject-form').action = '/moderation/' + datos.id + '/reject';
    m.classList.remove('oculto');

    var foco = m.querySelector('select, input, textarea, button');
    if (foco) foco.focus();
  }

  function cerrar() {
    var m = modal();
    if (!m) return;

    m.classList.add('oculto');

    // El foco vuelve a quien lo abrió. Sin esto, quien navega con teclado queda al principio de la
    // página y tiene que rehacer todo el recorrido.
    if (abridor && abridor.focus) {
      abridor.focus();
      abridor = null;
    }
  }

  // El puente que faltaba. `ui-behaviours.js` busca aquí la función de cada `data-accion`: el
  // marcado declara QUÉ quiere y la página decide CÓMO, sin volver a meter código en el HTML — que
  // es justo lo que la CSP sin `'unsafe-inline'` impide.
  window.accionesAdmin = window.accionesAdmin || {};
  window.accionesAdmin['abrir-rechazo'] = abrir;
  window.accionesAdmin['cerrar-rechazo'] = cerrar;

  // Cerrar con Esc y pulsando el fondo. Un modal que sólo se cierra con un botón es peor modal, y
  // uno que atrapa el foco es peor que no tener modal.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var m = modal();
    if (m && !m.classList.contains('oculto')) cerrar();
  });

  document.addEventListener('click', function (e) {
    // Sólo si el objetivo ES el fondo, no algo de dentro: sin esa comprobación, pulsar dentro del
    // formulario cerraría el modal y se perdería lo escrito.
    if (e.target.id === 'reject-modal') cerrar();
  });
})();
