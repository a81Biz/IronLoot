// PT-096 - Extraido de views/pages/auth/reset-password.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('resetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('resetMsg');
  if (e.target.password.value !== e.target.confirm.value) {
    msgEl.className = 'alert alert-error'; msgEl.textContent = 'Las contraseñas no coinciden.'; msgEl.style.display = 'block'; return;
  }
  try {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: document.getElementById('token').value, password: e.target.password.value }),
    });
    if (res.ok) { window.location.href = '/auth/login'; }
    else { const d = await res.json(); msgEl.className = 'alert alert-error'; msgEl.textContent = d.message || 'Error al cambiar.'; msgEl.style.display = 'block'; }
  } catch { msgEl.className = 'alert alert-error'; msgEl.textContent = 'Error de conexión.'; msgEl.style.display = 'block'; }
});
