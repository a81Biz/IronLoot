// Librería compartida del harness QA IronLoot
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const cfg = require('./config.cjs');

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
  return d;
}

// Adjunta captura de errores de consola/página/red a una page
function attachCapture(page) {
  const rec = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      // Ignorar ruido conocido de favicon/websocket dev
      rec.consoleErrors.push(t);
    }
  });
  page.on('pageerror', (err) => rec.pageErrors.push(String(err && err.message ? err.message : err)));
  page.on('requestfailed', (req) => {
    const f = req.failure();
    rec.failedRequests.push(`${req.method()} ${req.url()} :: ${f ? f.errorText : '?'}`);
  });
  return rec;
}

async function launch() {
  const browser = await chromium.launch({ headless: !cfg.HEADED, slowMo: cfg.SLOWMO });
  return browser;
}

async function newContext(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport || { width: 1366, height: 900 },
    ignoreHTTPSErrors: true,
    ...opts.contextOpts,
  });
  ctx.setDefaultTimeout(cfg.DEFAULT_TIMEOUT);
  return ctx;
}

// Navega y devuelve {status, finalUrl, title, capture}
async function visit(page, url, capture, opts = {}) {
  let status = null;
  try {
    const resp = await page.goto(url, { waitUntil: opts.waitUntil || 'domcontentloaded', timeout: opts.timeout || cfg.DEFAULT_TIMEOUT });
    status = resp ? resp.status() : null;
  } catch (e) {
    return { status: null, finalUrl: page.url(), title: '', error: String(e.message || e) };
  }
  let title = '';
  try { title = await page.title(); } catch {}
  return { status, finalUrl: page.url(), title };
}

/**
 * Captura de pantalla, guardada en la carpeta de la corrida.
 *
 * PT-106 — La firma era `(page, dir, name)` y 16 de las 20 llamadas pasaban dos argumentos, asi
 * que el nombre caia en `dir` y `name` quedaba `undefined`: el fichero acababa en
 * `<etiqueta>/undefined.png` DENTRO del codigo fuente de la suite, no en la corrida. JavaScript
 * no protesta por un argumento que falta.
 *
 * Se invirtio el orden en vez de corregir las 16 llamadas porque el orden viejo es el que induce
 * el error: nadie espera que el segundo argumento de una funcion de captura sea un directorio.
 * `dir` es opcional y por defecto es la carpeta de la corrida.
 */

/** La carpeta de la corrida en curso, segun `.last-run`. */
function readLastRun() {
  return fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
}

async function shot(page, name, dir) {
  if (!name) throw new Error('shot(): falta el nombre de la captura');
  const destino = dir || ensureDir(path.join(readLastRun(), 'capturas'));
  const file = path.join(destino, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: true });
  } catch (e) {
    try { await page.screenshot({ path: file }); } catch {}
  }
  return path.basename(file);
}

