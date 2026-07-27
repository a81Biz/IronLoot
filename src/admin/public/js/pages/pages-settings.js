// PT-096 - Extraido de views/pages/settings.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

// Toggle cloud storage fields
  document.querySelectorAll('input[name="STORAGE_PROVIDER"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const fields = document.getElementById('storage-cloud-fields');
      if (fields) fields.style.display = radio.value === 'LOCAL' ? 'none' : '';
    });
  });

  if (new URLSearchParams(window.location.search).get('saved') === '1') {
    history.replaceState({}, '', '/settings');
  }
