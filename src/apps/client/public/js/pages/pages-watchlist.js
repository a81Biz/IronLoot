// PT-215 (R-034 · H-UI-017) — Seguir y dejar de seguir una subasta.
//
// `grep -rn "watchlist"` sobre plantillas y JS del portal devolvia SOLO el enlace del menu y la pagina
// de listado. Los endpoints existen —`POST /watchlist` y `DELETE /watchlist/:auctionId`— y no los
// invocaba nadie: **la lista no podia alimentarse ni vaciarse**, asi que mostraria su estado vacio para
// siempre, ocupando jerarquia de menu sin poder aportar nada.
//
// `docs/design/list.png §6` dibuja el boton corazon en la esquina de CADA tarjeta del catalogo. Aqui se
// pone donde el usuario ya esta mirando la subasta, que es cuando seguirla tiene sentido.

function avisarWatchlist(ok, texto) {
  var el = document.getElementById('msgWatchlist');
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

document.addEventListener('click', async function (evento) {
  var boton = evento.target.closest && evento.target.closest('.accion-watchlist');
  if (!boton) return;

  var seguir = boton.dataset.accion === 'seguir';
  boton.disabled = true;

  try {
    var res = seguir
      ? await fetch('/api/v1/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ auctionId: boton.dataset.id }),
        })
      : await fetch(`/api/v1/watchlist/${boton.dataset.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

    // El borrado responde 204 sin cuerpo: pedirle JSON reventaria.
    if (res.ok) {
      if (seguir) {
        avisarWatchlist(true, 'Guardada en tu watchlist.');
        boton.textContent = 'Ya la sigues';
        return;
      }
      avisarWatchlist(true, 'Dejaste de seguirla.');
      window.location.reload();
      return;
    }

    var datos = await res.json().catch(function () {
      return {};
    });
    avisarWatchlist(false, datos.message || 'No se pudo completar la accion.');
    boton.disabled = false;
  } catch (error) {
    console.error('[watchlist] fallo la accion:', error);
    avisarWatchlist(false, 'No se pudo contactar con el servidor.');
    boton.disabled = false;
  }
});
