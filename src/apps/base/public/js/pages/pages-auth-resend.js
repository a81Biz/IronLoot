// PT-214 (R-038 · H-UI-025, H-UI-064) — Reenvio del correo de verificacion.
//
// La pantalla enunciaba el modo de fallo —«¿No lo ves? Revisa la carpeta de spam»— y ofrecia UN solo
// boton: volver al login. Con RN-03/BC-06 haciendo la verificacion obligatoria, una cuenta cuyo correo
// no llegara quedaba inutilizable sin remedio.
//
// `FAQ-y-Mensajes §2` prescribe exactamente esta accion ante USER_NOT_VERIFIED, y `auth.service.ts`
// justificaba capturar el fallo de envio del registro diciendo que «el usuario tiene la via de
// reenvio». Esa via NO EXISTIA: la crea este mismo PT en el API.

document.getElementById('resendForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  var boton = e.target.querySelector('button[type="submit"]');
  var mensaje = document.getElementById('resendMsg');
  var textoOriginal = boton.textContent;

  boton.disabled = true;
  boton.textContent = 'Enviando...';

  function avisar(ok, texto) {
    mensaje.classList.remove('oculto', 'alert-success', 'alert-error');
    mensaje.classList.add(ok ? 'alert-success' : 'alert-error');
    mensaje.textContent = texto;
  }

  try {
    var res = await fetch('/api/v1/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: e.target.email.value }),
    });

    var datos = await res.json().catch(function () {
      return {};
    });

    if (res.ok) {
      // La respuesta del API es opaca A PROPOSITO —no dice si la cuenta existe— para no convertir esto
      // en un oraculo de enumeracion de correos. El texto que se muestra es el suyo, no uno inventado
      // aqui: si algun dia cambia esa politica, cambia en un sitio.
      avisar(true, datos.message || 'Si esa cuenta existe y no esta verificada, te hemos enviado un enlace nuevo.');
      boton.textContent = textoOriginal;
      return;
    }

    // 429 incluido: el limite es 3/min y decirlo es mas util que «error».
    avisar(false, datos.message || 'No se pudo reenviar. Intentalo de nuevo en un minuto.');
    boton.disabled = false;
    boton.textContent = textoOriginal;
  } catch (error) {
    console.error('[auth] fallo el reenvio de verificacion:', error);
    avisar(false, 'No se pudo contactar con el servidor.');
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
});
