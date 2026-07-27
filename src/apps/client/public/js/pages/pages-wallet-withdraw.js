// PT-096 - Extraido de views/pages/wallet/withdraw.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('withdrawMsg');
  const res = await fetch('/api/v1/wallet/withdraw', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ amount: parseFloat(document.getElementById('amount').value), account: document.getElementById('account').value }),
  });
  msgEl.className = 'alert ' + (res.ok ? 'alert-success' : 'alert-error');
  msgEl.textContent = res.ok ? 'Solicitud de retiro enviada.' : 'Error al procesar.';
  msgEl.style.display = 'block';
});
