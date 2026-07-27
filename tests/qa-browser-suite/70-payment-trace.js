// Fase 8 — Pago REAL por Mercado Pago con verificación de la traza (PT-080 / PT-085 / PT-086).
//
// Ejercita el camino completo del dinero contra la pasarela real y comprueba que queda el
// respaldo: se pide el depósito, se crea un cobro aprobado de verdad en Mercado Pago, se entrega
// la notificación firmada y se verifica que la traza contiene TODOS los pasos, que el pago quedó
// registrado en `payments`, y que ninguna credencial se persistió.
//
// Alcance: el checkout del comprador no se automatiza (es UI de Mercado Pago, fuera de nuestro
// control). El cobro se crea con la Orders API y tarjeta de prueba, que es el mismo pago real que
// generaría el checkout — lo que se verifica aquí es NUESTRO tratamiento de ese pago.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const L = require('./lib.js');
const cfg = L.cfg;
const { createOrder, esperarOrden } = require('./mp-orders.js');

const OUT = process.argv[2] || fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));
// Los actores guardan un objeto {username,email,password}; algunas fases usan solo el email.
const BUYER = typeof actors.BUYER === 'string' ? actors.BUYER : actors.BUYER.email;
const BUYER_PASS = (actors.BUYER && actors.BUYER.password) || cfg.TEST_PASSWORD;
const buyerId = actors.buyerId;

const API = 'http://localhost:3000/api/v1';
const AMOUNT = 137.4;
const ENV_PATH = 'C:/DevOps/Desarrollos/IronLoot/src/api/.env';

/** Pasos que la traza debe contener, en este orden. */
const PASOS_ESPERADOS = [
  'DEPOSIT_REQUESTED',
  'PROVIDER_CREATE',
  'NOTIFICATION_RECEIVED',
  'SIGNATURE_OK',
  'PROVIDER_CONFIRM',
  'CYCLE_DECISION',
  'WALLET_CREDITED',
];

const results = [];
function rec(id, desc, status, detail) {
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`[${status}] ${id.padEnd(12)} ${desc}${detail ? ' :: ' + detail : ''}`);
}

const readEnv = (k) => {
  const m = fs.readFileSync(ENV_PATH, 'utf8').match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : '';
};

const db = (sql) =>
  execSync(`docker exec ironloot-db psql -U ironloot -d ironloot_db -t -A -c "${sql}"`, {
    encoding: 'utf8',
  }).trim();

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: BUYER, password: BUYER_PASS }),
  });
  const j = await res.json();
  return j?.tokens?.accessToken || '';
}

