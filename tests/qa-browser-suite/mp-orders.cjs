const fs = require('fs');
const crypto = require('crypto');
function readEnv(k) { const t = fs.readFileSync('C:/DevOps/Desarrollos/IronLoot/src/api/.env', 'utf8'); const m = t.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : ''; }
const ACCESS = readEnv('MERCADO_PAGO_ACCESS_TOKEN');
const PUBLIC = readEnv('MERCADO_PAGO_PUBLIC_KEY');
const API = 'https://api.mercadopago.com';
const CARD = { card_number: '5474925432670366', security_code: '123', expiration_month: 11, expiration_year: 2030, cardholder: { name: 'APRO', identification: { type: 'RFC', number: 'XAXX010101000' } } };

async function token() {
  const r = await fetch(`${API}/v1/card_tokens?public_key=${encodeURIComponent(PUBLIC)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CARD) });
  const j = await r.json(); if (!j.id) throw new Error('tok: ' + JSON.stringify(j).slice(0, 200)); return j.id;
}

async function createOrder({ amount, externalRef, email }) {
  const tk = await token();
  const body = {
    type: 'online',
    processing_mode: 'automatic',
    external_reference: externalRef,
    total_amount: amount.toFixed(2),
    payer: { email },
    transactions: {
      payments: [{
        amount: amount.toFixed(2),
        payment_method: { id: 'master', type: 'credit_card', token: tk, installments: 1 },
      }],
    },
  };
  const r = await fetch(`${API}/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS}`, 'X-Idempotency-Key': crypto.randomUUID() },
    body: JSON.stringify(body),
  });
  return { http: r.status, json: await r.json() };
}

if (require.main === module) {
  (async () => {
    const amount = Number(process.argv[2] || 500);
    const ref = process.argv[3] || 'TEST-ORDER-' + Date.now();
    const email = process.argv[4] || 'test_user_3130461747@testuser.com';
    const r = await createOrder({ amount, externalRef: ref, email });
    console.log('HTTP', r.http);
    console.log(JSON.stringify(r.json).slice(0, 700));
  })().catch((e) => { console.error('ERR', e.message); process.exit(1); });
}
module.exports = { createOrder, token };
