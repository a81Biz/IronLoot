// E2E-6 aislado: comprador2 puja 700 → outbid de comprador1 (liberación de fondos).
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const cfg = L.cfg;
const OUT = fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '30-e2e'));
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));
const AID = actors.auctionId;
const RUNID = actors.runid;
const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

(async () => {
  const B2 = { email: `comprador2_${RUNID}@test.local`, password: cfg.TEST_PASSWORD };
  const b2Id = L.dbQuery(`SELECT id FROM users WHERE email='${B2.email}'`);
  L.dbQuery(`UPDATE users SET email_verified_at=now(), state='ACTIVE' WHERE email='${B2.email}'`);
  const b1Id = actors.buyerId;
  const pre1held = num(L.dbQuery(`SELECT held_funds FROM wallets WHERE user_id='${b1Id}'`));
  const pre1bal = num(L.dbQuery(`SELECT balance FROM wallets WHERE user_id='${b1Id}'`));
  console.log(`pre comprador1: held=${pre1held} bal=${pre1bal}`);

  const browser = await L.launch();
  const ctx = await L.newContext(browser);
  const lg = await L.loginBase(ctx, B2);
  if (!lg.ok) { console.log('login buyer2 FAIL', lg.error); await browser.close(); process.exit(1); }
  const p = lg.page;
  let bidResp = { status: 0 };
  p.on('response', async (r) => {
    if (/\/auctions\/[^/]+\/bids$/.test(r.url()) && r.request().method() === 'POST') {
      bidResp.status = r.status(); try { bidResp.body = (await r.text()).slice(0, 160); } catch {}
    }
  });
  await p.goto(`${cfg.CLIENT}/auctions/${AID}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(600);
  await L.fillWhenReady(p, '#bidAmount', '700');
  await L.shot(p, 'buyer2_before_bid');
  await p.click('#bidForm button[type=submit]');
  await p.waitForTimeout(2000);
  const msg = ((await p.textContent('#bidMsg').catch(() => '')) || '').trim();
  await L.shot(p, 'buyer2_after_bid');
  await browser.close();

  await new Promise((r) => setTimeout(r, 1000));
  const post1held = num(L.dbQuery(`SELECT held_funds FROM wallets WHERE user_id='${b1Id}'`));
  const post1bal = num(L.dbQuery(`SELECT balance FROM wallets WHERE user_id='${b1Id}'`));
  const held2 = num(L.dbQuery(`SELECT held_funds FROM wallets WHERE user_id='${b2Id}'`));
  const curPrice = num(L.dbQuery(`SELECT current_price FROM auctions WHERE id='${AID}'`));
  const holds = L.dbQuery(`SELECT count(*) FROM ledger WHERE type='HOLD_BID'`);
  const releases = L.dbQuery(`SELECT count(*) FROM ledger WHERE type='RELEASE_BID'`);
  const released = post1held < pre1held && post1bal > pre1bal;
  const ok = bidResp.status === 201 && released && held2 >= 700 && curPrice === 700;
  console.log(`bidHttp=${bidResp.status} msg="${msg}"`);
  console.log(`comprador1: held ${pre1held}->${post1held}  bal ${pre1bal}->${post1bal}  (liberado=${released})`);
  console.log(`comprador2: held=${held2}  curPrice=${curPrice}`);
  console.log(`ledger HOLD_BID=${holds} RELEASE_BID=${releases}`);

  const rec = {
    id: 'E2E-6', desc: 'Comprador2 puja 700 → outbid libera fondos de comprador1',
    status: ok ? 'PASS' : 'FAIL',
    detail: `bidHttp=${bidResp.status} c1.held ${pre1held}->${post1held} c1.bal ${pre1bal}->${post1bal} c2.held=${held2} curPrice=${curPrice} RELEASE_BID=${releases}`,
  };
  // fusionar en e2e.json
  const f = path.join(OUT, 'e2e.json');
  const arr = JSON.parse(fs.readFileSync(f, 'utf8'));
  const i = arr.findIndex((x) => x.id === 'E2E-6'); if (i >= 0) arr[i] = rec; else arr.push(rec);
  const li = arr.findIndex((x) => x.id === 'E2E-ledger');
  if (li >= 0) arr[li] = { id: 'E2E-ledger', desc: 'Ledger registra HOLD_BID y RELEASE_BID', status: /^[1-9]/.test(holds) && /^[1-9]/.test(releases) ? 'PASS' : 'PARTIAL', detail: `HOLD_BID=${holds} RELEASE_BID=${releases}` };
  fs.writeFileSync(f, JSON.stringify(arr, null, 2));
  console.log(`\n[${rec.status}] E2E-6 ${rec.detail}`);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
