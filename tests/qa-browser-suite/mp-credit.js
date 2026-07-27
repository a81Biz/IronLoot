// Tras el pago del usuario en el checkout: busca el pago aprobado por external_reference,
// firma el webhook con el secret real y lo entrega a la API local → acreditación real.
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

function readEnv(key) {
  const t = fs.readFileSync('C:/DevOps/Desarrollos/IronLoot/src/api/.env', 'utf8');
  const m = t.match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
}
const ACCESS = readEnv('MERCADO_PAGO_ACCESS_TOKEN');
const SECRET = readEnv('MERCADO_PAGO_WEBHOOK_SECRET');
const MPAPI = 'https://api.mercadopago.com';
const LOCAL = 'http://localhost:3000';

function db(sql) {
  return execSync(`docker exec ironloot-db psql -U ironloot -d ironloot_db -t -A -c "${sql}"`, { encoding: 'utf8' }).trim();
}

async function findApprovedPayment(externalRef, tries = 30, delayMs = 6000) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${MPAPI}/v1/payments/search?external_reference=${encodeURIComponent(externalRef)}&sort=date_created&criteria=desc`, {
      headers: { Authorization: `Bearer ${ACCESS}` },
    });
    const j = await res.json();
    const results = j.results || [];
    const approved = results.find((p) => p.status === 'approved');
    const any = results[0];
    if (approved) return approved;
    process.stdout.write(`  [${i + 1}/${tries}] pagos=${results.length}${any ? ' ult.status=' + any.status : ''}\r`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

async function deliverSignedWebhook(paymentId) {
  const ts = Date.now().toString();
  const requestId = crypto.randomUUID();
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
  const url = `${LOCAL}/api/v1/payments/webhook/MERCADO_PAGO?data.id=${paymentId}&type=payment`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-signature': `ts=${ts},v1=${hash}`, 'x-request-id': requestId },
    body: JSON.stringify({ type: 'payment', data: { id: String(paymentId) } }),
  });
  return { status: res.status, body: await res.text().catch(() => '') };
}

(async () => {
  const externalRef = process.argv[2];
  const buyerId = process.argv[3];
  if (!externalRef || !buyerId) { console.error('uso: node mp-credit.js <external_reference> <buyerId>'); process.exit(1); }

  const balBefore = db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`);
  console.log(`Esperando pago aprobado para ${externalRef} ... (saldo actual: ${balBefore})`);
  const pay = await findApprovedPayment(externalRef);
  if (!pay) { console.log('\nNo se encontró pago aprobado (timeout). ¿Completaste el checkout?'); process.exit(2); }
  console.log(`\nPago aprobado: id=${pay.id} monto=${pay.transaction_amount} status=${pay.status} ext=${pay.external_reference}`);

  const wh = await deliverSignedWebhook(pay.id);
  console.log(`Webhook firmado entregado: HTTP ${wh.status}`);
  await new Promise((r) => setTimeout(r, 1500));

  const balAfter = db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`);
  const ledger = db(`SELECT type||' '||amount||' ref='||reference_id FROM ledger WHERE wallet_id=(SELECT id FROM wallets WHERE user_id='${buyerId}') ORDER BY created_at DESC LIMIT 1`);
  console.log(`Wallet: ${balBefore} -> ${balAfter}  | último ledger: ${ledger}`);
  const credited = Number(balAfter) > Number(balBefore);
  console.log(credited ? '✅ ACREDITADO' : '❌ NO acreditado (revisar logs)');
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
