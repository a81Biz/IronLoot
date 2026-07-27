// PT-088 — Un depósito pendiente se resuelve solo, por la vía garantizada.
//
// El usuario no tiene que recargar ni volver a pagar: esta página consulta el estado hasta que
// la pasarela responde y entonces se refresca sola. Sin esto, quien pagó en efectivo se queda
// mirando «en proceso» sin señal de que algo esté ocurriendo, y el riesgo real es que pague otra
// vez.
//
// El intervalo crece: los pagos con tarjeta se resuelven en segundos, los de efectivo tardan
// horas, e insistir cada dos segundos durante horas no ayuda a nadie.
(function () {
  'use strict';

  var ref = new URLSearchParams(window.location.search).get('ref');
  if (!ref) return;

  var ESPERAS_MS = [3000, 3000, 5000, 5000, 10000, 15000, 30000, 60000];
  var intento = 0;

  function siguiente() {
    return ESPERAS_MS[Math.min(intento, ESPERAS_MS.length - 1)];
  }

  function comprobar() {
    fetch('/api/v1/payments/status/' + encodeURIComponent(ref), {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (estado) {
        // Resuelto en cualquier sentido: que lo vea con el texto definitivo.
        if (estado && !estado.pending) {
          window.location.reload();
          return;
        }
        intento += 1;
        window.setTimeout(comprobar, siguiente());
      })
      .catch(function () {
        // Un fallo de red no puede dejar la página muerta: se reintenta más despacio.
        intento += 1;
        window.setTimeout(comprobar, siguiente());
      });
  }

  window.setTimeout(comprobar, siguiente());
})();
