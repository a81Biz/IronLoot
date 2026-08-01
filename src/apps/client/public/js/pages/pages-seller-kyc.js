// PT-216 (R-027 · H-UI-006) — Envio de documentos KYC.
//
// `RN-62`: el vendedor envia documentos por `POST /api/v1/kyc`, y `enable-seller` exige APPROVED. No
// habia ninguna pantalla, asi que la primera puerta del retiro era infranqueable — y el onboarding
// celebraba «¡Cuenta de vendedor activada!» sin haber pedido un solo documento.

function avisarKyc(ok, texto) {
  var el = document.getElementById('msgKyc');
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

var kycForm = document.getElementById('kycForm');

if (kycForm) {
  kycForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var boton = kycForm.querySelector('button[type="submit"]');
    boton.disabled = true;
    var textoOriginal = boton.textContent;
    boton.textContent = 'Enviando...';

    // El API acepta un `Record<string,string>` y lo guarda en `docsJson`. Se envian solo las claves con
    // valor: una clave vacia registraria un documento inexistente, y el revisor lo veria como enviado.
    var documentos = {};
    ['identityFront', 'identityBack', 'proofOfAddress', 'rfc'].forEach(function (clave) {
      var campo = document.getElementById(clave);
      if (campo && campo.value.trim()) documentos[clave] = campo.value.trim();
    });

    try {
      var res = await fetch('/api/v1/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(documentos),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok) {
        avisarKyc(true, 'Documentos enviados. El equipo los revisara; el estado se actualiza en esta misma pagina.');
        setTimeout(function () {
          window.location.reload();
        }, 1500);
        return;
      }

      avisarKyc(false, datos.message || 'No se pudieron enviar los documentos.');
      boton.disabled = false;
      boton.textContent = textoOriginal;
    } catch (error) {
      console.error('[kyc] fallo el envio de documentos:', error);
      avisarKyc(false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
}
