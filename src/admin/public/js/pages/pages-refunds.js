/**
 * PT-139 — El modal de «Crear reembolso», con el idioma que ADMIN ya tiene.
 *
 * La plantilla usaba `data-bs-toggle` / `data-bs-target` / `data-bs-dismiss`, y **ADMIN no tiene
 * Bootstrap en ninguna parte**: su layout carga `ui-behaviours.js` y `admin.js`, y ninguno maneja
 * modales. El botón no abría nada — sin error en consola y sin fallo de suite, porque los
 * `data-bs-*` son atributos inertes para un navegador que no tiene quien los lea.
 *
 * ## Por qué no se trae Bootstrap
 *
 * Una dependencia nueva, CSS que revisar y riesgo con una CSP que no lleva `'unsafe-inline'` en
 * ninguna directiva, para un único modal. Esto son cincuenta líneas.
 *
 * ## Y por qué esta forma y no otra
 *
 * ADMIN **ya tiene** su convención de modal: `.modal-backdrop.oculto` envolviendo `.modal`, con el
 * CSS ya escrito (`admin.css:572-573`). `moderation.html` la usa. Inventar una tercera estructura
 * habría sido dejar dos formas de hacer lo mismo en el mismo panel.
 *
 * Se muestra y se oculta con **`classList`**, nunca con `style.display`. El comentario de
 * `admin.css:597-601` lo explica: `style.display = ''` devuelve el elemento a lo que diga el CSS, y
 * el CSS ahora dice `display: none` — las pestañas de ADMIN se pasaron a `classList` justamente por
 * eso.
 *
 * ## Lo que un modal tiene que hacer y es fácil olvidar
 *
 * Cerrar con `Esc`, cerrar al pulsar el fondo, llevarse el foco al abrir y **devolverlo al cerrar**.
 * Un modal que atrapa el foco es peor que no tener modal.
 */
(function () {
  'use strict';

  /** Quién abrió el modal, para devolverle el foco al cerrar. */
  var abridor = null;

  function abrir(modal, origen) {
    abridor = origen || null;
    modal.classList.remove('oculto');

    var foco = modal.querySelector('input, select, textarea, button');
    if (foco) foco.focus();
  }

  function cerrar(modal) {
    modal.classList.add('oculto');

    // El foco vuelve a quien lo abrió. Sin esto, quien navega con teclado queda al principio de la
    // página y tiene que rehacer todo el recorrido.
    if (abridor) {
      abridor.focus();
      abridor = null;
    }
  }

  function modalAbierto() {
    return document.querySelector('.modal-backdrop:not(.oculto)');
  }

  document.addEventListener('click', function (e) {
    var disparador = e.target.closest('[data-abrir-modal]');
    if (disparador) {
      var modal = document.getElementById(disparador.getAttribute('data-abrir-modal'));
      if (modal) abrir(modal, disparador);
      return;
    }

    if (e.target.closest('[data-cerrar-modal]')) {
      var porBoton = modalAbierto();
      if (porBoton) cerrar(porBoton);
      return;
    }

    // Clic en el fondo: sólo cuenta si el objetivo ES el contenedor, no algo de dentro. Sin esa
    // comprobación, pulsar dentro del formulario cerraría el modal y se perdería lo escrito.
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
      cerrar(e.target);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var abierto = modalAbierto();
    if (abierto) cerrar(abierto);
  });
})();
