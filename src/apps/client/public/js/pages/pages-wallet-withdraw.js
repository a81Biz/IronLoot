// PT-216 (R-027 · H-UI-005) — La solicitud de retiro, contra el endpoint vigente.
//
// La version anterior enviaba `{amount, account}` a `POST /api/v1/wallet/withdraw`, que es
// compatibilidad deprecada y espera `referenceId`. Con el ValidationPipe global corriendo con
// `whitelist: true, forbidNonWhitelisted: true`, `account` era propiedad no permitida y `referenceId`
// faltaba: **400 garantizado**. El retiro no podia tener exito nunca.
//
// Y su unica respuesta era `res.ok ? ... : 'Error al procesar.'`, que descartaba los cuatro
// diagnosticos accionables de RN-65 —KYC, metodo, verificacion, saldo/limite—: el usuario no podia
// saber que corregir. Tampoco habia `try/catch`: un fallo de red dejaba el formulario mudo.

function avisar(ok, texto) {
  var el = document.getElementById('withdrawMsg');
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

var formulario = document.getElementById('withdrawForm');

if (formulario) {
  formulario.addEventListener('submit', async function (e) {
    e.preventDefault();

    var boton = formulario.querySelector('button[type="submit"]');
    var metodo = document.getElementById('paymentMethodId');

    if (!metodo || !metodo.value) {
      avisar(false, 'Elige la cuenta de destino. Si no aparece ninguna, registra y verifica una primero.');
      return;
    }

    // Bloqueo antes de la llamada: mueve dinero, y un doble clic solicitaria dos veces.
    boton.disabled = true;
    var textoOriginal = boton.textContent;
    boton.textContent = 'Enviando...';

    try {
      var res = await fetch('/api/v1/wallet/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: Number(document.getElementById('amount').value),
          paymentMethodId: String(metodo.value),
        }),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok) {
        avisar(true, 'Solicitud enviada. El importe queda reservado de tu disponible hasta que se apruebe.');
        setTimeout(function () {
          window.location.reload();
        }, 1200);
        return;
      }

      // **El mensaje del servidor.** RN-65 distingue cuatro puertas con cuatro textos distintos, y cada
      // una se corrige de una forma: enviar documentos, registrar cuenta, verificarla, o bajar el monto.
      avisar(false, datos.message || 'No se pudo registrar la solicitud.');
      boton.disabled = false;
      boton.textContent = textoOriginal;
    } catch (error) {
      // PT-180 — El aviso es para la persona; esto para quien tenga que averiguar por que fallo.
      console.error('[wallet] fallo la solicitud de retiro:', error);
      avisar(false, 'No se pudo contactar con el servidor. Tu saldo no se ha movido.');
      boton.disabled = false;
      boton.textContent = textoOriginal;
    }
  });
}
