// Fase 7 — Retiro real del vendedor (PT-069..072) end-to-end.
// KYC (gate) → método bancario CLABE → liquidación (holdback→disponible) →
// solicitud de retiro (reserva, REAL) → admin aprueba (REAL) → admin marca PAID (REAL) →
// flujo de rechazo (REAL, reintegra). Headed. Cada paso es caso QA-WD-NN.
//
// Nota de alcance: el ORIGEN del dinero (venta cerrada + cron de liberación) se SIEMBRA en BD
// replicando el camino ya cubierto por pruebas unitarias (settlement.spec, withdrawals.service.spec).
// El SUBSISTEMA DE RETIRO en sí (solicitud→aprobación→pago→rechazo) se ejercita REAL vía API.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const cfg = L.cfg;

const OUT = process.argv[2] || fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '60-withdrawal'));
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));
const SELLER = actors.SELLER;
const sellerId = actors.sellerId;

const CLABE = '002010077777777771';       // CLABE válida (verificador correcto)
const CLABE_BAD = '002010077777777770';   // verificador incorrecto → debe rechazarse
const GROSS = 1000, COMMISSION = 100, NET = 900; // venta bruta, comisión 10%, neto al vendedor
const WD_AMOUNT = 500;                     // monto del retiro real
const API = 'http://localhost:3000/api/v1';
const ADMIN_HDR = { 'Content-Type': 'application/json', 'x-admin-key': 'dev-admin-key' };

const results = [];
function rec(id, desc, status, detail) {
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`[${status}] ${id.padEnd(12)} ${desc}${detail ? ' :: ' + detail : ''}`);
}
const shot = (page, name) => L.shot(page, DIR, name);
const num = (s) => parseFloat(String(s).replace(/[^0-9.\-]/g, '')) || 0;

