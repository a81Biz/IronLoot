// PT-216 (R-027 · H-UI-006) — Alta y verificacion de la cuenta de cobro.
//
// `RN-63`: CLABE de 18 digitos con digito verificador valido **y nombre del titular obligatorio**.
// `RN-65` hace de tener un metodo valido la segunda puerta del retiro, y PT-092 añadio la tercera: esa
// cuenta tiene que estar VERIFICADA. Ninguna de las dos tenia pantalla.
//
// Por que la verificacion importa: el digito verificador atrapa erratas de tecleo, **no la
// titularidad**. Una CLABE ajena bien escrita pasa igual. La verificacion mueve dinero de verdad con un
// codigo que solo ve quien tiene acceso a la cuenta.

function avisarEn(id, ok, texto) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('oculto', 'alert-success', 'alert-error');
  el.classList.add(ok ? 'alert-success' : 'alert-error');
  el.textContent = texto;
}

/** El metodo cuya verificacion esta abierta ahora mismo. */
var metodoEnVerificacion = null;

// ── Alta de cuenta bancaria ────────────────────────────────────────────────────────────────────
var clabeForm = document.getElementById('clabeForm');

if (clabeForm) {
  clabeForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    var boton = clabeForm.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      var res = await fetch('/api/v1/wallet/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          holderName: document.getElementById('holderName').value.trim(),
          clabe: document.getElementById('clabe').value.trim(),
          bankName: document.getElementById('bankName').value.trim() || undefined,
          alias: document.getElementById('alias').value.trim() || undefined,
        }),
      });

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok) {
        avisarEn('msgClabe', true, 'Cuenta registrada. Ahora verificala para poder retirar.');
        setTimeout(function () {
          window.location.reload();
        }, 1200);
        return;
      }

      // El API distingue «digito verificador invalido», «esa CLABE ya esta registrada» y «falta el
      // titular». Los tres se corrigen de forma distinta.
      avisarEn('msgClabe', false, datos.message || 'No se pudo registrar la cuenta.');
      boton.disabled = false;
    } catch (error) {
      console.error('[wallet] fallo el alta de cuenta:', error);
      avisarEn('msgClabe', false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    }
  });
}

// ── Abrir la verificacion ──────────────────────────────────────────────────────────────────────
document.addEventListener('click', async function (evento) {
  var boton = evento.target.closest && evento.target.closest('.accion-verificar');
  if (!boton) return;

  boton.disabled = true;

  try {
    // La ruta se escribe ENTERA con interpolacion, no concatenando el prefijo. La guarda
    // `rutas-que-los-ssr-invocan.spec.ts` trata un literal terminado en `/` como prefijo y lo normaliza
    // a `/payment-methods/:param` —una ruta que NO existe—, asi que acusaba a codigo correcto.
    // Escribirla entera hace que vea `/payment-methods/:param/verify`, que si existe.
    var res = await fetch(`/api/v1/wallet/payment-methods/${boton.dataset.id}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    var datos = await res.json().catch(function () {
      return {};
    });

    if (!res.ok) {
      avisarEn('msgVerificar', false, datos.message || 'No se pudo iniciar la verificacion.');
      boton.disabled = false;
      return;
    }

    metodoEnVerificacion = boton.dataset.id;
    document.getElementById('instruccionesVerificacion').textContent =
      datos.instructions || 'Busca el codigo en el concepto del movimiento y confirmalo aqui.';
    // `classList`, nunca `style.display = ''`: vaciarlo devuelve el elemento a lo que diga el CSS, que
    // aqui es «oculto» (la leccion de PT-105).
    document.getElementById('cajaConfirmar').classList.remove('oculto');
    avisarEn('msgVerificar', true, 'Verificacion abierta. Te enviamos un importe pequeño con un codigo.');
  } catch (error) {
    console.error('[wallet] fallo al abrir la verificacion:', error);
    avisarEn('msgVerificar', false, 'No se pudo contactar con el servidor.');
    boton.disabled = false;
  }
});

// ── Confirmar el codigo ────────────────────────────────────────────────────────────────────────
var confirmarForm = document.getElementById('confirmarForm');

if (confirmarForm) {
  confirmarForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!metodoEnVerificacion) {
      avisarEn('msgVerificar', false, 'Abre primero la verificacion de una cuenta.');
      return;
    }

    var boton = confirmarForm.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      var res = await fetch(
        `/api/v1/wallet/payment-methods/${metodoEnVerificacion}/verify/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: document.getElementById('token').value.trim() }),
        },
      );

      var datos = await res.json().catch(function () {
        return {};
      });

      if (res.ok && datos.verified) {
        avisarEn('msgVerificar', true, 'Cuenta verificada. Ya puedes solicitar un retiro.');
        setTimeout(function () {
          window.location.reload();
        }, 1200);
        return;
      }

      // El servicio limita a cinco intentos y su mensaje dice cuantos quedan: esa cifra importa.
      avisarEn('msgVerificar', false, datos.message || 'El codigo no coincide.');
      boton.disabled = false;
    } catch (error) {
      console.error('[wallet] fallo al confirmar el codigo:', error);
      avisarEn('msgVerificar', false, 'No se pudo contactar con el servidor.');
      boton.disabled = false;
    }
  });
}
