// PT-096 - Extraido de views/pages/auth/verify-email.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

// PT-096 - El token venia interpolado como respaldo del parametro de la URL. Ahora ese
// respaldo viaja en un data-* del <body>.
const token =
  new URLSearchParams(window.location.search).get('token') || document.body.dataset.token || '';
if (token) {
  fetch('/api/v1/auth/verify-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).then(res => {
    const el = document.getElementById('verifyStatus');
    if (res.ok) {
      el.innerHTML = '<div class="alert alert-success">¡Correo verificado! <a href="/auth/login">Iniciar sesión</a></div>';
    } else {
      el.innerHTML = '<div class="alert alert-error">Token inválido o expirado. <a href="/auth/recovery">Solicitar nuevo enlace</a></div>';
    }
  }).catch(() => {
    document.getElementById('verifyStatus').innerHTML = '<div class="alert alert-error">Error de conexión.</div>';
  });
}
