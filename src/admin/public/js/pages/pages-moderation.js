// PT-096 - Extraido de views/pages/moderation.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

function openRejectModal(id, title) {
    document.getElementById('reject-modal-title').textContent = title;
    document.getElementById('reject-form').action = '/moderation/' + id + '/reject';
    document.getElementById('reject-modal').style.display = 'flex';
  }
  function closeRejectModal() {
    document.getElementById('reject-modal').style.display = 'none';
  }
