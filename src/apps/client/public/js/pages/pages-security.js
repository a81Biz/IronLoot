// PT-227 (R-037 · H-UI-022, H-UI-023) — Contraseña y verificacion en dos pasos.
//
// No habia cambio de contraseña autenticado en todo el portal, y el `Manual de Usuario §1` instruye
// explicitamente «si no fuiste tu, cambia la contraseña» tras detectar reuso de token: mandaba a una
// accion que la interfaz no ofrecia.
//
// Y no habia forma de activar 2FA, aunque `PRD RF-02` lo declara operable. Quien lo activara por otra
// via quedaba bloqueado de forma permanente, porque el login no tenia donde escribir el codigo.

function avisarEn(id, ok, texto) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

// ── Cambio de contraseña ───────────────────────────────────────────────────────────────────────
var passwordForm = document.getElementById('passwordForm');

if (passwordForm) {
  passwordForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var nueva = document.getElementById('newPassword').value;
    var repetida = document.getElementById('confirmPassword').value;

    // Se comprueba ANTES de llamar: mandar dos contraseñas distintas al servidor para que rechace una
    // de ellas gastaria un intento y no diria nada mas util que esto.
    if (nueva !== repetida) {
      avisarEn('msgPassword', false, 'Las dos contraseñas nuevas no coinciden.');
      return;
    }

    var boton = passwordForm.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      var res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: document.getElementById('currentPassword').value,
          newPassword: nueva,
        }),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok) {
        avisarEn('msgPassword', true, 'Contraseña cambiada.');
        passwordForm.reset();
        boton.disabled = false;
        return;
      }

      avisarEn('msgPassword', false, datos.message || 'No se pudo cambiar la contraseña.');
      boton.disabled = false;
    } catch (error) {
      console.error('[seguridad] fallo el cambio de contraseña:', error);
      avisarEn('msgPassword', false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    }
  });
}

// ── Activar 2FA: primero el QR, despues el codigo ──────────────────────────────────────────────
var empezar = document.getElementById('empezar2fa');

if (empezar) {
  empezar.addEventListener('click', async function () {
    empezar.disabled = true;

    try {
      var res = await fetch('/api/v1/auth/2fa/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (!res.ok || !datos.qrCodeUrl) {
        avisarEn('msg2fa', false, datos.message || 'No se pudo generar el codigo.');
        empezar.disabled = false;
        return;
      }

      document.getElementById('qr2fa').src = datos.qrCodeUrl;
      // `classList`, nunca `style.display = ''`: vaciarlo devuelve el elemento a lo que diga el CSS,
      // que aqui es «oculto» (PT-105).
      document.getElementById('caja2fa').classList.remove('oculto');
      document.getElementById('tokenEnable').focus();
    } catch (error) {
      console.error('[seguridad] fallo al generar el secreto 2FA:', error);
      avisarEn('msg2fa', false, 'No se pudo contactar con el servidor.');
      empezar.disabled = false;
    }
  });
}

var enable2faForm = document.getElementById('enable2faForm');

if (enable2faForm) {
  enable2faForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var boton = enable2faForm.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      var res = await fetch('/api/v1/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: document.getElementById('tokenEnable').value.trim() }),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok) {
        avisarEn('msg2fa', true, 'Activada. A partir de ahora te pediremos el codigo al entrar.');
        setTimeout(function () {
          window.location.reload();
        }, 1500);
        return;
      }

      avisarEn('msg2fa', false, datos.message || 'Ese codigo no es valido.');
      boton.disabled = false;
    } catch (error) {
      console.error('[seguridad] fallo al activar 2FA:', error);
      avisarEn('msg2fa', false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    }
  });
}

// ── Desactivar 2FA ─────────────────────────────────────────────────────────────────────────────
var disable2faForm = document.getElementById('disable2faForm');

if (disable2faForm) {
  disable2faForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!window.confirm('Sin verificacion en dos pasos, tu contraseña sera lo unico que proteja tu cuenta. ¿Desactivar?')) {
      return;
    }

    var boton = disable2faForm.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      var res = await fetch('/api/v1/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: document.getElementById('tokenDisable').value.trim() }),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok) {
        avisarEn('msg2fa', true, 'Desactivada.');
        setTimeout(function () {
          window.location.reload();
        }, 1200);
        return;
      }

      avisarEn('msg2fa', false, datos.message || 'Ese codigo no es valido.');
      boton.disabled = false;
    } catch (error) {
      console.error('[seguridad] fallo al desactivar 2FA:', error);
      avisarEn('msg2fa', false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    }
  });
}
