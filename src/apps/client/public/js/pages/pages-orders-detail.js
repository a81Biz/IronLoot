// PT-174 — El vendedor declara el envío; el comprador confirma que lo recibió.
//
// Hasta PT-174 esta página sólo mostraba el envío, y **no había forma de declararlo ni de confirmarlo**
// desde ningún sitio: el único que podía mover el estado era el vendedor, por API, incluido `DELIVERED`.
// Con eso liberaba su propio holdback.
//
// El JS vive aquí y no en la plantilla porque la CSP no lleva `'unsafe-inline'` en `script-src`
// (PT-096): un `onclick=` **no funcionaría y el navegador no diría nada**. Y para mostrar u ocultar se
// usa `classList`, nunca `style.display = ''`, porque vaciarlo devuelve el elemento a lo que diga el CSS
// — que aquí es «oculto».

/** Muestra un mensaje en el hueco que le corresponde. */
function avisar(id, ok, texto) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

/** El id del pedido, leído de la ruta `/orders/:id`. */
function idDelPedido() {
  return window.location.pathname.split('/').filter(Boolean).pop();
}

// ── El vendedor declara el envío ────────────────────────────────────────────────────────────────
//
// Son dos llamadas y no una a propósito: `POST /shipments` crea el envío en `PENDING` —el estado que
// significa «existe pero no ha salido»— y el `PATCH` lo pasa a `SHIPPED`. Unirlas en el API habría
// borrado esa distinción, y `PENDING` es justo el estado que permite corregir la guía antes de que el
// comprador vea nada.
const formEnvio = document.getElementById('formEnvio');

if (formEnvio) {
  formEnvio.addEventListener('submit', async (e) => {
    e.preventDefault();

    const boton = formEnvio.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      const creado = await fetch('/api/v1/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: idDelPedido(),
          provider: document.getElementById('provider').value,
          trackingNumber: document.getElementById('trackingNumber').value,
        }),
      });

      if (!creado.ok) {
        avisar('msgEnvio', false, 'No se pudo registrar el envío.');
        boton.disabled = false;
        return;
      }

      const envio = await creado.json();

      const marcado = await fetch(`/api/v1/shipments/${envio.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'SHIPPED' }),
      });

      if (!marcado.ok) {
        // El envío quedó creado pero sin declarar la salida. Se dice, en vez de dejar la página
        // aparentando éxito: el vendedor tiene que saber que le falta un paso.
        avisar('msgEnvio', false, 'El envío se registró, pero no se pudo marcar como enviado.');
        boton.disabled = false;
        return;
      }

      avisar('msgEnvio', true, 'Envío declarado. El comprador ya puede confirmar la recepción.');
      window.location.reload();
    } catch (e) {
      // PT-180 — El aviso es para la persona; esto es para quien tenga que averiguar por que fallo.
      // Sin registrar el error, «no se pudo contactar» no distingue un timeout de un 500 ni de un
      // bloqueo de la CSP — tres causas con tres soluciones distintas. Lo caza el checkpoint D3.
      console.error('[orders] fallo al declarar el envio:', e);
      avisar('msgEnvio', false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    }
  });
}

// ── El comprador confirma la recepción ─────────────────────────────────────────────────────────
const btnRecepcion = document.getElementById('btnConfirmarRecepcion');

if (btnRecepcion) {
  btnRecepcion.addEventListener('click', async () => {
    // Tiene consecuencia económica: arranca el plazo tras el cual el vendedor cobra. Se pregunta antes.
    if (!window.confirm('¿Confirmas que ya recibiste el artículo? Esto inicia el pago al vendedor.')) {
      return;
    }

    btnRecepcion.disabled = true;

    try {
      const res = await fetch(`/api/v1/shipments/${btnRecepcion.dataset.envio}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'DELIVERED' }),
      });

      if (!res.ok) {
        avisar('msgRecepcion', false, 'No se pudo confirmar la recepción.');
        btnRecepcion.disabled = false;
        return;
      }

      avisar('msgRecepcion', true, 'Recepción confirmada. Gracias.');
      window.location.reload();
    } catch (e) {
      // PT-180 — Igual que arriba, y aqui importa mas: de esta confirmacion cuelga el pago al vendedor.
      console.error('[orders] fallo al confirmar la recepcion:', e);
      avisar('msgRecepcion', false, 'No se pudo contactar con el servidor.');
      btnRecepcion.disabled = false;
    }
  });
}