// Mailhog helpers
async function mailhogMessages() {
  const res = await fetch(`${cfg.MAILHOG}/api/v2/messages?limit=50`);
  const j = await res.json();
  return j.items || [];
}
async function mailhogClear() {
  await fetch(`${cfg.MAILHOG}/api/v1/messages`, { method: 'DELETE' });
}
// Busca el correo más reciente para un destinatario y extrae el primer enlace con `token=`
async function findVerifyLink(toEmail, pattern = /https?:\/\/[^\s"'<>]*token=[^\s"'<>&]+[^\s"'<>]*/i) {
  const items = await mailhogMessages();
  for (const m of items) {
    const to = (m.To || []).map((t) => `${t.Mailbox}@${t.Domain}`.toLowerCase());
    if (toEmail && !to.includes(toEmail.toLowerCase())) continue;
    const body = decodeBody(m);
    const match = body.match(pattern);
    if (match) return { link: match[0], raw: body, id: m.ID };
  }
  return null;
}
function decodeBody(m) {
  let body = (m.Content && m.Content.Body) || '';
  const cte = m.Content && m.Content.Headers && m.Content.Headers['Content-Transfer-Encoding'];
  const isQP = Array.isArray(cte) ? /quoted-printable/i.test(cte.join(' ')) : /quoted-printable/i.test(String(cte || ''));
  if (isQP) {
    // Decode quoted-printable correctamente en una sola pasada:
    // 1) eliminar soft line breaks (=CRLF)  2) decodificar cada =XX (incluye =3D)
    body = body
      .replace(/=\r?\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (x, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return body;
}

// ---- Helpers de autenticación robustos (reintentos + esperas explícitas) ----
async function fillWhenReady(page, sel, val) {
  await page.waitForSelector(sel, { state: 'visible', timeout: 10000 });
  await page.fill(sel, String(val));
}

// Click submit y espera a que la URL cambie al patrón esperado (mecanismo primario).
// Si no cambia, inspecciona el alert de error UNA vez (sin sondear durante la navegación).
async function submitAndSettle(page, okUrlRe, opts = {}) {
  const timeout = opts.timeout || 15000;
  await page.click(opts.submitSel || 'button[type=submit]');
  try {
    await page.waitForURL(okUrlRe, { timeout });
    return { ok: true, url: page.url() };
  } catch {
    // no navegó: buscar mensaje de error (página estable ahora)
    let error = '';
    for (const sel of ['#registerError', '#loginError', '.alert-error', '#depositError', '#onboardingMsg']) {
      const el = await page.$(sel).catch(() => null);
      if (el) {
        const vis = await el.isVisible().catch(() => false);
        const txt = ((await el.textContent().catch(() => '')) || '').trim();
        if (vis && txt) { error = txt; break; }
      }
    }
    return { ok: okUrlRe.test(page.url()), url: page.url(), error: error || 'timeout' };
  }
}

// Registro en BASE. Devuelve {ok, url, error}
async function registerBase(ctx, u, opts = {}) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const page = await ctx.newPage();
    try {
      await page.goto(cfg.BASE + '/auth/register', { waitUntil: 'domcontentloaded' });
      await fillWhenReady(page, '#username', u.username);
      await fillWhenReady(page, '#email', u.email);
      await fillWhenReady(page, '#password', u.password);
      if (opts.beforeSubmit) await opts.beforeSubmit(page);
      const r = await submitAndSettle(page, /verify-email-pending|dashboard/);
      if (opts.shot) await opts.shot(page, `register_${u.username}`);
      await page.close();
      if (r.ok || r.error) return r;
    } catch (e) {
      await page.close().catch(() => {});
      if (attempt === 2) return { ok: false, error: String(e.message || e) };
    }
  }
  return { ok: false, error: 'retries-exhausted' };
}

// Login en BASE (aterriza en CLIENT). Devuelve {page, ok, url, error} — page abierta con sesión.
async function loginBase(ctx, u, opts = {}) {
  let last = {};
  for (let attempt = 1; attempt <= 2; attempt++) {
    const page = await ctx.newPage();
    try {
      await page.goto(cfg.BASE + '/auth/login', { waitUntil: 'domcontentloaded' });
      await fillWhenReady(page, '#email', u.email);
      await fillWhenReady(page, '#password', u.password);
      const r = await submitAndSettle(page, /5175|dashboard/);
      if (r.ok) {
        await page.waitForTimeout(400);
        return { page, ok: true, url: page.url() };
      }
      last = r;
      await page.close();
    } catch (e) {
      last = { ok: false, error: String(e.message || e) };
      await page.close().catch(() => {});
    }
  }
  return { page: null, ok: false, ...last };
}

// Login admin (POST form server-side). Devuelve {page, ok, url}
async function adminLoginLib(ctx) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const page = await ctx.newPage();
    try {
      await page.goto(cfg.ADMIN + '/login', { waitUntil: 'domcontentloaded' });
      await fillWhenReady(page, '#username', cfg.ADMIN_USER);
      await fillWhenReady(page, '#password', cfg.ADMIN_PASS);
      await page.click('button[type=submit]');
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(500);
      const url = page.url();
      if (!/\/login/.test(url)) return { page, ok: true, url };
      await page.close();
    } catch (e) {
      await page.close().catch(() => {});
    }
  }
  return { page: null, ok: false, url: cfg.ADMIN + '/login' };
}

// Resultado de un caso
function result(id, desc, status, expected, actual, evidence, notes) {
  return { id, desc, status, expected, actual, evidence: evidence || '', notes: notes || '' };
}

// DB helper vía docker exec psql
const { execSync } = require('child_process');
function dbQuery(sql) {
  try {
    const out = execSync(
      `docker exec ironloot-db psql -U ironloot -d ironloot_db -t -A -c "${sql.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', timeout: 15000 }
    );
    return out.trim();
  } catch (e) {
    return `ERR:${e.message}`;
  }
}

function writeJSON(dir, name, obj) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2));
}

module.exports = {
  ts, ensureDir, attachCapture, launch, newContext, visit, shot,
  mailhogMessages, mailhogClear, findVerifyLink, decodeBody,
  fillWhenReady, submitAndSettle, registerBase, loginBase, adminLoginLib,
  result, dbQuery, writeJSON, cfg,
};
