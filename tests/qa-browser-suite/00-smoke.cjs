// Fase 0 — Smoke / disponibilidad. Barre todas las rutas, headed, con screenshots + captura de consola.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const cfg = L.cfg;

// El dir de salida se pasa por argv[2] para compartir timestamp entre fases
const OUT = process.argv[2] || path.join(cfg.OUT_ROOT, L.ts());
const DIR = L.ensureDir(path.join(OUT, '00-smoke'));

const suite = require('./suite.json');

function verdict(expect, status, finalUrl, capture) {
  const redirectedToLogin = /\/auth\/login|\/login/.test(finalUrl);
  if (expect === 'ok') return status && status < 400 ? 'PASS' : 'FAIL';
  if (expect === 'notfound') return status === 404 ? 'PASS' : 'FAIL';
  if (expect === 'guard') return redirectedToLogin ? 'PASS' : 'FAIL';
  if (expect === 'any') return status ? 'PASS' : 'FAIL';
  return 'FAIL';
}

(async () => {
  const browser = await L.launch();
  const ctx = await L.newContext(browser);
  const page = await ctx.newPage();
  const results = [];
  let n = 0;

  for (const app of ['BASE', 'CLIENT', 'ADMIN']) {
    const base = cfg[app];
    for (const r of suite[app].routes) {
      n++;
      const capture = L.attachCapture(page);
      const url = base + r.path;
      const nav = await L.visit(page, url);
      const safe = r.path.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root';
      const shotName = `${String(n).padStart(2, '0')}_${app}_${safe}`.slice(0, 90);
      const evidence = await L.shot(page, DIR, shotName);
      // pequeña espera para que el usuario alcance a ver
      await page.waitForTimeout(150);
      const status = verdict(r.expect, nav.status, nav.finalUrl, capture);
      const consoleErrs = capture.consoleErrors.filter((e) => !/favicon|net::ERR_.*favicon/i.test(e));
      results.push({
        id: `QA-SMOKE-${app}-${String(n).padStart(2, '0')}`,
        app,
        path: r.path,
        expect: r.expect,
        http: nav.status,
        finalUrl: nav.finalUrl.replace(base, ''),
        title: nav.title,
        consoleErrors: consoleErrs,
        pageErrors: capture.pageErrors,
        failedRequests: capture.failedRequests.filter((f) => !/favicon/i.test(f)),
        error: nav.error || '',
        evidence: `00-smoke/${evidence}`,
        status,
      });
      const flag = status === 'PASS' ? 'PASS' : 'FAIL';
      const errNote = consoleErrs.length ? ` | consoleErr:${consoleErrs.length}` : '';
      console.log(`[${flag}] ${app.padEnd(6)} ${r.path.padEnd(42)} http=${String(nav.status).padEnd(4)} final=${nav.finalUrl.replace(base, '') || '/'}${errNote}`);
    }
  }

  await browser.close();
  L.writeJSON(OUT, 'smoke.json', results);

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const withConsole = results.filter((r) => r.consoleErrors.length).length;
  console.log(`\n=== SMOKE RESUMEN ===  total=${results.length} PASS=${pass} FAIL=${fail} pantallas_con_consoleError=${withConsole}`);
  console.log(`Salida: ${OUT}`);
  // Registrar el OUT para las fases siguientes
  L.ensureDir(cfg.OUT_ROOT);
  fs.writeFileSync(path.join(cfg.OUT_ROOT, '.last-run'), OUT);
})();
