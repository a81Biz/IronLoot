// Depósito real MP end-to-end: crea orden aprobada (Orders API) con external_reference=DEP-buyerId,
// luego entrega webhook firmado con el secret real → acreditación por el path real de la app.
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const { createOrder } = require('./mp-orders.cjs');
function readEnv(k) { const t = fs.readFileSync('C:/DevOps/Desarrollos/IronLoot/src/api/.env', 'utf8'); const m = t.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : ''; }
const SECRET = readEnv('MERCADO_PAGO_WEBHOOK_SECRET');
const LOCAL = 'http://localhost:3000';
function db(sql) { return execSync(`docker exec ironloot-db psql -U ironloot -d ironloot_db -t -A -c "${sql}"`, { encoding: 'utf8' }).trim(); }

async function deliverWebhook(paymentId) {
  const ts = Date.now().toString(), requestId = crypto.randomUUID();
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
  const r = await fetch(`${LOCAL}/api/v1/payments/webhook/MERCADO_PAGO?data.id=${paymentId}&type=payment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-signature': `ts=${ts},v1=${hash}`, 'x-request-id': requestId },
    body: JSON.stringify({ type: 'payment', data: { id: String(paymentId) } }),
  });
  return { status: r.status, body: await r.text().catch(() => '') };
}

(async () => {
  const amount = Number(process.argv[2]);
  const buyerId = process.argv[3];
  const email = process.argv[4] || 'test_user_3130461747@testuser.com';
  const ref = `DEP-${buyerId}-${Date.now()}`;
  const balBefore = db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`);
  console.log(`\n=== Depósito $${amount} (saldo antes: ${balBefore}) ===`);

  const o = await createOrder({ amount, externalRef: ref, email });
  if (o.http !== 201) { console.log('orden FALLÓ', JSON.stringify(o.json).slice(0, 300)); process.exit(1); }
  const pay = o.json.transactions.payments[0];
  console.log(`Orden MP: id=${o.json.id} status=${o.json.status}/${o.json.status_detail} paymentId=${pay.id} paid=${pay.paid_amount}`);

  // acreditar vía webhook firmado (path real). Entrego el ORDER id (formato ORD...)
  // que el handler resuelve por la Orders API.
  const wh = await deliverWebhook(o.json.id);
  console.log(`Webhook firmado → HTTP ${wh.status} ${wh.status >= 400 ? wh.body.slice(0, 120) : ''}`);
  await new Promise((r) => setTimeout(r, 1500));

  const balAfter = db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`);
  const led = db(`SELECT type||' '||amount FROM ledger WHERE wallet_id=(SELECT id FROM wallets WHERE user_id='${buyerId}') ORDER BY created_at DESC LIMIT 1`);
  console.log(`Wallet: ${balBefore} -> ${balAfter} | ledger: ${led}`);
  console.log(Number(balAfter) > Number(balBefore) ? '✅ ACREDITADO vía webhook' : '⚠️ webhook no acreditó (id no fetchable por v1/payments)');
  // guardar para diagnóstico
  fs.writeFileSync('C:/tmp/last_order.json', JSON.stringify(o.json));
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
