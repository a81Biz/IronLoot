// PT-228 (H-UI-046) — **El boton se bloquea mientras la peticion esta en vuelo.**
//
// Sin esto, un doble clic dispara la accion dos veces — y en los formularios de dinero eso son dos
// movimientos. El estandar ya existia dentro del repositorio: `pages-orders-detail.js` (PT-174) lo
// hacia, y se aplicaba en UNO de doce ficheros. Lo vigila
// `src/api/test/unit/web-views/feedback-de-formularios.spec.ts`.
// PT-096 - Extraido de views/pages/auth/recovery.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('recoveryForm').addEventListener('submit', async (e) => {
  const _boton = e.target.querySelector('button[type="submit"]');
  if (_boton) _boton.disabled = true;
  e.preventDefault();
  const msgEl = document.getElementById('recoveryMsg');
  try {
    await fetch('/api/v1/auth/forgot-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e.target.email.value }),
    });
    msgEl.className = 'alert alert-success';
    msgEl.textContent = 'Si el correo existe, recibirás las instrucciones en unos minutos.';
    msgEl.style.display = 'block';
  if (_boton) _boton.disabled = false;
  } catch { msgEl.className = 'alert alert-error'; msgEl.textContent = 'Error de conexión.'; msgEl.style.display = 'block';
  if (_boton) _boton.disabled = false; }
});
