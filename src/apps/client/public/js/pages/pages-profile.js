// PT-096 - Extraido de views/pages/profile.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('profileMsg');
  const res = await fetch('/api/v1/users/me', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ fullName: document.getElementById('fullName').value, phone: document.getElementById('phone').value }),
  });
  msg.className = 'alert ' + (res.ok ? 'alert-success' : 'alert-error');
  msg.textContent = res.ok ? 'Perfil actualizado.' : 'Error al guardar.';
  msg.style.display = 'block';
});