/** Entrega la notificación firmada con el secret real, igual que haría Mercado Pago. */
async function notificar(paymentId) {
  const secret = readEnv('MERCADO_PAGO_WEBHOOK_SECRET');
  const ts = Date.now().toString();
  const requestId = crypto.randomUUID();
  const hash = crypto
    .createHmac('sha256', secret)
    .update(`id:${paymentId};request-id:${requestId};ts:${ts};`)
    .digest('hex');

  return fetch(`${API}/payments/webhook/MERCADO_PAGO?data.id=${paymentId}&type=payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-signature': `ts=${ts},v1=${hash}`,
      'x-request-id': requestId,
    },
    body: JSON.stringify({ type: 'payment', data: { id: String(paymentId) } }),
  });
}

(async () => {
  const token = await login();
  rec('QA-TR-00', 'Login comprador', token ? 'PASS' : 'FAIL', BUYER);
  if (!token) return finish();

  // ── 1. Solicitud de depósito ──
  const initRes = await fetch(`${API}/payments/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: AMOUNT, provider: 'MERCADO_PAGO' }),
  });
  const init = await initRes.json();
  const REF = init?.metadata?.orderId || '';
  rec('QA-TR-01', 'Solicitud de depósito crea el ciclo', REF ? 'PASS' : 'FAIL', `ref=${REF}`);
  if (!REF) return finish();

  const estadoCiclo = db(`SELECT status::text FROM payment_cycles WHERE reference='${REF}'`);
  rec(
    'QA-TR-02',
    'El ciclo nace en REQUESTED',
    estadoCiclo === 'REQUESTED' ? 'PASS' : 'FAIL',
    `status=${estadoCiclo}`,
  );

  // ── 2. Cobro REAL en Mercado Pago ──
  const orden = await createOrder({
    amount: AMOUNT,
    externalRef: REF,
    email: 'test_user_3130461747@testuser.com',
  });
  // PT-104 — Si Mercado Pago responde `processing`, la orden esta en curso, no fallida: se espera.
  // Antes se abandonaba aqui, y las doce comprobaciones de traza de mas abajo no corrian nunca.
  let estadoOrden = orden?.json?.status;
  if (estadoOrden === 'processing' && orden?.json?.id) {
    const resuelta = await esperarOrden(orden.json.id);
    estadoOrden = resuelta?.status || estadoOrden;
  }
  const aprobada = estadoOrden === 'processed';
  rec(
    'QA-TR-03',
    'Cobro real aprobado en Mercado Pago',
    aprobada ? 'PASS' : 'FAIL',
    `orden=${orden?.json?.id} status=${estadoOrden}`,
  );
  if (!aprobada) return finish();

  await new Promise((r) => setTimeout(r, 5000));

  // ── 3. Identificador canónico (PT-080: el numérico, no el de orden) ──
  const access = readEnv('MERCADO_PAGO_ACCESS_TOKEN');
  const busca = await fetch(
    `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(REF)}`,
    { headers: { Authorization: `Bearer ${access}` } },
  );
  const encontrados = (await busca.json())?.results || [];
  const pago = encontrados.find((p) => p.status === 'approved');
  rec('QA-TR-04', 'Pago canónico resuelto', pago ? 'PASS' : 'FAIL', `id=${pago?.id}`);
  if (!pago) return finish();

  // ── 4. Notificación firmada ──
  const wh = await notificar(pago.id);
  rec('QA-TR-05', 'Notificación firmada aceptada', wh.status < 300 ? 'PASS' : 'FAIL', `HTTP ${wh.status}`);
  await new Promise((r) => setTimeout(r, 2500));

  // ── 5. Acreditacion ──
  //
  // PT-104 (F-35) — Se mide el credito DE ESTE PAGO, no la diferencia de saldo.
  //
  // Restar saldos fallaba sin que nada estuviera roto: la via garantizada es asincrona por
  // diseno y puede acreditar OTRO deposito dentro de la ventana. Ocurrio: el delta observado fue
  // 458.90 = 321.50 (PayPal) + 137.40 (Mercado Pago), y la prueba acuso al sistema por hacer
  // exactamente lo que debe.
  //
  // `Payment.reference` es unica desde PT-087 y `ledger.reference_id` la guarda, asi que el
  // asiento de este pago se lee directamente. Es MAS estricto, no menos: comprueba que hay UN
  // solo asiento, con el importe exacto, que movio el saldo en ese importe y en el monedero
  // correcto — cosas que restar dos numeros no distingue.
  const asientos = Number(
    db(`SELECT count(*) FROM ledger WHERE type='DEPOSIT' AND reference_id='${REF}'`) || 0,
  );
  const acreditadoImporte = Number(
    db(`SELECT COALESCE(amount,0) FROM ledger WHERE type='DEPOSIT' AND reference_id='${REF}'`) || 0,
  );
  const movio = Number(
    db(`SELECT COALESCE(balance_after - balance_before,0) FROM ledger WHERE type='DEPOSIT' AND reference_id='${REF}'`) || 0,
  );
  const monederoCorrecto =
    db(`SELECT COALESCE(wallet_id::text,'') FROM ledger WHERE type='DEPOSIT' AND reference_id='${REF}'`) ===
    db(`SELECT COALESCE(id::text,'') FROM wallets WHERE user_id='${buyerId}'`);
  const acreditado =
    asientos === 1 &&
    Math.round(acreditadoImporte * 100) === Math.round(AMOUNT * 100) &&
    Math.round(movio * 100) === Math.round(AMOUNT * 100) &&
    monederoCorrecto;
  const detalleCredito = `asientos=${asientos} importe=${acreditadoImporte} movio=${movio} monedero=${monederoCorrecto}`;
  const saldoDespues = Number(db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`) || 0);
  rec(
    'QA-TR-06',
    'Wallet acreditado por el importe exacto',
    acreditado ? 'PASS' : 'FAIL',
    detalleCredito,
  );

  const ciclo = db(`SELECT status::text FROM payment_cycles WHERE reference='${REF}'`);
  rec('QA-TR-07', 'El ciclo queda SETTLED', ciclo === 'SETTLED' ? 'PASS' : 'FAIL', `status=${ciclo}`);

  // ── 6. Registro contable (PT-085: la tabla que antes estaba siempre vacía) ──
  const fila = db(
    `SELECT status||' '||amount FROM payments WHERE reference='${REF}'`,
  );
  rec('QA-TR-08', 'El pago queda registrado en payments', fila ? 'PASS' : 'FAIL', fila || 'sin fila');

  // ── 7. Traza completa (PT-086) ──
  const pasos = db(
    `SELECT string_agg(step, ',' ORDER BY received_at) FROM payment_cycle_events WHERE reference='${REF}' AND step IS NOT NULL`,
  ).split(',');

  const faltan = PASOS_ESPERADOS.filter((p) => !pasos.includes(p));
  rec(
    'QA-TR-09',
    'La traza contiene todos los pasos del pago',
    faltan.length === 0 ? 'PASS' : 'FAIL',
    faltan.length ? `faltan: ${faltan.join(', ')}` : `${pasos.length} pasos`,
  );

  const ordenOk =
    pasos.indexOf('DEPOSIT_REQUESTED') === 0 &&
    pasos.indexOf('WALLET_CREDITED') === pasos.length - 1;
  rec(
    'QA-TR-10',
    'La traza está en orden: empieza en la solicitud y termina en la acreditación',
    ordenOk ? 'PASS' : 'FAIL',
    pasos.join(' → '),
  );

  const salientes = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND direction='OUTBOUND' AND endpoint IS NOT NULL`,
  );
  rec(
    'QA-TR-11',
    'Las llamadas salientes registran su endpoint',
    Number(salientes) >= 2 ? 'PASS' : 'FAIL',
    `${salientes} llamadas`,
  );

  // ── 8. Seguridad: ninguna credencial persistida ──
  const secret = readEnv('MERCADO_PAGO_WEBHOOK_SECRET');
  const accessTok = readEnv('MERCADO_PAGO_ACCESS_TOKEN');
  const fuga = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND (payload::text LIKE '%${accessTok.slice(0, 20)}%' OR payload::text LIKE '%${secret.slice(0, 12)}%')`,
  );
  rec(
    'QA-TR-12',
    'Ninguna credencial quedó persistida en la traza',
    Number(fuga) === 0 ? 'PASS' : 'FAIL',
    `coincidencias=${fuga}`,
  );

  const marcados = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND redacted_fields IS NOT NULL`,
  );
  rec(
    'QA-TR-13',
    'Lo redactado quedó marcado, no borrado en silencio',
    Number(marcados) > 0 ? 'PASS' : 'FAIL',
    `${marcados} entradas con marca`,
  );

  // ── 9. Reentrega: no debe duplicar, y debe quedar registrada ──
  const wh2 = await notificar(pago.id);
  await new Promise((r) => setTimeout(r, 2000));
  const saldoFinal = Number(db(`SELECT balance FROM wallets WHERE user_id='${buyerId}'`) || 0);
  rec(
    'QA-TR-14',
    'La reentrega no acredita de nuevo',
    saldoFinal === saldoDespues ? 'PASS' : 'FAIL',
    `HTTP ${wh2.status} saldo=${saldoFinal}`,
  );

  const dup = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND outcome='DUPLICATE'`,
  );
  rec(
    'QA-TR-15',
    'La reentrega queda registrada como duplicada',
    Number(dup) > 0 ? 'PASS' : 'FAIL',
    `${dup} duplicadas`,
  );

  finish();

  function finish() {
    L.writeJSON(OUT, 'payment-trace.json', results);
    const pass = results.filter((r) => r.status === 'PASS').length;
    const fail = results.filter((r) => r.status === 'FAIL').length;
    console.log(`\n=== PAGO Y TRAZA RESUMEN === total=${results.length} PASS=${pass} FAIL=${fail}`);
  }
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
