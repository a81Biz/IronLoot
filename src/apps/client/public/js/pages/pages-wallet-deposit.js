// PT-096 - Extraido de views/pages/wallet/deposit.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('depositForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('depositError');
  errEl.style.display = 'none';
  try {
    const res = await fetch('/api/v1/payments/initiate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ amount: parseFloat(document.getElementById('amount').value), provider: document.getElementById('provider').value }),
    });
    const data = await res.json();
    if (res.ok && data.redirectUrl) { window.location.href = data.redirectUrl; }
    else { errEl.textContent = data.message || 'Error al iniciar pago.'; errEl.style.display = 'block'; }
  } catch { errEl.textContent = 'Error de conexión.'; errEl.style.display = 'block'; }
});
