// PT-096 - Extraido de views/pages/auth/login.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

// PT-096 - Antes `'{{ clientUrl }}'` interpolado por la plantilla, lo que obligaba al script a
// vivir dentro de ella. Ahora viaja en un atributo del <body>: el dato sigue viniendo del
// servidor, pero el codigo ya no.
const CLIENT = document.body.dataset.clientUrl || '';
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  const body = { email: e.target.email.value, password: e.target.password.value };
  try {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = CLIENT + '/dashboard';
    } else {
      errEl.textContent = data.message || 'Credenciales incorrectas.';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent = 'Error de conexión. Intenta de nuevo.';
    errEl.style.display = 'block';
  }
});
