// Fase 2 (auth negativos) + Fase 7 (transversales: responsive, CSP, cross-browser, cookie HttpOnly).
const fs = require('fs');
const path = require('path');
const { chromium, firefox, webkit } = require('playwright');
const L = require('./lib.js');
const cfg = L.cfg;

const OUT = fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '40-extras'));
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));

const results = [];
function rec(id, desc, status, detail) {
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`[${status}] ${id.padEnd(12)} ${desc}${detail ? ' :: ' + detail : ''}`);
}

(async () => {
  const browser = await chromium.launch({ headless: !cfg.HEADED, slowMo: cfg.SLOWMO });

  // ---------- AUTH negativos ----------
  const ctx = await L.newContext(browser);
  // QA-AUTH-06 login inválido
  {
    const p = await ctx.newPage();
    await p.goto(cfg.BASE + '/auth/login', { waitUntil: 'domcontentloaded' });
    await p.fill('#email', actors.BUYER.email);
    await p.fill('#password', 'ClaveIncorrecta999');
    await p.click('button[type=submit]');
    await p.waitForTimeout(1800);
    const err = ((await p.textContent('#loginError').catch(() => '')) || '').trim();
    const url = p.url();
    await L.shot(p, 'auth_login_invalid');
    rec('QA-AUTH-06', 'Login inválido → error, sin sesión', err && /login/.test(url) ? 'PASS' : 'FAIL', `err="${err}" url=${url.replace(cfg.BASE, '')}`);
    await p.close();
  }
  // QA-AUTH-03 registro duplicado
  {
    const p = await ctx.newPage();
    await p.goto(cfg.BASE + '/auth/register', { waitUntil: 'domcontentloaded' });
    await p.fill('#username', 'dup_user');
    await p.fill('#email', actors.BUYER.email); // ya existe
    await p.fill('#password', cfg.TEST_PASSWORD);
    await p.click('button[type=submit]');
    await p.waitForTimeout(1800);
    const err = ((await p.textContent('#registerError').catch(() => '')) || '').trim();
    const url = p.url();
    await L.shot(p, 'auth_register_dup');
    rec('QA-AUTH-03', 'Registro con email duplicado → error controlado', err && /register/.test(url) ? 'PASS' : 'FAIL', `err="${err}"`);
    await p.close();
  }
  // QA-AUTH-02 validación HTML5 (email inválido / pass corta)
  {
    const p = await ctx.newPage();
    await p.goto(cfg.BASE + '/auth/register', { waitUntil: 'domcontentloaded' });
    await p.fill('#username', 'x');
    await p.fill('#email', 'no-es-email');
    await p.fill('#password', '123');
    await p.click('button[type=submit]');
    await p.waitForTimeout(800);
    const emailValid = await p.$eval('#email', (el) => el.validity.valid).catch(() => true);
    const passValid = await p.$eval('#password', (el) => el.validity.valid).catch(() => true);
    const url = p.url();
    rec('QA-AUTH-02', 'Validación de registro (email/pass inválidos)', (!emailValid || !passValid) && /register/.test(url) ? 'PASS' : 'FAIL', `emailValid=${emailValid} passValid=${passValid}`);
    await p.close();
  }
  // QA-AUTH-05/13 login válido + cookie HttpOnly
  {
    const lg = await L.loginBase(ctx, actors.BUYER);
    if (lg.ok) {
      const jsCookies = await lg.page.evaluate(() => document.cookie);
      const cookies = await ctx.cookies();
      const at = cookies.find((c) => /access|token/i.test(c.name));
      const httpOnly = at ? at.httpOnly : false;
      const leaked = /access|token/i.test(jsCookies);
      rec('QA-AUTH-13', 'Token en cookie HttpOnly (no accesible por JS)', httpOnly && !leaked ? 'PASS' : 'FAIL', `cookie=${at ? at.name : 'none'} httpOnly=${httpOnly} jsLeak=${leaked}`);
      // QA-AUTH-12 logout
      await lg.page.goto(cfg.CLIENT + '/auth/logout', { waitUntil: 'domcontentloaded' });
      await lg.page.waitForTimeout(1000);
      const dash = await lg.page.goto(cfg.CLIENT + '/dashboard', { waitUntil: 'domcontentloaded' });
      const bounced = /login/.test(lg.page.url());
      rec('QA-AUTH-12', 'Logout limpia sesión (dashboard→login)', bounced ? 'PASS' : 'FAIL', `url=${lg.page.url().replace(cfg.CLIENT, '').replace(cfg.BASE, '')}`);
      await lg.page.close();
    } else {
      rec('QA-AUTH-13', 'Cookie HttpOnly', 'BLOCKED', 'login falló');
    }
  }

  // ---------- Responsive (QA-X-04) ----------
  const viewports = [{ w: 375, h: 812, name: 'movil' }, { w: 768, h: 1024, name: 'tablet' }, { w: 1366, h: 900, name: 'desktop' }];
  // BASE público
  for (const vp of viewports) {
    const rctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const p = await rctx.newPage();
    await p.goto(cfg.BASE + '/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await L.shot(p, `responsive_base_${vp.name}`);
    rec(`QA-X-04-base-${vp.name}`, `Responsive BASE home @${vp.w}px (sin overflow horizontal)`, overflow <= 3 ? 'PASS' : 'FAIL', `overflowX=${overflow}px`);
    await rctx.close();
  }
  // CLIENT dashboard (autenticado) — FINDING-QA-13 (overflow móvil CLIENT / PT-055)
  for (const vp of viewports) {
    const rctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    const lg = await L.loginBase(rctx, actors.BUYER);
    if (lg.ok) {
      const p = lg.page;
      await p.goto(cfg.CLIENT + '/dashboard', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(600);
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await L.shot(p, `responsive_client_${vp.name}`);
      rec(`QA-X-04-client-${vp.name}`, `Responsive CLIENT dashboard @${vp.w}px`, overflow <= 3 ? 'PASS' : 'FAIL', `overflowX=${overflow}px`);
    } else {
      rec(`QA-X-04-client-${vp.name}`, `Responsive CLIENT @${vp.w}px`, 'BLOCKED', 'login falló');
    }
    await rctx.close();
  }

  // ---------- CSP / security headers (QA-X-07) ----------
  for (const [name, url] of [['BASE', cfg.BASE + '/'], ['CLIENT', cfg.CLIENT + '/dashboard'], ['ADMIN', cfg.ADMIN + '/login']]) {
    const res = await fetch(url, { redirect: 'manual' }).catch(() => null);
    const csp = res && (res.headers.get('content-security-policy') || res.headers.get('content-security-policy-report-only'));
    const xfo = res && res.headers.get('x-frame-options');
    rec(`QA-X-07-${name}`, `Cabecera CSP presente (${name})`, csp ? 'PASS' : 'FAIL', `csp=${csp ? 'sí' : 'no'} xFrameOptions=${xfo || 'no'}`);
  }

  await browser.close();

  // ---------- Cross-browser (QA-X-05) ----------
  for (const [name, engine] of [['firefox', firefox], ['webkit', webkit]]) {
    try {
      const b = await engine.launch({ headless: true });
      const p = await (await b.newContext()).newPage();
      const resp = await p.goto(cfg.BASE + '/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      const title = await p.title();
      await L.shot(p, `crossbrowser_${name}`);
      rec(`QA-X-05-${name}`, `Cross-browser BASE home (${name})`, resp && resp.status() < 400 && title ? 'PASS' : 'FAIL', `http=${resp && resp.status()} title="${title}"`);
      await b.close();
    } catch (e) {
      rec(`QA-X-05-${name}`, `Cross-browser (${name})`, 'FAIL', String(e.message || e).slice(0, 100));
    }
  }


  // ── PT-100: ningun sitio puede subir las peticiones a HTTPS si no servimos HTTPS ──
  //
  // Helmet anade `upgrade-insecure-requests` por defecto. Sobre `localhost` no se nota —los
  // navegadores lo eximen— pero sobre un dominio real en desarrollo ROMPE EL SITIO ENTERO: cada
  // peticion se sube a `https://`, donde no escucha nadie, y falla con ERR_CONNECTION_REFUSED.
  //
  // Le paso a ADMIN al mover la suite a subdominios: 24 checks caidos, y el sintoma —«la sesion
  // no persiste»— apuntaba en la direccion equivocada. La sesion estaba bien; la peticion nunca
  // llegaba.
  for (const [nombre, base] of [['BASE', cfg.BASE], ['CLIENT', cfg.CLIENT], ['ADMIN', cfg.ADMIN]]) {
    let csp = '';
    try {
      const r = await fetch(base + '/', { redirect: 'manual' });
      csp = r.headers.get('content-security-policy') || '';
    } catch (e) {
      csp = 'ERR:' + e.message;
    }
    const sube = /upgrade-insecure-requests/i.test(csp);
    rec(
      `QA-CSP-UIR-${nombre}`,
      `${nombre} no fuerza HTTPS en desarrollo (upgrade-insecure-requests)`,
      sube ? 'FAIL' : 'PASS',
      sube ? 'la envia: el navegador subira a https:// y no escucha nadie' : 'no la envia',
    );
  }

  L.writeJSON(OUT, 'extras.json', results);
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== EXTRAS RESUMEN === total=${results.length} PASS=${pass} FAIL=${fail}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
