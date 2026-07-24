// Fases 3/4/6 — Sweep autenticado profundo. Navega TODAS las rutas privadas con sesión real
// (comprador, vendedor, admin), capturando HTTP, render, errores de consola y screenshot.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const cfg = L.cfg;

const OUT = process.argv[2] || fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '20-authed'));
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));
const AID = actors.auctionId;

const results = [];
function rec(o) {
  results.push(o);
  const flag = o.status;
  const ce = o.consoleErrors && o.consoleErrors.length ? ` consoleErr:${o.consoleErrors.length}` : '';
  console.log(`[${flag}] ${o.id.padEnd(16)} ${String(o.path).padEnd(34)} http=${String(o.http).padEnd(4)} render=${o.renderedOk}${ce}`);
}

async function sweep(page, id, base, route, tag) {
  const cap = L.attachCapture(page);
  let http = null, err = '';
  try {
    const resp = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 15000 });
    http = resp ? resp.status() : null;
    await page.waitForTimeout(500);
  } catch (e) { err = String(e.message || e); }
  const finalUrl = page.url();
  // ¿aterrizó en login? => la sesión no fue aceptada (fallo de guard/sesión)
  const bouncedToLogin = /\/auth\/login|\/login/.test(finalUrl) && !/\/auth\/login|\/login/.test(route);
  const bodyLen = (await page.content().catch(() => '')).length;
  const renderedOk = !!http && http < 400 && !bouncedToLogin && bodyLen > 500;
  const safe = route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 60) || 'root';
  const evidence = await L.shot(page, DIR, `${id}_${safe}`);
  const ce = cap.consoleErrors.filter((e) => !/favicon/i.test(e));
  rec({
    id, path: route, http, finalUrl: finalUrl.replace(base, ''), bouncedToLogin,
    renderedOk, consoleErrors: ce, pageErrors: cap.pageErrors,
    evidence: `20-authed/${evidence}`, error: err,
    status: renderedOk ? 'PASS' : 'FAIL',
  });
}

(async () => {
  const browser = await L.launch();

  // ---------- CLIENT comprador ----------
  const buyerCtx = await L.newContext(browser);
  const bl = await L.loginBase(buyerCtx, actors.BUYER);
  if (!bl.ok) { console.log('!! login comprador falló, abort CLIENT-buyer'); }
  else {
    const p = bl.page;
    const buyerRoutes = [
      '/dashboard', '/profile', '/settings', '/wallet', '/wallet/deposit', '/wallet/withdraw',
      '/wallet/history', '/payments', '/my-bids', '/auctions/won-auctions', '/auctions/watchlist',
      '/orders', '/notifications', '/disputes', '/reputation', `/auctions/${AID}`,
    ];
    let i = 0;
    for (const r of buyerRoutes) { i++; await sweep(p, `QA-CLI-${String(i).padStart(2, '0')}`, cfg.CLIENT, r, 'buyer'); }
  }

  // ---------- CLIENT vendedor ----------
  const sellerCtx = await L.newContext(browser);
  const sl = await L.loginBase(sellerCtx, actors.SELLER);
  if (!sl.ok) { console.log('!! login vendedor falló, abort CLIENT-seller'); }
  else {
    const p = sl.page;
    const sellerRoutes = [
      '/seller/onboarding', '/seller/auctions', '/seller/orders', '/auctions/create', `/auctions/${AID}/edit`,
    ];
    let i = 0;
    for (const r of sellerRoutes) { i++; await sweep(p, `QA-SEL-${String(i).padStart(2, '0')}`, cfg.CLIENT, r, 'seller'); }
  }

  // ---------- ADMIN 18 módulos ----------
  const adminCtx = await L.newContext(browser);
  const al = await L.adminLoginLib(adminCtx);
  if (!al.ok) { console.log('!! admin login falló, abort ADMIN'); }
  else {
    const p = al.page;
    const adminRoutes = [
      '/', '/users', '/auctions', '/lots', '/moderation', '/orders', '/disputes', '/refunds',
      '/payments', '/kyc', '/commissions', '/cfdi', '/cms', '/seo', '/audit', '/reports',
      '/reconciliation', '/notifications', '/configuration/platform', '/settings',
    ];
    let i = 0;
    for (const r of adminRoutes) { i++; await sweep(p, `QA-ADM-${String(i).padStart(2, '0')}`, cfg.ADMIN, r, 'admin'); }
  }

  await browser.close();
  L.writeJSON(OUT, 'authed.json', results);
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const ce = results.filter((r) => r.consoleErrors && r.consoleErrors.length).length;
  console.log(`\n=== SWEEP AUTENTICADO === total=${results.length} PASS=${pass} FAIL=${fail} pantallas_con_consoleError=${ce}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
