const L = require('./lib.cjs');
const cfg = L.cfg; const fs = require('fs');
const act = JSON.parse(fs.readFileSync('C:/tmp/act.json', 'utf8'));

async function pageContent(ctx, url) {
  const p = await ctx.newPage();
  const resp = await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => null);
  await p.waitForTimeout(500);
  // filas de tablas / listas y texto clave
  const rows = await p.$$eval('table tbody tr, ul li, .card, .order, .bid-row', els =>
    els.map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 3)
  ).catch(() => []);
  const body = (await p.textContent('body').catch(() => '')).replace(/\s+/g, ' ');
  await p.close();
  return { http: resp ? resp.status() : null, rows, body };
}

(async () => {
  const b = await L.launch();
  // COMPRADOR
  const bc = await L.newContext(b);
  const bl = await L.loginBase(bc, act.buyer);
  console.log('=== COMPRADOR (login ' + (bl.ok ? 'OK' : 'FALLÓ') + ') ===');
  if (bl.ok) {
    for (const [name, path] of [['/orders (compras)', '/orders'], ['/auctions/won-auctions (ganadas)', '/auctions/won-auctions'], ['/my-bids (pujas)', '/my-bids']]) {
      const r = await pageContent(bc, cfg.CLIENT + path);
      const hint = /3000|PAID|pagad|Reloj|Superada|Ganando|600|700/i.test(r.body);
      console.log(`  ${name}: http=${r.http} filas=${r.rows.length} ¿datos visibles?=${hint}`);
      r.rows.slice(0, 2).forEach(x => console.log('      · ' + x.slice(0, 90)));
    }
  }
  // VENDEDOR
  const sc = await L.newContext(b);
  const sl = await L.loginBase(sc, act.seller);
  console.log('=== VENDEDOR (login ' + (sl.ok ? 'OK' : 'FALLÓ') + ') ===');
  if (sl.ok) {
    for (const [name, path] of [['/seller/auctions (mis subastas)', '/seller/auctions'], ['/seller/orders (ventas)', '/seller/orders']]) {
      const r = await pageContent(sc, cfg.CLIENT + path);
      const hint = /3000|PAID|pagad|Reloj|CLOSED|cerrad|vendid/i.test(r.body);
      console.log(`  ${name}: http=${r.http} filas=${r.rows.length} ¿datos visibles?=${hint}`);
      r.rows.slice(0, 2).forEach(x => console.log('      · ' + x.slice(0, 90)));
    }
  }
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
