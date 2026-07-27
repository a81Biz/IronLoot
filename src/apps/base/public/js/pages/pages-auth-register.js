// PT-096 - Extraido de views/pages/auth/register.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('registerError');
  errEl.style.display = 'none';
  const body = { username: e.target.username.value, email: e.target.email.value, password: e.target.password.value };
  try {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) { window.location.href = '/auth/verify-email-pending'; }
    else { errEl.textContent = data.message || 'Error al registrar.'; errEl.style.display = 'block'; }
  } catch { errEl.textContent = 'Error de conexión.'; errEl.style.display = 'block'; }
});
