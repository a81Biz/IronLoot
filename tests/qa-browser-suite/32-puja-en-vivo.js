// Fase 32 — PT-102 (F-34): la puja en vivo llega al OTRO navegador.
//
// Lo que ninguna guarda estática puede prometer: que un usuario vea subir el precio sin recargar.
// La suite probaba la puja por HTTP (E2E-5/E2E-6) y ambos pasaban con el producto roto — nadie
// comprobaba que el segundo navegador se enterase. Ese era el hueco por el que se coló F-34.
const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const cfg = L.cfg;
const OUT = fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));

const R = [];
const rec = (id, desc, ok, detail) => {
  R.push({ id, desc, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${id.padEnd(9)} ${desc}${detail ? ' :: ' + detail : ''}`);
};
const num = (s) => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

(async () => {
  const AID = actors.auctionId;

  // A observa; B puja. **B no puede ser quien ya va ganando**: pujar contra uno mismo se rechaza,
  // con razón, y ese 400 se confunde con un fallo del feed —pasó durante el diagnóstico de F-34—.
  // Por eso el pujador se elige mirando quién lidera ahora, y no por una posición fija: así la
  // fase se puede repetir sin dejarla inservible para la siguiente corrida.
  const comprador1 = actors.BUYER;
  const comprador2 = { email: `comprador2_${actors.runid}@test.local`, password: cfg.TEST_PASSWORD };
  // El SQL va en UNA linea: partido en varias, `psql -c` pierde el ORDER BY/LIMIT y devuelve
  // todas las filas — lo que hacia elegir al pujador equivocado y daba un 400 desconcertante.
  const lider = L.dbQuery(
    `SELECT u.email FROM bids b JOIN users u ON u.id = b.bidder_id WHERE b.auction_id='${AID}' ORDER BY b.amount DESC LIMIT 1`,
  )
    .trim()
    .split('\n')[0]
    .trim();
  const [A, B] =
    lider === comprador1.email ? [comprador1, comprador2] : [comprador2, comprador1];
  console.log(`lidera "${lider || '(nadie)'}" → observa ${A.email}, puja ${B.email}`);

  // Reabrir la subasta: las fases anteriores la dejan cerrada.
  L.dbQuery(
    `UPDATE auctions SET status='ACTIVE', ends_at=now() + interval '30 minutes' WHERE id='${AID}'`,
  );
  const precioInicial = num(L.dbQuery(`SELECT current_price FROM auctions WHERE id='${AID}'`));
  const bId = L.dbQuery(`SELECT id FROM users WHERE email='${B.email}'`);
  L.dbQuery(`UPDATE wallets SET balance=99999, held_funds=0 WHERE user_id='${bId}'`);
  const monto = precioInicial + 250;
  console.log(`subasta ${AID.slice(0, 8)} ACTIVE precio=${precioInicial} → B pujara ${monto}`);

  const browser = await L.launch();

  // ── Navegador A: mira y no toca ──────────────────────────────────────
  const ctxA = await L.newContext(browser);
  const lgA = await L.loginBase(ctxA, A);
  if (!lgA.ok) throw new Error('login A: ' + lgA.error);
  const pA = lgA.page;

  const sockets = [];
  const csp = [];
  pA.on('websocket', (ws) => sockets.push(ws.url()));
  pA.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) csp.push(m.text().slice(0, 110));
  });

  await pA.goto(`${cfg.CLIENT}/auctions/${AID}`, { waitUntil: 'load', timeout: 60000 });
  await pA.waitForTimeout(6000);

  const estado = await pA.evaluate(() => ({
    url: location.href,
    hayForm: !!document.querySelector('#bidForm'),
    precio: document.getElementById('currentPrice')?.textContent?.trim() || '',
    cuenta: document.getElementById('countdown')?.textContent?.trim() || '',
  }));

  rec('V-LIVE-1', 'La pagina de detalle carga para A',
      estado.hayForm && !estado.url.includes('/login'), estado.url.slice(-44));

  rec('V-LIVE-2', 'A abre el WebSocket contra su propio dominio',
      sockets.length > 0 && !/localhost:\d/.test(sockets[0]),
      sockets.length ? new URL(sockets[0]).host : 'NINGUN socket abierto');

  rec('V-LIVE-5', 'La cuenta atras sigue viva tras defer',
      /\d/.test(estado.cuenta) && !/NaN/.test(estado.cuenta), `"${estado.cuenta}"`);

  const pujasAntes = await pA.evaluate(
    () => document.querySelectorAll('#bidList li').length,
  );

  // ── Navegador B: puja por el formulario, como una persona ────────────
  const ctxB = await L.newContext(browser);
  const lgB = await L.loginBase(ctxB, B);
  if (!lgB.ok) throw new Error('login B: ' + lgB.error);
  const pB = lgB.page;

  let bid = { status: 0 };
  pB.on('response', async (r) => {
    if (/\/auctions\/[^/]+\/bids$/.test(r.url()) && r.request().method() === 'POST') {
      bid.status = r.status();
      try { bid.body = (await r.text()).slice(0, 120); } catch { /* cuerpo opcional */ }
    }
  });

  await pB.goto(`${cfg.CLIENT}/auctions/${AID}`, { waitUntil: 'load', timeout: 60000 });
  await pB.waitForTimeout(2500);
  await L.fillWhenReady(pB, '#bidAmount', String(monto));
  await pB.click('#bidForm button[type=submit]');
  await pB.waitForTimeout(4000);
  const msgB = ((await pB.textContent('#bidMsg').catch(() => '')) || '').trim();

  rec('V-LIVE-0', `B puja ${monto} desde el formulario`,
      bid.status > 0 && bid.status < 400, `HTTP ${bid.status} "${msgB.slice(0, 44)}"`);

  // ── ¿Se enteró A, sin recargar? ──────────────────────────────────────
  // Espera activa: nunca un sleep fijo. Lo que se mide es que llegue, no cuándo.
  let precioA = estado.precio;
  let propagado = false;
  for (let i = 0; i < 15 && !propagado; i++) {
    await pA.waitForTimeout(1000);
    precioA = await pA.evaluate(
      () => document.getElementById('currentPrice')?.textContent?.trim() || '',
    );
    propagado = num(precioA) >= monto;
  }

  rec('V-LIVE-3', 'A ve subir el precio SIN recargar', propagado,
      `"${estado.precio}" -> "${precioA}" (esperado >= ${monto})`);

  const pujasDespues = await pA.evaluate(
    () => document.querySelectorAll('#bidList li').length,
  );
  rec('V-LIVE-4', 'La lista de pujas de A crece', pujasDespues > pujasAntes,
      `${pujasAntes} -> ${pujasDespues}`);

  rec('V-LIVE-6', 'Cero violaciones de CSP en el recorrido', csp.length === 0,
      csp[0] || '0 violaciones');

  const enBD = num(L.dbQuery(`SELECT current_price FROM auctions WHERE id='${AID}'`));
  rec('V-LIVE-7', 'La puja quedo asentada en la base', enBD >= monto, `current_price=${enBD}`);

  await L.shot(pA, 'live_a_despues_de_la_puja');
  await browser.close();

  fs.writeFileSync(path.join(OUT, 'puja-en-vivo.json'), JSON.stringify(R, null, 2));
  const fallos = R.filter((x) => x.status !== 'PASS');
  console.log(`\n=== FASE 32 === total=${R.length} PASS=${R.length - fallos.length} FAIL=${fallos.length}`);
  if (fallos.length) process.exitCode = 1;
})().catch((e) => {
  console.error('FATAL', e.message ? e.message.slice(0, 300) : e);
  process.exit(1);
});
