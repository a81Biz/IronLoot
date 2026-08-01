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
  // PT-227 (H-UI-022) — El codigo de 2FA viaja solo si se escribio: mandar `twoFactorCode: ''` a una
  // cuenta sin 2FA seria una propiedad vacia que el DTO no espera.
  const codigo = document.getElementById('twoFactorCode');
  const body = {
    email: e.target.email.value,
    password: e.target.password.value,
    ...(codigo && codigo.value.trim() ? { twoFactorCode: codigo.value.trim() } : {}),
  };
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
    } else if (/2FA|two.?factor/i.test(String(data.message || ''))) {
      // **La rama que faltaba.** El API responde «2FA code required» y antes eso se pintaba como un
      // error terminal: el usuario leia un mensaje en ingles tecnico y no tenia ninguna accion posible.
      document.getElementById('grupo2fa').classList.remove('oculto');
      document.getElementById('twoFactorCode').focus();
      errEl.textContent = codigo && codigo.value.trim()
        ? 'Ese codigo no es valido. Revisa tu app y vuelve a intentarlo.'
        : 'Tu cuenta tiene verificacion en dos pasos. Escribe el codigo de tu app.';
      errEl.style.display = 'block';
    } else {
      errEl.textContent = data.message || 'Credenciales incorrectas.';
      errEl.style.display = 'block';
    }
  } catch {
    errEl.textContent = 'Error de conexión. Intenta de nuevo.';
    errEl.style.display = 'block';
  }
});
