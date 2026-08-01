// PT-228 (H-UI-046) — **El boton se bloquea mientras la peticion esta en vuelo.**
//
// Sin esto, un doble clic dispara la accion dos veces — y en los formularios de dinero eso son dos
// movimientos. El estandar ya existia dentro del repositorio: `pages-orders-detail.js` (PT-174) lo
// hacia, y se aplicaba en UNO de doce ficheros. Lo vigila
// `src/api/test/unit/web-views/feedback-de-formularios.spec.ts`.
// PT-096 - Extraido de views/pages/auction/create.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('createAuctionForm').addEventListener('submit', async (e) => {
  const _boton = e.target.querySelector('button[type="submit"]');
  if (_boton) _boton.disabled = true;
  e.preventDefault();
  const msgEl = document.getElementById('createMsg');
  const body = {
    title: document.getElementById('title').value,
    description: document.getElementById('description').value,
    startingPrice: parseFloat(document.getElementById('startingPrice').value),
    startsAt: new Date(document.getElementById('startsAt').value).toISOString(),
    endsAt: new Date(document.getElementById('endsAt').value).toISOString(),
  };
  const res = await fetch('/api/v1/auctions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify(body),
  });
  if (res.ok) { const d = await res.json(); window.location.href = '/seller/auctions'; }
  else { const d = await res.json(); msgEl.className = 'alert alert-error'; msgEl.textContent = d.message || 'Error al crear subasta.'; msgEl.style.display = 'block';
  if (_boton) _boton.disabled = false; }
});
