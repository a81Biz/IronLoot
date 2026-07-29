// PT-096 - Extraido de views/pages/reconciliation.html
//
// Vivia dentro de la plantilla, lo que obligaba a `script-src 'unsafe-inline'` en la CSP de todo
// el sitio. Fuera, la directiva puede retirarse, y ademas el fichero se cachea, se enlaza en los
// errores del navegador y pasa por el linter.
//
// Se movio TAL CUAL: mezclar la mudanza con cambios de comportamiento haria el resultado
// irrevisable — misma razon por la que PT-091 separo formato de fondo en dos commits.

const API = '/api/v1/admin';
async function loadReconciliation() {
  const provider = document.getElementById('rcProvider').value;
  const from = document.getElementById('rcFrom').value;
  const to = document.getElementById('rcTo').value;
  if (!from || !to) { alert('Selecciona fechas'); return; }
  const data = await (await fetch(`${API}/reconciliation?provider=${provider}&dateFrom=${from}&dateTo=${to}`)).json();
  document.getElementById('rcResults').style.display = 'block';
  document.getElementById('internalCount').textContent = data.internalCount;
  document.getElementById('providerCount').textContent = data.providerOnly?.length ?? 0;
  document.getElementById('providerNote').textContent = data.note || '';
  document.getElementById('internalTable').innerHTML = (data.internalOnly || []).map(p => `<tr><td><code>${p.externalId || '—'}</code></td><td>MXN ${p.amount}</td></tr>`).join('');
  const csvBtn = document.getElementById('csvExportBtn');
  csvBtn.href = `${API}/reconciliation/export?provider=${provider}&dateFrom=${from}&dateTo=${to}`;
  csvBtn.style.display = 'inline-block';
}
// PT-160 — El botón «Conciliar» tampoco estaba conectado.
//
// La plantilla lo declara con `data-accion="conciliar"`, y `ui-behaviours.js` busca esa acción en
// `window.accionesAdmin`. Nadie la registraba, así que **pulsar «Conciliar» no hacía nada**: sin
// error en consola, porque el despachador comprueba `typeof accion === 'function'` y calla si no la
// encuentra.
//
// Tercer control muerto de ADMIN con la misma causa (PT-139 encontró dos): PT-096 sacó el JS de las
// plantillas «tal cual», y «tal cual» dejó fuera los `onclick=` que lo cableaban.
window.accionesAdmin = window.accionesAdmin || {};
window.accionesAdmin['conciliar'] = loadReconciliation;

document.getElementById('rcTo').valueAsDate = new Date();
const d = new Date(); d.setDate(d.getDate() - 30);
document.getElementById('rcFrom').valueAsDate = d;
