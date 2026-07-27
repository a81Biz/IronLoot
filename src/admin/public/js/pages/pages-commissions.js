// PT-096 - Extraido de views/pages/commissions.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      // PT-105 (TD-014) — classList, no style.display.
      //
      // Antes esto vaciaba el estilo inline (`= ''`) para "volver a lo que diga el CSS". Mientras
      // el CSS no decia nada, eso mostraba el panel. Al sacar los `style=` de las plantillas, lo
      // que oculta es la clase `.oculto` — y "lo que diga el CSS" paso a ser *oculto*: la pestana
      // dejaba de abrirse. Los otros 30 usos de style.display escriben un valor explicito y no
      // tienen este problema; estos cuatro si.
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('oculto'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('oculto');
    });
  });
