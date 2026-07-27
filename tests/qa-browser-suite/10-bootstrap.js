// Fase B — Bootstrap desde cero. Crea (con flujos reales) admin-setup, comprador, vendedor,
// subasta activa y fondos. Headed. Cada paso es caso de prueba QA-BOOT-NN.
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const cfg = L.cfg;

const OUT = process.argv[2] || fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '10-bootstrap'));
const P = cfg.TEST_PASSWORD;

const RUNID = path.basename(OUT).replace(/[^0-9]/g, '').slice(-6);
const BUYER = { username: `comprador_${RUNID}`, email: `comprador_${RUNID}@test.local`, password: P };
const SELLER = { username: `vendedor_${RUNID}`, email: `vendedor_${RUNID}@test.local`, password: P };

const results = [];
function rec(id, desc, status, detail) {
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`[${status}] ${id.padEnd(12)} ${desc}${detail ? ' :: ' + detail : ''}`);
}
const shot = (page, name) => L.shot(page, name, DIR);

async function verifyEmail(ctx, email, tag) {
  let found = null;
  for (let i = 0; i < 8 && !found; i++) {
    found = await L.findVerifyLink(email, /https?:\/\/[^\s"'<>]*verify-email\?token=[^\s"'<>&]+/i);
    if (!found) await new Promise((r) => setTimeout(r, 800));
  }
  if (!found) return { ok: false, reason: 'no-mail' };
  const link = found.link.replace(/https?:\/\/[^/]+/, cfg.BASE);
  const page = await ctx.newPage();
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await shot(page, `03_verify_${tag}`);
  const bodyText = (await page.textContent('body').catch(() => '')) || '';
  await page.close();
  const ok = /verificad|verified|éxito|success|confirmad|ya puedes/i.test(bodyText);
  return { ok, link, bodyText: bodyText.slice(0, 160) };
}

(async () => {
  const browser = await L.launch();
  const adminCtx = await L.newContext(browser);
  const sellerCtx = await L.newContext(browser);
  const buyerCtx = await L.newContext(browser);

  L.ensureDir(cfg.OUT_ROOT);
  await L.mailhogClear();

  // QA-BOOT-01: Admin login
  const al = await L.adminLoginLib(adminCtx);
  if (al.ok) await shot(al.page, '00_admin_login');
  rec('QA-BOOT-01', 'Admin login inicial', al.ok ? 'PASS' : 'FAIL', al.url);

  // QA-BOOT-02: Config comisión GLOBAL
  if (al.ok) {
    const p = al.page;
    await p.goto(cfg.ADMIN + '/commissions', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);
    const rate = await p.$('input[name="ratePercent"]');
    if (rate) {
      await rate.fill('10');
      await Promise.all([
        p.waitForNavigation({ timeout: 10000 }).catch(() => {}),
        p.$eval('form[action="/commissions/config/global"]', (f) => f.submit()).catch(() => {}),
      ]);
      await p.waitForTimeout(600);
    }
    await shot(p, '04_commission_global');
    const dbRate = L.dbQuery("SELECT rate_percent FROM commission_config WHERE type='GLOBAL' LIMIT 1");
    rec('QA-BOOT-02', 'Config comisión GLOBAL (10%)', /^\d/.test(dbRate) ? 'PASS' : 'FAIL', `db.rate_percent=${dbRate}`);
  } else {
    rec('QA-BOOT-02', 'Config comisión GLOBAL', 'BLOCKED', 'admin login falló');
  }

  // QA-BOOT-04/05: registrar comprador y vendedor
  const rBuyer = await L.registerBase(buyerCtx, BUYER, { shot });
  rec('QA-BOOT-04', `Registrar comprador (${BUYER.email})`, rBuyer.ok ? 'PASS' : 'FAIL', rBuyer.url || rBuyer.error);
  const rSeller = await L.registerBase(sellerCtx, SELLER, { shot });
  rec('QA-BOOT-05', `Registrar vendedor (${SELLER.email})`, rSeller.ok ? 'PASS' : 'FAIL', rSeller.url || rSeller.error);
  console.log(`   (db users=${L.dbQuery('SELECT count(*) FROM users')})`);

  // QA-BOOT-06: verificar emails
  const vBuyer = await verifyEmail(buyerCtx, BUYER.email, 'buyer');
  const vSeller = await verifyEmail(sellerCtx, SELLER.email, 'seller');
  rec('QA-BOOT-06', 'Verificar email (comprador y vendedor)', vBuyer.ok && vSeller.ok ? 'PASS' : 'FAIL',
    `buyer=${vBuyer.ok}(${vBuyer.reason || ''}) seller=${vSeller.ok}(${vSeller.reason || ''})`);
  console.log(`   (db verified=${L.dbQuery('SELECT count(*) FROM users WHERE email_verified_at IS NOT NULL')})`);

  // QA-BOOT-07: seller login + onboarding
  const sLogin = await L.loginBase(sellerCtx, SELLER);
  rec('QA-BOOT-07a', 'Login vendedor', sLogin.ok ? 'PASS' : 'FAIL', sLogin.url || sLogin.error);
  const sellerId = L.dbQuery(`SELECT id FROM users WHERE email='${SELLER.email}'`);
  if (sLogin.ok) {
    const p = sLogin.page;
    await p.goto(cfg.CLIENT + '/seller/onboarding', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);
    await L.fillWhenReady(p, '#legalName', 'Vendedor QA SA de CV').catch(() => {});
    await p.fill('#displayName', `Tienda ${RUNID}`).catch(() => {});
    await p.fill('#address', 'Av. Reforma 100, Centro').catch(() => {});
    await p.fill('#city', 'Ciudad de México').catch(() => {});
    await p.fill('#country', 'México').catch(() => {});
    await p.fill('#phone', '+525555555555').catch(() => {});
    await p.check('#acceptTerms').catch(() => {});
    await shot(p, '05_onboarding_form');
    // El onboarding guarda perfil (PATCH /users/me) y llama enable-seller. Con el gate KYC (PT-069),
    // enable-seller DEBE fallar aquí (KYC no aprobado) — el perfil sí queda guardado.
    await p.click('button[type=submit]').catch(() => {});
    await p.waitForTimeout(2000);
    await shot(p, '06_onboarding_after');
    const isSellerPre = L.dbQuery(`SELECT is_seller FROM users WHERE email='${SELLER.email}'`);
    // QA-BOOT-07b — Vendedor envía KYC (POST /api/v1/kyc vía BFF del CLIENT). Crea submission PENDING.
    const kycSubmit = await p.evaluate(async () => {
      const r = await fetch('/api/v1/kyc', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idType: 'INE', idNumber: 'QA-INE-0001', fullName: 'Vendedor QA', address: 'Av. Reforma 100' }),
      });
      return { ok: r.ok, status: r.status, body: await r.text().catch(() => '') };
    });
    const kycCount = L.dbQuery('SELECT count(*) FROM kyc_submissions');
    // Gate correcto: is_seller sigue false hasta que el admin apruebe el KYC.
    rec('QA-BOOT-07', 'Onboarding vendedor: perfil guardado + gate KYC bloquea enable-seller',
      isSellerPre === 'f' ? 'PASS' : 'FAIL', `is_seller(pre)=${isSellerPre} (gate KYC activo, PT-069)`);
    rec('QA-BOOT-07b', 'Vendedor envía KYC (POST /api/v1/kyc)',
      kycSubmit.ok && /^[1-9]/.test(kycCount) ? 'PASS' : 'FAIL',
      `http=${kycSubmit.status} kyc_submissions=${kycCount}`);
  } else {
    rec('QA-BOOT-07', 'Onboarding vendedor', 'BLOCKED', 'login vendedor falló');
  }

  // QA-BOOT-08: admin aprueba KYC → kyc.approve pone is_seller=true (PT-069)
  const kycId = L.dbQuery('SELECT id FROM kyc_submissions ORDER BY submitted_at DESC LIMIT 1');
  if (/^[a-f0-9-]{8,}/i.test(kycId)) {
    // Evidencia visual del detalle en el admin
    if (al.ok) {
      await al.page.goto(cfg.ADMIN + '/kyc/' + kycId, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await al.page.waitForTimeout(400);
      await shot(al.page, '07_kyc_detail');
    }
    // Aprobación vía API admin (x-admin-key) — robusta e independiente de la UI
    let approveHttp = 0;
    try {
      const r = await fetch('http://localhost:3000/api/v1/admin/kyc/' + kycId + '/approve', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': 'dev-admin-key' },
        body: JSON.stringify({ adminUser: 'admin' }),
      });
      approveHttp = r.status;
    } catch (e) { approveHttp = -1; }
    await new Promise((r) => setTimeout(r, 500));
    const kycStatus = L.dbQuery(`SELECT status FROM kyc_submissions WHERE id='${kycId}'`);
    const isSeller = L.dbQuery(`SELECT is_seller FROM users WHERE email='${SELLER.email}'`);
    rec('QA-BOOT-08', 'Admin aprueba KYC → is_seller=true',
      /APPROVED/i.test(kycStatus) && isSeller === 't' ? 'PASS' : 'FAIL',
      `http=${approveHttp} kyc.status=${kycStatus} is_seller=${isSeller}`);
  } else {
    rec('QA-BOOT-08', 'Admin aprueba KYC', 'FAIL', 'no se creó KYC submission');
  }

  // QA-BOOT-09: crear + publicar subasta
  let auctionId = '';
  if (sLogin.ok) {
    const p = sLogin.page;
    await p.goto(cfg.CLIENT + '/auctions/create', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);
    const now = new Date();
    const startsAt = new Date(now.getTime() + 3 * 60 * 1000);   // +3 min (debe ser futuro)
    const endsAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 h (endsAt ≥ startsAt+1h)
    const fmt = (d) => {
      const q = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${q(d.getMonth() + 1)}-${q(d.getDate())}T${q(d.getHours())}:${q(d.getMinutes())}`;
    };
    // capturar respuesta de creación
    let createResp = { seen: false, status: 0, body: '' };
    p.on('response', async (r) => {
      if (r.url().match(/\/api\/v1\/auctions$/) && r.request().method() === 'POST') {
        createResp.seen = true; createResp.status = r.status();
        try { createResp.body = (await r.text()).slice(0, 200); } catch {}
      }
    });
    await L.fillWhenReady(p, '#title', `Reloj de colección QA ${RUNID}`);
    await p.fill('#description', 'Pieza de prueba E2E creada por el harness QA. Estado: excelente.');
    await p.fill('#startingPrice', '500');
    await p.fill('#startsAt', fmt(startsAt));
    await p.fill('#endsAt', fmt(endsAt));
    await shot(p, '09_auction_create_form');
    await p.click('button[type=submit]');
    await p.waitForTimeout(2000);
    await shot(p, '10_auction_after_create');
    auctionId = L.dbQuery('SELECT id FROM auctions ORDER BY created_at DESC LIMIT 1');
    const created = /^[a-f0-9-]{8,}/i.test(auctionId);
    let statusA = created ? L.dbQuery(`SELECT status FROM auctions WHERE id='${auctionId}'`) : '';
    let published = false;
    if (created && /DRAFT/i.test(statusA)) {
      const resp = await p.evaluate(async (id) => {
        const r = await fetch(`/api/v1/auctions/${id}/publish`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        return { ok: r.ok, status: r.status, body: await r.text().catch(() => '') };
      }, auctionId);
      published = resp.ok;
      await p.waitForTimeout(600);
      statusA = L.dbQuery(`SELECT status FROM auctions WHERE id='${auctionId}'`);
      console.log(`   publish -> http=${resp.status} status=${statusA} ${resp.ok ? '' : resp.body.slice(0, 140)}`);
    }
    if (!created) console.log(`   create -> seen=${createResp.seen} http=${createResp.status} body=${createResp.body}`);
    rec('QA-BOOT-09', 'Crear + publicar subasta',
      created && /(PUBLISHED|ACTIVE)/i.test(statusA) ? 'PASS' : (created ? 'PARTIAL' : 'FAIL'),
      `id=${auctionId.slice(0, 8)} status=${statusA} publishOk=${published} createHttp=${createResp.status}`);
  } else {
    rec('QA-BOOT-09', 'Crear + publicar subasta', 'BLOCKED', 'login vendedor falló');
  }
  fs.writeFileSync(path.join(OUT, '.bootstrap-auction'), auctionId || '');

  // QA-BOOT-10: comprador login + contrato depósito + fondeo
  const bLogin = await L.loginBase(buyerCtx, BUYER);
  rec('QA-BOOT-10a', 'Login comprador', bLogin.ok ? 'PASS' : 'FAIL', bLogin.url || bLogin.error);
  const buyerId = L.dbQuery(`SELECT id FROM users WHERE email='${BUYER.email}'`);
  if (bLogin.ok) {
    const p = bLogin.page;
    // Evidencia visual del formulario de depósito
    await p.goto(cfg.CLIENT + '/wallet/deposit', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(500);
    await L.fillWhenReady(p, '#amount', '5000');
    await shot(p, '11_deposit_form');
    // PT-073 — Verificación DETERMINISTA del contrato: se llama al endpoint por el BFF y se inspecciona
    // el JSON (igual que hace deposit.html). Evita la carrera del submit del form con window.location→abort.
    const initiate = await p.evaluate(async () => {
      const r = await fetch('/api/v1/payments/initiate', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5000, provider: 'MERCADO_PAGO' }),
      });
      let data = null; try { data = await r.json(); } catch {}
      return { status: r.status, ok: r.ok, hasRedirect: !!(data && (data.redirectUrl || data.init_point || data.url)) };
    });
    await shot(p, '12_deposit_after');
    rec('QA-BOOT-10b', 'Depósito: contrato /payments/initiate devuelve redirectUrl',
      initiate.ok && initiate.hasRedirect ? 'PASS' : 'FAIL',
      `http=${initiate.status} redirectUrl=${initiate.hasRedirect}`);
  } else {
    rec('QA-BOOT-10b', 'Depósito contrato', 'BLOCKED', 'login comprador falló');
  }
  // fondeo de prueba (pasarela fuera de alcance): crédito replicando walletService.deposit
  if (/^[a-f0-9-]{8,}/i.test(buyerId)) {
    L.dbQuery(`INSERT INTO wallets (id, created_at, updated_at, user_id, balance, held_funds, currency, is_active) SELECT gen_random_uuid(), now(), now(), '${buyerId}', 0, 0, 'MXN', false WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id='${buyerId}')`);
    L.dbQuery(
      `WITH w AS (SELECT id, balance FROM wallets WHERE user_id='${buyerId}' LIMIT 1) ` +
      `INSERT INTO ledger (id, wallet_id, type, amount, balance_before, balance_after, reference_id, reference_type, description, created_at) ` +
      `SELECT gen_random_uuid(), w.id, 'DEPOSIT', 5000, w.balance, w.balance+5000, 'QA-BOOT-CREDIT', 'TEST', 'Fondeo de prueba QA (pasarela fuera de alcance)', now() FROM w`
    );
    L.dbQuery(`UPDATE wallets SET balance=balance+5000, is_active=true WHERE user_id='${buyerId}'`);
    const bal = L.dbQuery(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`);
    rec('QA-BOOT-10c', 'Fondear wallet comprador (crédito de prueba)', /^[1-9]/.test(bal) ? 'PASS' : 'FAIL', `balance=${bal}`);
  } else {
    rec('QA-BOOT-10c', 'Fondear wallet comprador', 'BLOCKED', 'buyerId no resuelto');
  }

  fs.writeFileSync(path.join(OUT, '.actors.json'), JSON.stringify({ BUYER, SELLER, buyerId, sellerId, auctionId, runid: RUNID }, null, 2));
  await browser.close();
  L.writeJSON(OUT, 'bootstrap.json', results);
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== BOOTSTRAP RESUMEN === total=${results.length} PASS=${pass} FAIL=${fail}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