// fetch autenticado como el vendedor, a través del BFF del CLIENT (inyecta el JWT desde la cookie)
async function sellerFetch(page, apiPath, method, body) {
  return page.evaluate(async ({ apiPath, method, body }) => {
    const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(apiPath, opts);
    let json = null; let text = '';
    try { json = await r.clone().json(); } catch { try { text = await r.text(); } catch {} }
    return { ok: r.ok, status: r.status, json, text };
  }, { apiPath, method, body });
}
async function adminApi(apiPath, method, body) {
  const r = await fetch(API + apiPath, { method, headers: ADMIN_HDR, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, json };
}
function walletRow() {
  const row = L.dbQuery(`SELECT balance||'|'||pending_balance||'|'||held_funds FROM wallets WHERE user_id='${sellerId}'`);
  const [balance, pending, held] = row.split('|');
  return { balance: num(balance), pending: num(pending), held: num(held) };
}

(async () => {
  const browser = await L.launch();
  const sc = await L.newContext(browser);
  const sl = await L.loginBase(sc, SELLER);
  if (!sl.ok) { rec('QA-WD-00', 'Login vendedor', 'FAIL', sl.error || 'login falló'); await finish(browser); return; }
  const p = sl.page;
  rec('QA-WD-00', 'Login vendedor', 'PASS', sl.url);

  // ── QA-WD-01: KYC aprobado (gate para retirar, RN-62) ──────────────────────
  const kyc = await sellerFetch(p, '/api/v1/kyc/me', 'GET');
  const approved = !!(kyc.json && kyc.json.approved);
  rec('QA-WD-01', 'KYC del vendedor APPROVED (gate de retiro)', approved ? 'PASS' : 'FAIL',
    `status=${kyc.json ? kyc.json.status : kyc.status} approved=${approved}`);

  // ── QA-WD-02: registrar método bancario (CLABE válida) + rechazo de CLABE inválida ──
  const badMethod = await sellerFetch(p, '/api/v1/wallet/payment-methods', 'POST',
    { bankName: 'BBVA', clabe: CLABE_BAD, holderName: 'Vendedor QA' });
  rec('QA-WD-02a', 'Rechazar CLABE con verificador inválido (RN-63)',
    badMethod.status === 400 ? 'PASS' : 'FAIL', `http=${badMethod.status}`);

  const method = await sellerFetch(p, '/api/v1/wallet/payment-methods', 'POST',
    { bankName: 'BBVA', clabe: CLABE, holderName: 'Vendedor QA', alias: 'Mi cuenta' });
  const methodOk = method.ok || method.status === 201;
  const dbClabe = L.dbQuery(`SELECT clabe FROM user_payment_methods WHERE user_id='${sellerId}' AND clabe='${CLABE}'`);
  rec('QA-WD-02b', 'Registrar cuenta bancaria (CLABE válida, RN-63)',
    methodOk && dbClabe === CLABE ? 'PASS' : 'FAIL', `http=${method.status} db.clabe=${dbClabe}`);

  // ── QA-WD-03: SEMBRAR liquidación de una venta → pendingBalance (holdback, RN-64) ──
  // Replica captureHeldFunds: el neto de la venta entra a pendingBalance (no disponible).
  L.dbQuery(`INSERT INTO wallets (id, created_at, updated_at, user_id, balance, held_funds, pending_balance, currency, is_active) SELECT gen_random_uuid(), now(), now(), '${sellerId}', 0, 0, 0, 'MXN', true WHERE NOT EXISTS (SELECT 1 FROM wallets WHERE user_id='${sellerId}')`);
  L.dbQuery(`UPDATE wallets SET is_active=true WHERE user_id='${sellerId}'`);
  const wBeforeSale = walletRow();
  L.dbQuery(
    `WITH w AS (SELECT id, pending_balance FROM wallets WHERE user_id='${sellerId}' LIMIT 1) ` +
    `INSERT INTO ledger (id, wallet_id, type, amount, balance_before, balance_after, reference_id, reference_type, description, created_at) ` +
    `SELECT gen_random_uuid(), w.id, 'CREDIT_SALE', ${NET}, w.pending_balance, w.pending_balance+${NET}, 'QA-WD-SALE', 'TEST', 'Venta QA neto a liquidacion (holdback)', now() FROM w`
  );
  L.dbQuery(`UPDATE wallets SET pending_balance=pending_balance+${NET} WHERE user_id='${sellerId}'`);
  const wAfterSale = walletRow();
  rec('QA-WD-03', `Venta liquidada a pendingBalance (holdback ${NET}, RN-64)`,
    wAfterSale.pending === wBeforeSale.pending + NET && wAfterSale.balance === wBeforeSale.balance ? 'PASS' : 'FAIL',
    `pending ${wBeforeSale.pending}→${wAfterSale.pending} · disponible ${wAfterSale.balance} (retenido, no retirable)`);

  // ── QA-WD-04: liberar liquidación (holdback → disponible) al vencer/entregar (RN-64) ──
  // Replica el cron releaseMaturedSettlements: pending→balance + asiento SETTLEMENT_RELEASE.
  const wBeforeRel = walletRow();
  L.dbQuery(
    `WITH w AS (SELECT id, balance FROM wallets WHERE user_id='${sellerId}' LIMIT 1) ` +
    `INSERT INTO ledger (id, wallet_id, type, amount, balance_before, balance_after, reference_id, reference_type, description, created_at) ` +
    `SELECT gen_random_uuid(), w.id, 'SETTLEMENT_RELEASE', ${NET}, w.balance, w.balance+${NET}, 'QA-WD-SALE', 'TEST', 'Liberacion de holdback (entrega/vencimiento disputa)', now() FROM w`
  );
  L.dbQuery(`UPDATE wallets SET balance=balance+${NET}, pending_balance=pending_balance-${NET} WHERE user_id='${sellerId}'`);
  const wAfterRel = walletRow();
  rec('QA-WD-04', 'Liberar holdback → saldo disponible (SETTLEMENT_RELEASE, RN-64)',
    wAfterRel.balance === wBeforeRel.balance + NET && wAfterRel.pending === wBeforeRel.pending - NET ? 'PASS' : 'FAIL',
    `disponible ${wBeforeRel.balance}→${wAfterRel.balance} · pending ${wAfterRel.pending}`);

  // Evidencia visual: wallet del vendedor
  await p.goto(cfg.CLIENT + '/wallet', { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(600);
  await shot(p, '01_seller_wallet');

  // ── QA-WD-05: solicitud de retiro (REAL) — reserva fondos (RN-65) ──────────
  const availBefore = walletRow().balance;
  const reqWd = await sellerFetch(p, '/api/v1/wallet/withdrawals', 'POST', { amount: WD_AMOUNT, paymentMethodId: CLABE });
  await new Promise((r) => setTimeout(r, 400));
  const wdId = L.dbQuery(`SELECT id FROM withdrawal_requests WHERE user_id='${sellerId}' ORDER BY created_at DESC LIMIT 1`);
  const wdStatus = L.dbQuery(`SELECT status FROM withdrawal_requests WHERE id='${wdId}'`);
  const availAfter = walletRow().balance;
  const ledgerWd = L.dbQuery(`SELECT type||' '||amount FROM ledger WHERE wallet_id=(SELECT id FROM wallets WHERE user_id='${sellerId}') AND type='WITHDRAWAL' ORDER BY created_at DESC LIMIT 1`);
  const reserved = availAfter === availBefore - WD_AMOUNT;
  rec('QA-WD-05', `Solicitud de retiro REAL reserva fondos (RN-65)`,
    (reqWd.ok || reqWd.status === 201) && /REQUESTED/i.test(wdStatus) && reserved ? 'PASS' : 'FAIL',
    `http=${reqWd.status} req=${wdId.slice(0, 8)} status=${wdStatus} disponible ${availBefore}→${availAfter} ledger=[${ledgerWd}]`);

  await p.goto(cfg.CLIENT + '/wallet/withdrawals', { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(600);
  await shot(p, '02_seller_withdrawals');

  // ── QA-WD-06: gate saldo insuficiente (RN-65) ─────────────────────────────
  const overReq = await sellerFetch(p, '/api/v1/wallet/withdrawals', 'POST', { amount: 999999, paymentMethodId: CLABE });
  rec('QA-WD-06', 'Rechazar retiro por saldo disponible insuficiente (gate)',
    overReq.status === 400 ? 'PASS' : 'FAIL', `http=${overReq.status}`);

  // ── QA-WD-07: admin ve la cola y APRUEBA (REAL, RN-66) ────────────────────
  const queue = await adminApi('/admin/withdrawals?status=REQUESTED', 'GET');
  const inQueue = Array.isArray(queue.json) && queue.json.some((w) => w.id === wdId);
  rec('QA-WD-07a', 'Admin ve la solicitud en la cola (GET /admin/withdrawals)',
    queue.status === 200 && inQueue ? 'PASS' : 'FAIL', `http=${queue.status} enCola=${inQueue} total=${Array.isArray(queue.json) ? queue.json.length : '?'}`);

  const appr = await adminApi(`/admin/withdrawals/${wdId}/approve`, 'PATCH', { adminUser: 'admin' });
  const statusAppr = L.dbQuery(`SELECT status FROM withdrawal_requests WHERE id='${wdId}'`);
  rec('QA-WD-07b', 'Admin APRUEBA el retiro (REQUESTED→APPROVED, RN-66)',
    appr.status < 300 && /APPROVED/i.test(statusAppr) ? 'PASS' : 'FAIL', `http=${appr.status} status=${statusAppr}`);

  // Evidencia: cola admin de retiros (si hay UI; si no, snapshot del JSON)
  const al = await L.adminLoginLib(await L.newContext(browser));
  if (al.ok) {
    await al.page.goto(cfg.ADMIN + '/', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await al.page.waitForTimeout(400);
    await shot(al.page, '03_admin_dashboard');
  }

  // ── QA-WD-08: admin marca PAGADO tras SPEI manual (REAL, RN-66) ───────────
  const balBeforePaid = walletRow().balance;
  const paid = await adminApi(`/admin/withdrawals/${wdId}/mark-paid`, 'PATCH', { adminUser: 'admin', reference: 'SPEI-QA-0001' });
  const rowPaid = L.dbQuery(`SELECT status||'|'||coalesce(payout_reference,'')||'|'||coalesce(paid_at::text,'') FROM withdrawal_requests WHERE id='${wdId}'`);
  const [stPaid, payRef] = rowPaid.split('|');
  const balAfterPaid = walletRow().balance;
  rec('QA-WD-08', 'Admin marca PAGADO tras SPEI manual (APPROVED→PAID, RN-66)',
    paid.status < 300 && /PAID/i.test(stPaid) && payRef.length > 0 && balAfterPaid === balBeforePaid ? 'PASS' : 'FAIL',
    `http=${paid.status} status=${stPaid} ref=${payRef} disponible=${balAfterPaid} (sin cambio, ya reservado)`);

  // ── QA-WD-09: flujo de RECHAZO reintegra fondos (REAL, RN-66) ─────────────
  const availB4Reject = walletRow().balance;
  const req2 = await sellerFetch(p, '/api/v1/wallet/withdrawals', 'POST', { amount: 200, paymentMethodId: CLABE });
  await new Promise((r) => setTimeout(r, 300));
  const wd2 = L.dbQuery(`SELECT id FROM withdrawal_requests WHERE user_id='${sellerId}' ORDER BY created_at DESC LIMIT 1`);
  const availAfterReq2 = walletRow().balance;             // reservado (−200)
  const rej = await adminApi(`/admin/withdrawals/${wd2}/reject`, 'PATCH', { adminUser: 'admin', reason: 'Datos bancarios a validar' });
  const st2 = L.dbQuery(`SELECT status FROM withdrawal_requests WHERE id='${wd2}'`);
  const availAfterReject = walletRow().balance;           // reintegrado (+200)
  const adj = L.dbQuery(`SELECT type||' '||amount FROM ledger WHERE wallet_id=(SELECT id FROM wallets WHERE user_id='${sellerId}') AND type='ADJUSTMENT' ORDER BY created_at DESC LIMIT 1`);
  rec('QA-WD-09', 'Rechazo de retiro reintegra fondos (→REJECTED + ADJUSTMENT, RN-66)',
    (req2.ok || req2.status === 201) && /REJECTED/i.test(st2) && availAfterReq2 === availB4Reject - 200 && availAfterReject === availB4Reject ? 'PASS' : 'FAIL',
    `status=${st2} disponible ${availB4Reject}→(reserva)${availAfterReq2}→(reintegro)${availAfterReject} ledger=[${adj}]`);

  await finish(browser);

  async function finish(browser) {
    await browser.close();
    L.writeJSON(OUT, 'withdrawal.json', results);
    const pass = results.filter((r) => r.status === 'PASS').length;
    const fail = results.filter((r) => r.status === 'FAIL').length;
    console.log(`\n=== RETIRO RESUMEN === total=${results.length} PASS=${pass} FAIL=${fail}`);
  }
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
