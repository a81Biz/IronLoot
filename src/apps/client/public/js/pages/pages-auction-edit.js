// PT-228 (H-UI-046) — **El boton se bloquea mientras la peticion esta en vuelo.**
//
// Sin esto, un doble clic dispara la accion dos veces — y en los formularios de dinero eso son dos
// movimientos. El estandar ya existia dentro del repositorio: `pages-orders-detail.js` (PT-174) lo
// hacia, y se aplicaba en UNO de doce ficheros. Lo vigila
// `src/api/test/unit/web-views/feedback-de-formularios.spec.ts`.
// PT-096 - Extraido de views/pages/auction/edit.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('editForm')?.addEventListener('submit', async (e) => {
  const _boton = e.target.querySelector('button[type="submit"]');
  if (_boton) _boton.disabled = true;
  e.preventDefault();
  const id = document.getElementById('auctionId').value;
  const msgEl = document.getElementById('editMsg');
  const res = await fetch('/api/v1/auctions/' + id, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ title: document.getElementById('title').value, description: document.getElementById('description').value, startingPrice: parseFloat(document.getElementById('startingPrice').value) }),
  });
  msgEl.className = 'alert ' + (res.ok ? 'alert-success' : 'alert-error');
  msgEl.textContent = res.ok ? 'Subasta actualizada.' : 'Error al guardar.';
  msgEl.style.display = 'block';
  if (_boton) _boton.disabled = false;
});
