// PT-228 (H-UI-046) — **El boton se bloquea mientras la peticion esta en vuelo.**
//
// Sin esto, un doble clic dispara la accion dos veces — y en los formularios de dinero eso son dos
// movimientos. El estandar ya existia dentro del repositorio: `pages-orders-detail.js` (PT-174) lo
// hacia, y se aplicaba en UNO de doce ficheros. Lo vigila
// `src/api/test/unit/web-views/feedback-de-formularios.spec.ts`.
// PT-096 - Extraido de views/pages/seller/onboarding.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.getElementById('onboardingForm').addEventListener('submit', async (e) => {
  const _boton = e.target.querySelector('button[type="submit"]');
  if (_boton) _boton.disabled = true;
  e.preventDefault();
  const msgEl = document.getElementById('onboardingMsg');
  const show = (ok, txt) => { msgEl.className = 'alert ' + (ok ? 'alert-success' : 'alert-error'); msgEl.textContent = txt; msgEl.style.display = 'block';
  if (_boton) _boton.disabled = false; };
  try {
    // 1) Guardar datos de perfil (nombre legal, dirección, teléfono sin espacios)
    const profileRes = await fetch('/api/v1/users/me', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        // displayName es top-level; los demás datos van anidados en `profile`.
        // El API exige displayName + address + city + country para habilitar vendedor.
        displayName: document.getElementById('displayName').value.slice(0, 50),
        profile: {
          legalName: document.getElementById('legalName').value,
          address: document.getElementById('address').value,
          city: document.getElementById('city').value,
          country: document.getElementById('country').value,
          phone: document.getElementById('phone').value.replace(/\s+/g, ''),
        },
      }),
    });
    if (!profileRes.ok) {
      const d = await profileRes.json().catch(() => ({}));
      // `show()` reactiva el boton en su propio cuerpo, asi que aqui no hace falta nada mas: una
      // linea despues del `return` seria codigo muerto.
      return show(false, d.message || 'Error al guardar tus datos. Verifica el formato del teléfono.');
    }
    // 2) Activar cuenta de vendedor (aceptación de términos)
    const res = await fetch('/api/v1/users/me/enable-seller', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ acceptTerms: document.getElementById('acceptTerms').checked }),
    });
    if (res.ok) { show(true, '¡Cuenta de vendedor activada!'); setTimeout(() => { window.location.href = '/seller/auctions'; }, 1200); }
    else { const d = await res.json().catch(() => ({})); show(false, d.message || 'Error al activar. Verifica tus datos.'); }
  } catch { show(false, 'Error de conexión.'); }
});
