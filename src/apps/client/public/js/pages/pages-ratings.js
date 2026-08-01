// PT-225 (R-033 · H-UI-016) — Emitir una calificacion.
//
// `grep -rn "rating"` sobre plantillas y JS del portal daba CERO resultados. `RN-43` esta implementada
// en el API desde siempre —requiere envio DELIVERED, solo participante, una por autor— y **no habia
// ninguna pantalla para emitirla**: `/reputation` mostraba dos promedios que no podian alimentarse por
// ningun camino, asi que dirian «Sin calificaciones» indefinidamente.
//
// La reputacion es el mecanismo de confianza entre desconocidos en un marketplace. Sin forma de
// emitirla, la pantalla que la exhibe es decorativa.

var ratingForm = document.getElementById('ratingForm');

if (ratingForm) {
  ratingForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var boton = ratingForm.querySelector('button[type="submit"]');
    var mensaje = document.getElementById('ratingMsg');

    function avisar(ok, texto) {
      mensaje.classList.remove('oculto', 'alert-success', 'alert-error');
      mensaje.classList.add(ok ? 'alert-success' : 'alert-error');
      mensaje.textContent = texto;
    }

    // Una calificacion no se puede deshacer y solo cabe una por autor: se pregunta antes, como ya hace
    // la confirmacion de recepcion (PT-174).
    if (!window.confirm('Solo puedes calificar una vez y no se puede cambiar. ¿Enviar?')) return;

    boton.disabled = true;

    try {
      var res = await fetch('/api/v1/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: ratingForm.dataset.orden,
          score: Number(document.getElementById('score').value),
          comment: document.getElementById('comment').value.trim() || undefined,
        }),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok) {
        avisar(true, 'Gracias. Tu calificacion ya cuenta para la reputacion de la otra parte.');
        setTimeout(function () {
          window.location.reload();
        }, 1200);
        return;
      }

      // El API distingue «todavia no esta entregado», «ya calificaste» y «no eres participante». Los
      // tres significan cosas distintas para quien los recibe.
      avisar(false, datos.message || 'No se pudo enviar la calificacion.');
      boton.disabled = false;
    } catch (error) {
      console.error('[ratings] fallo al enviar la calificacion:', error);
      avisar(false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    }
  });
}
