// PT-080.2 — Arnés de notificaciones de Mercado Pago.
//
// El arnés anterior (mp-deposit / mp-credit) solo sabía entregar en formato Webhooks y con el
// id de ORDEN. Esa carencia es la razón por la que F-02 (tres identificadores para un mismo
// pago) y F-05 (el adaptador rechaza el formato IPN) sobrevivieron a una verificación que se
// declaró exitosa. Esta herramienta entrega en los dos formatos documentados por Mercado Pago
// y con cualquiera de los identificadores.
//
// Uso:
//   node mp-notify.js webhook payment <id>  <buyerId>
//   node mp-notify.js ipn     payment <id>  <buyerId>
//   node mp-notify.js ipn     merchant_order <id> <buyerId>
//
//   webhook -> query `data.id`, cuerpo {id,type,action,data:{id}}, firmado con el secret
//   ipn     -> query `topic` + `id`, sin `data.id`, sin firma validable (asi lo documenta MP)

const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ENV = 'C:/DevOps/Desarrollos/IronLoot/src/api/.env';
const LOCAL = 'http://localhost:3000';

function readEnv(key) {
  const m = fs.readFileSync(ENV, 'utf8').match(new RegExp('^' + key + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : '';
}

function db(sql) {
  return execSync(`docker exec ironloot-db psql -U ironloot -d ironloot_db -t -A -c "${sql}"`, {
    encoding: 'utf8',
  }).trim();
}

/** Formato Webhooks: query data.id + cuerpo completo + x-signature validable. */
async function deliverWebhook(resourceType, resourceId) {
  const secret = readEnv('MERCADO_PAGO_WEBHOOK_SECRET');
  const ts = Date.now().toString();
  const requestId = crypto.randomUUID();
  const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
  const hash = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return fetch(
    `${LOCAL}/api/v1/payments/webhook/MERCADO_PAGO?data.id=${resourceId}&type=${resourceType}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': `ts=${ts},v1=${hash}`,
        'x-request-id': requestId,
      },
      body: JSON.stringify({
        id: Number(ts),
        type: resourceType,
        action: `${resourceType}.updated`,
        data: { id: String(resourceId) },
      }),
    },
  );
}

/** Formato IPN: query topic + id. Sin data.id. MP documenta que su firma no es validable. */
async function deliverIpn(topic, resourceId) {
  return fetch(`${LOCAL}/api/v1/payments/webhook/MERCADO_PAGO?topic=${topic}&id=${resourceId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, id: resourceId }),
  });
}

(async () => {
  const [format, resourceType, resourceId, buyerId] = process.argv.slice(2);

  if (!format || !resourceType || !resourceId) {
    console.error('uso: node mp-notify.js <webhook|ipn> <payment|order|merchant_order> <id> [buyerId]');
    process.exit(1);
  }

  const before = buyerId ? db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`) : 'n/a';
  const reservasBefore = db('SELECT count(*) FROM processed_webhook_events');
  console.log(`formato=${format} recurso=${resourceType} id=${resourceId}`);
  console.log(`saldo antes=${before}  reservas antes=${reservasBefore}`);

  const res = format === 'ipn'
    ? await deliverIpn(resourceType, resourceId)
    : await deliverWebhook(resourceType, resourceId);

  const body = (await res.text().catch(() => '')).slice(0, 200);
  console.log(`\nHTTP ${res.status}  ${body}`);

  await new Promise((r) => setTimeout(r, 1500));

  const after = buyerId ? db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`) : 'n/a';
  const reservasAfter = db('SELECT count(*) FROM processed_webhook_events');
  console.log(`saldo despues=${after}  reservas despues=${reservasAfter}`);

  if (buyerId) {
    const acredito = Number(after) > Number(before);
    console.log(acredito ? '=> ACREDITO' : '=> no acredito');
  }
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
