// PT-217 (R-044 · ausencia A-17) — Notificaciones accionables.
//
// La lista distinguia leida/no leida **solo por color** —dependencia del color, WCAG 1.4.1—, no habia
// forma de marcarlas, y ninguna llevaba a la subasta u orden que la origino. Un callejon sin salida
// justo en el mecanismo que `RN-23` existe para crear: el aviso de «te han superado» es como un
// comprador vuelve a la subasta.
//
// El API expone `getUnreadCount`, `markAsRead` y `markAllAsRead` desde siempre, y no los usaba nadie.

function avisarNotif(ok, texto) {
  var el = document.getElementById('msgNotif');
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

// ── Marcar una ─────────────────────────────────────────────────────────────────────────────────
document.addEventListener('click', async function (evento) {
  var boton = evento.target.closest && evento.target.closest('.accion-notificacion');
  if (!boton) return;

  boton.disabled = true;

  try {
    var res = await fetch(`/api/v1/notifications/${boton.dataset.id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (res.ok) {
      window.location.reload();
      return;
    }

    var datos = await res.json().catch(function () {
      return {};
    });
    avisarNotif(false, datos.message || 'No se pudo marcar como leida.');
    boton.disabled = false;
  } catch (error) {
    console.error('[notificaciones] fallo al marcar como leida:', error);
    avisarNotif(false, 'No se pudo contactar con el servidor.');
    boton.disabled = false;
  }
});

// ── Marcar todas ───────────────────────────────────────────────────────────────────────────────
var botonTodas = document.getElementById('marcarTodas');

if (botonTodas) {
  botonTodas.addEventListener('click', async function () {
    botonTodas.disabled = true;

    try {
      var res = await fetch('/api/v1/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (res.ok) {
        window.location.reload();
        return;
      }

      var datos = await res.json().catch(function () {
        return {};
      });
      avisarNotif(false, datos.message || 'No se pudieron marcar.');
      botonTodas.disabled = false;
    } catch (error) {
      console.error('[notificaciones] fallo al marcar todas:', error);
      avisarNotif(false, 'No se pudo contactar con el servidor.');
      botonTodas.disabled = false;
    }
  });
}
