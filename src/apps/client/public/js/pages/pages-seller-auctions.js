// PT-205 (R-024 · H-UI-007) — Publicar y cancelar una subasta desde el portal.
//
// Hasta aqui NO existia ninguna accion de publicar en toda la interfaz. El vendedor completaba el
// onboarding, rellenaba el formulario, veia su subasta listada en DRAFT, y no tenia forma de ponerla
// en venta. `POST /api/v1/auctions/:id/publish` existe desde siempre y la unica que lo invocaba era
// la suite de QA, por `fetch` desde la consola del navegador (10-bootstrap.js:196). Por eso nadie lo
// noto: los flujos automatizados publicaban, las personas no podian.
//
// El JS vive aqui y no en la plantilla porque la CSP no lleva `'unsafe-inline'` en `script-src`
// (PT-096): un `onclick=` no funcionaria y el navegador no diria nada.

/** Muestra el resultado en la region viva de la pagina. */
function avisar(ok, texto) {
  var el = document.getElementById('msgSubasta');
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

var ACCIONES = {
  publicar: {
    url: function (id) { return '/api/v1/auctions/' + id + '/publish'; },
    metodo: 'POST',
    // Publicar es irreversible en la practica: a partir de ahi la subasta es visible y puede recibir
    // pujas. Se pregunta antes, como ya hace la confirmacion de recepcion (PT-174).
    confirmar: function (titulo) {
      return '¿Publicar «' + titulo + '»? A partir de ese momento sera visible y podra recibir pujas.';
    },
    exito: 'Subasta publicada.',
  },
  cancelar: {
    url: function (id) { return '/api/v1/auctions/' + id; },
    metodo: 'PATCH',
    cuerpo: { status: 'CANCELLED' },
    confirmar: function (titulo) {
      return '¿Cancelar «' + titulo + '»? Esta accion no se puede deshacer.';
    },
    exito: 'Subasta cancelada.',
  },
};

document.addEventListener('click', function (evento) {
  var boton = evento.target.closest && evento.target.closest('.accion-subasta');
  if (!boton) return;

  var accion = ACCIONES[boton.dataset.accion];
  if (!accion) return;

  if (!window.confirm(accion.confirmar(boton.dataset.titulo || 'esta subasta'))) return;

  boton.disabled = true;

  fetch(accion.url(boton.dataset.id), {
    method: accion.metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(accion.cuerpo || {}),
  })
    .then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (datos) {
        if (res.ok) {
          avisar(true, accion.exito);
          window.location.reload();
          return;
        }
        // El mensaje del servidor, no uno generico. El API distingue «no eres el dueño», «no esta en
        // borrador» y «la transicion no es valida» (RN-11, AuctionStateMachine), y cada uno se
        // corrige de una forma distinta.
        avisar(false, datos.message || 'No se pudo completar la accion.');
        boton.disabled = false;
      });
    })
    .catch(function (e) {
      // PT-180 — El aviso es para la persona; esto es para quien tenga que averiguar por que fallo.
      console.error('[seller] fallo la accion sobre la subasta:', e);
      avisar(false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    });
});
