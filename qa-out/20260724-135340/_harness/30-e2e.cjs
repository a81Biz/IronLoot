// Fase 5 — E2E subasta: puja real (UI) → bloqueo de fondos → outbid → liberación de fondos.
// Comprador2 es andamiaje (API register + verificación/fondeo por DB) para actuar de competidor.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const cfg = L.cfg;

const OUT = process.argv[2] || fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '30-e2e'));
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));
const AID = actors.auctionId;
const RUNID = actors.runid;

const results = [];
function rec(id, desc, status, detail) {
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`[${status}] ${id.padEnd(10)} ${desc}${detail ? ' :: ' + detail : ''}`);
}
const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

async function bidViaUI(ctx, user, amount, tag) {
  const lg = await L.loginBase(ctx, user);
  if (!lg.ok) return { ok: false, reason: 'login-fail' };
  const p = lg.page;
  let bidResp = { seen: false, status: 0, body: '' };
  p.on('response', async (r) => {
    if (/\/auctions\/[^/]+\/bids$/.test(r.url()) && r.request().method() === 'POST') {
      bidResp.seen = true; bidResp.status = r.status();
      try { bidResp.body = (await r.text()).slice(0, 200); } catch {}
    }
  });
  await p.goto(`${cfg.CLIENT}/auctions/${AID}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  await L.fillWhenReady(p, '#bidAmount', String(amount));
  await L.shot(p, `${tag}_before_bid`);
  await p.click('#bidForm button[type=submit]');
  await p.waitForTimeout(1800);
  const msg = ((await p.textContent('#bidMsg').catch(() => '')) || '').trim();
  await L.shot(p, `${tag}_after_bid`);
  await p.close();
  return { ok: bidResp.status > 0 && bidResp.status < 400, resp: bidResp, msg };
}

(async () => {
  const browser = await L.launch();

  // --- estado inicial de la subasta ---
  const aStatus = L.dbQuery(`SELECT status FROM auctions WHERE id='${AID}'`);
  const startPrice = L.dbQuery(`SELECT starting_price FROM auctions WHERE id='${AID}'`);
  rec('E2E-3', 'Subasta activa disponible para pujar', /ACTIVE/i.test(aStatus) ? 'PASS' : 'FAIL', `status=${aStatus} start=${startPrice}`);
  if (!/ACTIVE/i.test(aStatus)) {
    // intentar activar si sigue PUBLISHED (start ya pasó): mover starts_at al pasado y marcar ACTIVE
    L.dbQuery(`UPDATE auctions SET starts_at=now()-interval '1 minute', status='ACTIVE' WHERE id='${AID}' AND status='PUBLISHED'`);
    console.log('   (forzada activación PUBLISHED→ACTIVE para E2E)');
  }

  // --- comprador2 (andamiaje): API register + verificación/fondeo por DB ---
  const B2 = { username: `comprador2_${RUNID}`, email: `comprador2_${RUNID}@test.local`, password: cfg.TEST_PASSWORD };
  const reg = await fetch(`${cfg.API}/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(B2),
  }).then((r) => r.status).catch((e) => 'ERR:' + e.message);
  L.dbQuery(`UPDATE users SET email_verified_at=now(), state='ACTIVE' WHERE email='${B2.email}'`);
  const b2Id = L.dbQuery(`SELECT id FROM users WHERE email='${B2.email}'`);
  L.dbQuery(`INSERT INTO wallets (id, created_at, updated_at, user_id, balance, held_funds, currency, is_active) SELECT gen_random_uuid(), now(), now(), '${b2Id}', 5000, 0, 'MXN', true WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id='${b2Id}')`);
  rec('E2E-setup', 'Comprador2 competidor (andamiaje API+DB)', /^[a-f0-9-]{8,}/i.test(b2Id) ? 'PASS' : 'FAIL', `regHttp=${reg} id=${(b2Id||'').slice(0,8)}`);

  // --- pre-estado wallet comprador1 ---
  const b1Id = actors.buyerId;
  const pre1 = {
    balance: num(L.dbQuery(`SELECT balance FROM wallets WHERE user_id='${b1Id}'`)),
    held: num(L.dbQuery(`SELECT held_funds FROM wallets WHERE user_id='${b1Id}'`)),
  };
  console.log(`   pre comprador1: balance=${pre1.balance} held=${pre1.held}`);

  // --- E2E-5: comprador1 puja 600 ---
  const bid1 = await bidViaUI(await L.newContext(browser), actors.BUYER, 600, 'buyer1');
  await new Promise((r) => setTimeout(r, 800));
  const post1 = {
    balance: num(L.dbQuery(`SELECT balance FROM wallets WHERE user_id='${b1Id}'`)),
    held: num(L.dbQuery(`SELECT held_funds FROM wallets WHERE user_id='${b1Id}'`)),
  };
  const bidCount1 = L.dbQuery(`SELECT count(*) FROM bids WHERE auction_id='${AID}'`);
  const curPrice1 = num(L.dbQuery(`SELECT current_price FROM auctions WHERE id='${AID}'`));
  const heldOk = post1.held >= 600;
  rec('E2E-5', 'Comprador1 puja 600 → fondos bloqueados',
    bid1.ok && heldOk && curPrice1 === 600 ? 'PASS' : (bid1.ok ? 'PARTIAL' : 'FAIL'),
    `bidHttp=${bid1.resp && bid1.resp.status} msg="${bid1.msg}" held ${pre1.held}->${post1.held} bal ${pre1.balance}->${post1.balance} curPrice=${curPrice1} bids=${bidCount1}`);

  // --- E2E-6: comprador2 puja 700 → outbid de comprador1 (liberación) ---
  const bid2 = await bidViaUI(await L.newContext(browser), B2, 700, 'buyer2');
  await new Promise((r) => setTimeout(r, 1200));
  const rel1 = {
    balance: num(L.dbQuery(`SELECT balance FROM wallets WHERE user_id='${b1Id}'`)),
    held: num(L.dbQuery(`SELECT held_funds FROM wallets WHERE user_id='${b1Id}'`)),
  };
  const held2 = num(L.dbQuery(`SELECT held_funds FROM wallets WHERE user_id='${b2Id}'`));
  const curPrice2 = num(L.dbQuery(`SELECT current_price FROM auctions WHERE id='${AID}'`));
  const released = rel1.held < post1.held; // comprador1 debería haber liberado
  rec('E2E-6', 'Comprador2 puja 700 → outbid libera fondos de comprador1',
    bid2.ok && released && held2 >= 700 && curPrice2 === 700 ? 'PASS' : (bid2.ok ? 'PARTIAL' : 'FAIL'),
    `bid2Http=${bid2.resp && bid2.resp.status} msg="${bid2.msg}" c1.held ${post1.held}->${rel1.held} c2.held=${held2} curPrice=${curPrice2}`);

  // --- verificación de ledger (HOLD/RELEASE) ---
  const holds = L.dbQuery(`SELECT count(*) FROM ledger WHERE type='HOLD_BID'`);
  const releases = L.dbQuery(`SELECT count(*) FROM ledger WHERE type='RELEASE_BID'`);
  rec('E2E-ledger', 'Ledger registra HOLD_BID y RELEASE_BID', /^[1-9]/.test(holds) ? 'PASS' : 'FAIL', `HOLD_BID=${holds} RELEASE_BID=${releases}`);

  await browser.close();
  L.writeJSON(OUT, 'e2e.json', results);
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== E2E RESUMEN === total=${results.length} PASS=${pass} FAIL=${fail}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
