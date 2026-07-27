// Fase 9 — Pago REAL por PayPal acreditado por la VIA GARANTIZADA (PT-076 / PT-087).
//
// La diferencia con la fase 70 es el punto: aqui **no hay notificacion**. El comprador aprueba
// en el checkout real de PayPal y nadie avisa a la API — igual que en desarrollo, donde PayPal
// no puede alcanzar un contenedor local. Lo que se verifica es que el dinero llega igual, por
// consulta periodica, y que queda traza de todo el recorrido.
//
// Y hay una diferencia de fondo con Mercado Pago: en Orders v2 el dinero **no se mueve al
// aprobar**. Una orden APPROVED esta autorizada pero sin cobrar. Por eso la via garantizada de
// PayPal captura, no solo consulta.
//
// Requisitos: PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_WEBHOOK_ID en `src/api/.env`, y
// una cuenta **personal** de sandbox en `paypal-sandbox.json` (la business da CANNOT_PAY_SELF).
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');
const L = require('./lib.cjs');
const cfg = L.cfg;

const OUT = process.argv[2] || fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));
const BUYER = typeof actors.BUYER === 'string' ? actors.BUYER : actors.BUYER.email;
const BUYER_PASS = (actors.BUYER && actors.BUYER.password) || cfg.TEST_PASSWORD;
const buyerId = actors.buyerId;

const API = 'http://localhost:3000/api/v1';
const AMOUNT = 321.5;
const ENV_PATH = 'C:/DevOps/Desarrollos/IronLoot/src/api/.env';
const SANDBOX_PATH = path.join(__dirname, 'paypal-sandbox.json');

/** Pasos que la traza debe contener. No hay NOTIFICATION_RECEIVED: ese es el punto. */
const PASOS_ESPERADOS = [
  'DEPOSIT_REQUESTED',
  'PROVIDER_CREATE',
  'PROVIDER_CONFIRM',
  'POLL_ATTEMPT',
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
  return (await res.json())?.tokens?.accessToken || '';
}

/** Aprueba la orden en el checkout real de PayPal con una cuenta personal de sandbox. */
async function aprobarEnNavegador(url, sandbox) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(6000);

    const loginBtn = page.locator('#btnLogin, [data-testid="login-button"]').first();
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click();
      await page.waitForTimeout(4000);
    }

    const email = page.locator('#email, input[name="login_email"]').first();
    await email.waitFor({ timeout: 30000 });
    await email.fill(sandbox.email);

    const next = page.locator('#btnNext').first();
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(4000);
    }

    const pass = page.locator('#password, input[name="login_password"]').first();
    await pass.waitFor({ timeout: 30000 });
    await pass.fill(sandbox.password);
    await page.locator('#btnLogin, [data-testid="submit-button-initial"]').first().click();
    await page.waitForTimeout(12000);

    // Si PayPal muestra el resumen, se confirma; si ya volvio al comercio, no hace falta.
    const pay = page
      .locator('#payment-submit-btn, [data-testid="submit-button-initial"]')
      .first();
    if (await pay.isVisible().catch(() => false)) {
      await pay.click();
      await page.waitForTimeout(12000);
    }
  } finally {
    await browser.close();
  }
}

