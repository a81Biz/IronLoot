// PT-096 — Comportamientos que antes vivían en atributos `on*`.
//
// BASE declara `script-src-attr 'none'`, que **bloquea los manejadores inline**. El desplegable
// de orden del catálogo llevaba `onchange="window.location.search=…"` y estaba muerto: ordenar el
// catálogo **no hacía nada**. Verificado en navegador antes de tocarlo.
//
// Se resuelve con delegación y atributos `data-*`: el marcado declara qué quiere, el script
// decide cómo. Una página nueva que quiera lo mismo sólo añade el atributo.
(function () {
  'use strict';

  // ── Navegar cambiando un parámetro de la URL ────────────────────────────
  //
  //   <select data-navega-param="sort"> … </select>
  //
  // Conserva el resto de parámetros que ya hubiera —la búsqueda, por ejemplo—, que es lo que el
  // manejador inline hacía a mano concatenando `&q=…` desde la plantilla.
  document.addEventListener('change', function (evento) {
    var control = evento.target;
    if (!control || !control.getAttribute) return;

    var parametro = control.getAttribute('data-navega-param');
    if (!parametro) return;

    var url = new URL(window.location.href);
    url.searchParams.set(parametro, control.value);
    window.location.href = url.toString();
  });
})();
