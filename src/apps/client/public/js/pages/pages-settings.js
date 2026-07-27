// PT-096 - Extraido de views/pages/settings.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await fetch('/api/v1/users/me/settings', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ emailOnBid: document.getElementById('emailBids').checked, emailOnWin: document.getElementById('emailWon').checked }),
  });
  alert('Preferencias guardadas.');
});