/** Consulta el estado de la orden directamente en PayPal. */
async function ordenEnPaypal(orderId) {
  const basic = Buffer.from(
    `${readEnv('PAYPAL_CLIENT_ID')}:${readEnv('PAYPAL_CLIENT_SECRET')}`,
  ).toString('base64');
  const base =
    readEnv('PAYPAL_MODE') === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  const tok = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  }).then((r) => r.json());

  return fetch(`${base}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  }).then((r) => r.json());
}

(async () => {
  if (!fs.existsSync(SANDBOX_PATH)) {
    rec('QA-PP-00', 'Cuenta personal de sandbox configurada', 'SKIP', `falta ${SANDBOX_PATH}`);
    return finish();
  }
  const sandbox = JSON.parse(fs.readFileSync(SANDBOX_PATH, 'utf8'));

  const token = await login();
  rec('QA-PP-00', 'Login comprador', token ? 'PASS' : 'FAIL', BUYER);
  if (!token) return finish();

  // ── 1. PayPal se ofrece ──
  const provs = await fetch(`${API}/payments/providers`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const ofrecido = (provs?.providers || []).includes('PAYPAL');
  rec('QA-PP-01', 'PayPal se ofrece al usuario', ofrecido ? 'PASS' : 'FAIL', JSON.stringify(provs));
  if (!ofrecido) return finish();

  // ── 2. Solicitud ──
  const init = await fetch(`${API}/payments/initiate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: AMOUNT, provider: 'PAYPAL' }),
  }).then((r) => r.json());

  const REF = init?.metadata?.orderId || '';
  const ORDER = init?.metadata?.paypalOrderId || '';
  rec('QA-PP-02', 'La solicitud crea la orden en PayPal', ORDER ? 'PASS' : 'FAIL', `orden=${ORDER}`);
  if (!ORDER) return finish();

  // ── 3. El id de la pasarela queda guardado: sin el, PayPal no puede sondear ──
  const guardado = db(`SELECT COALESCE(provider_ref,'') FROM payment_cycles WHERE reference='${REF}'`);
  rec(
    'QA-PP-03',
    'El id de la orden queda guardado en el ciclo',
    guardado === ORDER ? 'PASS' : 'FAIL',
    `provider_ref=${guardado || 'NULL'}`,
  );

  // ── 4. La creacion deja traza ──
  const trazaCreacion = db(
    `SELECT COALESCE(http_status::text,'') FROM payment_cycle_events WHERE reference='${REF}' AND step='PROVIDER_CREATE'`,
  );
  rec(
    'QA-PP-04',
    'La creacion de la orden deja traza con su estado HTTP',
    trazaCreacion ? 'PASS' : 'FAIL',
    `HTTP ${trazaCreacion || 'sin entrada'}`,
  );

  // ── 5. Aprobacion real del comprador, SIN notificacion a la API ──
  await aprobarEnNavegador(init.redirectUrl, sandbox);
  const orden = await ordenEnPaypal(ORDER);
  const aprobada = orden?.status === 'APPROVED' || orden?.status === 'COMPLETED';
  rec('QA-PP-05', 'El comprador aprueba en el checkout real', aprobada ? 'PASS' : 'FAIL', `status=${orden?.status}`);
  if (!aprobada) return finish();

  // ── 6. Nadie notifico: la via garantizada debe acreditar sola ──
  const notificaciones = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND step='NOTIFICATION_RECEIVED'`,
  );
  rec(
    'QA-PP-06',
    'Ninguna notificacion llego (es el escenario que se prueba)',
    Number(notificaciones) === 0 ? 'PASS' : 'FAIL',
    `${notificaciones} notificaciones`,
  );

  let estado = '';
  for (let i = 0; i < 18; i++) {
    estado = db(`SELECT status::text FROM payment_cycles WHERE reference='${REF}'`);
    if (estado === 'SETTLED') break;
    await new Promise((r) => setTimeout(r, 10000));
  }
  rec('QA-PP-07', 'La via garantizada cierra el ciclo sin notificacion', estado === 'SETTLED' ? 'PASS' : 'FAIL', `status=${estado}`);

  // ── 7. Capturo de verdad: en Orders v2 aprobar no mueve el dinero ──
  const capturada = await ordenEnPaypal(ORDER);
  rec(
    'QA-PP-08',
    'El sondeo CAPTURA la orden aprobada, no solo la consulta',
    capturada?.status === 'COMPLETED' ? 'PASS' : 'FAIL',
    `status=${capturada?.status}`,
  );

  // ── 8. El dinero ──
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
  // El saldo se sigue leyendo: QA-PP-16 comprueba que NO cambia tras el webhook fabricado, y eso
  // si es una comparacion legitima de saldos — mide que no pasa nada, no que pase algo concreto.
  const saldoDespues = Number(
    db(`SELECT COALESCE(balance,0) FROM wallets WHERE user_id='${buyerId}'`) || 0,
  );
  const acreditado =
    asientos === 1 &&
    Math.round(acreditadoImporte * 100) === Math.round(AMOUNT * 100) &&
    Math.round(movio * 100) === Math.round(AMOUNT * 100) &&
    monederoCorrecto;
  const detalleCredito = `asientos=${asientos} importe=${acreditadoImporte} movio=${movio} monedero=${monederoCorrecto}`;
  rec(
    'QA-PP-09',
    'El monedero se acredita por el importe exacto',
    acreditado ? 'PASS' : 'FAIL',
    detalleCredito,
  );

  const filas = db(`SELECT count(*) FROM payments WHERE reference='${REF}'`);
  rec(
    'QA-PP-10',
    'El asiento contable existe y es UNO solo',
    Number(filas) === 1 ? 'PASS' : 'FAIL',
    `${filas} filas`,
  );

  // ── 9. Traza ──
  const pasos = db(
    `SELECT COALESCE(string_agg(DISTINCT step, ','),'') FROM payment_cycle_events WHERE reference='${REF}' AND step IS NOT NULL`,
  ).split(',');
  const faltan = PASOS_ESPERADOS.filter((p) => !pasos.includes(p));
  rec(
    'QA-PP-11',
    'La traza contiene todos los pasos del recorrido',
    faltan.length === 0 ? 'PASS' : 'FAIL',
    faltan.length ? `faltan: ${faltan.join(', ')}` : `${pasos.length} pasos`,
  );

  const etiquetados = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND provider <> 'PAYPAL'`,
  );
  rec(
    'QA-PP-12',
    'Toda la traza se atribuye a PAYPAL, no a otra pasarela',
    Number(etiquetados) === 0 ? 'PASS' : 'FAIL',
    `${etiquetados} entradas mal atribuidas`,
  );

  const captura = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND endpoint LIKE '%/capture'`,
  );
  rec('QA-PP-13', 'La captura queda registrada con su endpoint', Number(captura) > 0 ? 'PASS' : 'FAIL', `${captura} llamadas`);

  // ── 10. Seguridad ──
  const cid = readEnv('PAYPAL_CLIENT_ID').slice(0, 20);
  const sec = readEnv('PAYPAL_CLIENT_SECRET').slice(0, 20);
  const fuga = db(
    `SELECT count(*) FROM payment_cycle_events WHERE reference='${REF}' AND (payload::text LIKE '%${cid}%' OR payload::text LIKE '%${sec}%' OR payload::text ILIKE '%bearer %')`,
  );
  rec('QA-PP-14', 'Ninguna credencial de PayPal quedo persistida', Number(fuga) === 0 ? 'PASS' : 'FAIL', `coincidencias=${fuga}`);

  // ── 11. Firma invalida: 401, nunca 500 ──
  const falso = await fetch(`${API}/payments/webhook/PAYPAL`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-transmission-id': 'falso-1',
      'paypal-transmission-time': new Date().toISOString(),
      'paypal-transmission-sig': 'ZmFsc2E=',
    },
    body: JSON.stringify({ id: 'WH-FALSO', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: ORDER } }),
  });
  rec('QA-PP-15', 'Un webhook fabricado se rechaza con 401', falso.status === 401 ? 'PASS' : 'FAIL', `HTTP ${falso.status}`);

  // ── 12. Una reentrega no acredita de nuevo ──
  const saldoFinal = Number(db(`SELECT COALESCE(balance,0) FROM wallets WHERE user_id='${buyerId}'`) || 0);
  rec('QA-PP-16', 'El saldo no cambia tras el intento fabricado', saldoFinal === saldoDespues ? 'PASS' : 'FAIL', `saldo=${saldoFinal}`);

  finish();

  function finish() {
    L.writeJSON(OUT, 'paypal-guaranteed.json', results);
    const pass = results.filter((r) => r.status === 'PASS').length;
    const fail = results.filter((r) => r.status === 'FAIL').length;
    const skip = results.filter((r) => r.status === 'SKIP').length;
    console.log(`\n=== PAYPAL VIA GARANTIZADA === total=${results.length} PASS=${pass} FAIL=${fail} SKIP=${skip}`);
  }
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
