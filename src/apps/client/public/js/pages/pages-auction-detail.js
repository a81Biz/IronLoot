// PT-228 (H-UI-046) — **El boton se bloquea mientras la peticion esta en vuelo.**
//
// Sin esto, un doble clic dispara la accion dos veces — y en los formularios de dinero eso son dos
// movimientos. El estandar ya existia dentro del repositorio: `pages-orders-detail.js` (PT-174) lo
// hacia, y se aplicaba en UNO de doce ficheros. Lo vigila
// `src/api/test/unit/web-views/feedback-de-formularios.spec.ts`.
// PT-096 - Extraido de views/pages/auction/detail.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

// PT-096 - Antes interpolado por la plantilla. Ahora viaja en el contenedor de la subasta.
const auctionId =
  (document.querySelector('[data-auction-id]') || {}).dataset?.auctionId ||
  document.body.dataset.auctionId ||
  '';

  // Countdown timer
  const cd = document.getElementById('countdown');
  let endsAt = new Date(cd.dataset.endsAt).getTime();
  function tick() {
    const diff = endsAt - Date.now();
    if (diff <= 0) { cd.textContent = 'Finalizada'; return; }
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    cd.textContent = h + 'h ' + m + 'm ' + s + 's';
  }
  tick();
  setInterval(tick, 1000);

  // Live bid feed via Socket.io (public read-only namespace)
  //
  // PT-102 (F-34) — Este bloque estuvo apagado y NADIE se entero. El catch de abajo decia
  // «live feed is optional» y no registraba nada, asi que un ReferenceError -io no existia
  // todavia- se volvia invisible. La pagina funcionaba; el producto, no.
  //
  // El try/catch se queda: si el CDN cae, el usuario debe poder seguir pujando por HTTP. Lo
  // que cambia es que ahora deja rastro. Un fallo que nadie puede observar no es un fallo
  // tolerado: es un fallo oculto.
  try {
    if (typeof io !== 'function') {
      throw new Error(
        'socket.io no se cargo (CDN inaccesible, o el <script> va en el orden equivocado)',
      );
    }
    // PT-098 — Relativo al propio origen: CLIENT lo reenvia a la API. Una URL relativa
    // no puede apuntar a un host que el navegador no resuelve.
    const socket = io('/auctions', { transports: ['websocket', 'polling'] });
    socket.on('connect_error', (err) => {
      console.error('Puja en vivo: no se pudo conectar —', err && err.message);
    });
    socket.on('connect', () => socket.emit('joinAuction', { auctionId }));
    socket.on('bid:new', (bid) => {
      if (bid && bid.amount != null) {
        document.getElementById('currentPrice').textContent = '$' + bid.amount;
        const li = document.createElement('li');
        li.textContent = '$' + bid.amount + ' — ' + (bid.createdAt || 'ahora');
        const noBids = document.getElementById('noBids');
        if (noBids) noBids.remove();
        document.getElementById('bidList').prepend(li);
      }
    });
    socket.on('auction:extended', (data) => {
      if (data && data.newEndsAt) endsAt = new Date(data.newEndsAt).getTime();
    });
    socket.on('auction:ended', () => {
      document.getElementById('auctionStatus').textContent = 'CLOSED';
      cd.textContent = 'Finalizada';
    });
  } catch (e) {
    // La puja en vivo es opcional para que la pagina siga sirviendo; NO es opcional que se sepa.
    console.error('Puja en vivo no disponible:', e && e.message ? e.message : e);
  }

  // Place a bid via the BFF proxy (relative path → server-side injects the Bearer token)
  document.getElementById('bidForm').addEventListener('submit', async (e) => {
    const _boton = e.target.querySelector('button[type="submit"]');
    if (_boton) _boton.disabled = true;
    e.preventDefault();
    const msg = document.getElementById('bidMsg');
    const amount = parseFloat(document.getElementById('bidAmount').value);
    try {
      const res = await fetch('/api/v1/auctions/' + auctionId + '/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      msg.className = 'alert ' + (res.ok ? 'alert-success' : 'alert-error');
      msg.textContent = res.ok ? '¡Puja realizada!' : (data.message || 'No se pudo realizar la puja.');
      if (res.ok) document.getElementById('currentPrice').textContent = '$' + amount;
    } catch (err) {
      msg.className = 'alert alert-error';
      msg.textContent = 'Error de conexión.';
    }
    msg.style.display = 'block';
  });
