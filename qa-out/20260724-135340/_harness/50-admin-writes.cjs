// Fase 6 (escritura) — acciones admin representativas con verificación en BD.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const cfg = L.cfg;
const OUT = fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '50-admin-writes'));
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));
const RUNID = actors.runid;

const results = [];
function rec(id, desc, status, detail) {
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`[${status}] ${id.padEnd(14)} ${desc}${detail ? ' :: ' + detail : ''}`);
}
async function submitForm(page, actionSel) {
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
    page.$eval(actionSel, (f) => f.submit()),
  ]);
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await L.launch();
  const ctx = await L.newContext(browser);
  const al = await L.adminLoginLib(ctx);
  if (!al.ok) { console.log('admin login FAIL'); await browser.close(); process.exit(1); }
  const p = al.page;

  // Comisión global (ya verificada en bootstrap) — re-confirmar persistencia
  const commRate = L.dbQuery("SELECT rate_percent FROM commission_config WHERE type='GLOBAL' LIMIT 1");
  rec('QA-ADM-W-commission', 'Comisión global persistida (bootstrap)', /^\d/.test(commRate) ? 'PASS' : 'FAIL', `rate=${commRate}`);

  // SEO: editar page=home
  {
    await p.goto(cfg.ADMIN + '/seo', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(400);
    const title = `IronLoot Home QA ${RUNID}`;
    const form = await p.$('form[action="/seo/home"]');
    if (form) {
      await p.$eval('form[action="/seo/home"] input[name="title"]', (el, v) => (el.value = v), title);
      await p.$eval('form[action="/seo/home"] textarea[name="description"]', (el) => (el.value = 'Descripción SEO de prueba QA.'));
      await L.shot(p, 'seo_form');
      await submitForm(p, 'form[action="/seo/home"]');
    }
    const dbTitle = L.dbQuery("SELECT title FROM seo_config WHERE page='home' LIMIT 1");
    await L.shot(p, 'seo_after');
    rec('QA-ADM-W-seo', 'SEO: editar metadata home → persiste', dbTitle.includes(RUNID) ? 'PASS' : 'FAIL', `db.title="${dbTitle}"`);
  }

  // CMS: editar key home.hero.title
  {
    await p.goto(cfg.ADMIN + '/cms', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(400);
    const val = `Hero QA ${RUNID}`;
    const sel = 'form[action="/cms/home.hero.title"]';
    const form = await p.$(sel);
    if (form) {
      await p.$eval(sel + ' textarea[name="value"]', (el, v) => (el.value = v), val);
      await L.shot(p, 'cms_form');
      await submitForm(p, sel);
    }
    const dbVal = L.dbQuery("SELECT value FROM cms_content WHERE key='home.hero.title' LIMIT 1");
    await L.shot(p, 'cms_after');
    rec('QA-ADM-W-cms', 'CMS: editar bloque home.hero.title → persiste', dbVal.includes(RUNID) ? 'PASS' : 'FAIL', `db.value="${dbVal}"`);
  }

  // Usuario: suspender comprador2 (andamiaje) y luego reactivar
  {
    const b2Id = L.dbQuery(`SELECT id FROM users WHERE email='comprador2_${RUNID}@test.local'`);
    if (/^[a-f0-9-]{8,}/i.test(b2Id)) {
      await p.goto(cfg.ADMIN + '/users/' + b2Id, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(400);
      await L.shot(p, 'user_detail');
      const suspendForm = await p.$(`form[action$="/suspend"]`);
      if (suspendForm) {
        // algunos forms de suspend piden razón
        const reason = await p.$(`form[action$="/suspend"] [name="reason"], form[action$="/suspend"] textarea, form[action$="/suspend"] input[type="text"]`);
        if (reason) await reason.fill('Suspensión de prueba QA').catch(() => {});
        await submitForm(p, `form[action$="/suspend"]`);
      }
      const st = L.dbQuery(`SELECT state FROM users WHERE id='${b2Id}'`);
      await L.shot(p, 'user_after_suspend');
      rec('QA-ADM-W-user', 'Usuario: suspender comprador2 → estado cambia', /SUSPEND/i.test(st) ? 'PASS' : 'FAIL', `state=${st}`);
      // restaurar (unban/reactivar) si existe
      const unbanForm = await p.$(`form[action$="/unban"]`);
      if (unbanForm) { await submitForm(p, `form[action$="/unban"]`); }
    } else {
      rec('QA-ADM-W-user', 'Usuario: acción admin', 'BLOCKED', 'buyer2 no encontrado');
    }
  }

  await browser.close();
  L.writeJSON(OUT, 'admin-writes.json', results);
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== ADMIN WRITES RESUMEN === total=${results.length} PASS=${pass} FAIL=${fail}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
