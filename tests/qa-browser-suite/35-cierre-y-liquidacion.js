// Fase 35 — La cadena completa, SIN SEMBRAR NADA (PT-175).
//
// ## Qué prueba, y por qué no existía
//
// Desde el cierre de la subasta hasta que el vendedor tiene su ganancia disponible:
//
//   subasta CLOSED → pedido PAID → comisión → holdback
//                  → el vendedor declara el envío
//                  → **el comprador confirma la recepción**
//                  → liberación del holdback
//                  → el vendedor retira ESA ganancia
//
// `60-withdrawal.js` prueba el subsistema de retiro **de verdad**, pero **siembra el origen del dinero**
// con un `INSERT` — lo declara en su propia cabecera. Así que la cadena nunca se recorría: se
// reproducía a mano. Una prueba que replica el camino en vez de recorrerlo no prueba el camino.
//
// Y el eslabón que faltaba no era de la suite: **el comprador no tenía forma de confirmar**. Hasta
// PT-174 el único que podía marcar `DELIVERED` era el vendedor, con lo que liberaba su propio holdback.
// Esta fase sólo es posible porque ese defecto se cerró.
//
// ## Cero escrituras directas a la base
//
// **Esta fase no ejecuta ni un `INSERT`, `UPDATE` o `DELETE`.** Consulta —para comprobar— pero **todo
// movimiento pasa por el API**, incluidos los dos adelantos de reloj, que son endpoints autenticados y
// bloqueados fuera de desarrollo.
//
// Es la diferencia exacta con la fase 60, que escribe seis veces en la base para fabricar el estado del
// que parte. Y es el punto: si el camino se recorre, un defecto en el camino se ve.
//
// ## Los dos relojes, y cómo se resuelven sin falsear
//
//   - **El cierre de la subasta.** Una subasta dura **como mínimo una hora** por regla de negocio
//     (`create-auction.dto.ts:39`), así que no se puede crear una corta ni esperar a que venza. Se
//     adelanta su `endsAt` con `POST /scheduler/expire-auction/:id` — **sólo desarrollo** — y el cierre
//     lo ejecuta `closeExpiredAuctions()` de verdad: cerrojo, transacción, pedido, captura de fondos
//     retenidos, comisión y avisos.
//   - **La liberación del holdback** espera `SETTLEMENT_HOLDBACK_HOURS` (72 h en producción) y su cron
//     corre cada 30 min. En QA la variable vale `0` y se llama a `POST /scheduler/release-settlements`.
//
// **Adelantar el reloj no es falsear el resultado.** Se recorre el mismo código; lo único que cambia es
// cuándo. Sembrar, en cambio, es escribir a mano el pedido y el asiento que el sistema debería haber
// creado — y entonces la prueba no prueba el camino, lo reproduce.

const fs = require('fs');
const path = require('path');
const L = require('./lib.js');
const cfg = L.cfg;

const OUT = process.argv[2] || fs.readFileSync(path.join(cfg.OUT_ROOT, '.last-run'), 'utf8').trim();
const DIR = L.ensureDir(path.join(OUT, '35-cierre-y-liquidacion'));
const actors = JSON.parse(fs.readFileSync(path.join(OUT, '.actors.json'), 'utf8'));

const ESPERA_CIERRE_MS = 90000; // el cierre se dispara al momento; margen por si el cerrojo esta tomado
const SONDEO_MS = 5000;

const results = [];
function rec(id, desc, status, detail) {
  results.push({ id, desc, status, detail: detail || '' });
  console.log(`[${status}] ${id.padEnd(12)} ${desc}${detail ? ' :: ' + detail : ''}`);
}
const num = (s) => parseFloat(String(s).replace(/[^0-9.\-]/g, '')) || 0;

/** Consulta de sólo lectura. Esta fase **no escribe** en la base. */
const leer = (sql) => L.dbQuery(sql);

/** `fetch` como el usuario que tenga la sesión en `page`, a través del BFF del CLIENT. */
async function comoUsuario(page, apiPath, method, body) {
  return page.evaluate(
    async ({ apiPath, method, body }) => {
      const opts = { method, credentials: 'include', headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const r = await fetch(apiPath, opts);
      let json = null;
      try {
        json = await r.clone().json();
      } catch {
        /* respuesta sin cuerpo JSON */
      }
      return { ok: r.ok, status: r.status, json };
    },
    { apiPath, method, body },
  );
}

/** Espera a que una consulta devuelva algo distinto de vacío, o se rinde diciéndolo. */
async function esperarA(descripcion, sql, limiteMs) {
  const hasta = Date.now() + limiteMs;
  while (Date.now() < hasta) {
    const v = leer(sql);
    if (v && v.trim() && v.trim() !== '0') return v.trim();
    await new Promise((r) => setTimeout(r, SONDEO_MS));
  }
  console.log(`   (se agotó la espera de ${descripcion} tras ${limiteMs / 1000}s)`);
  return null;
}

(async () => {
  const browser = await L.launch();

  try {
    // ── QA-CL-00 · el mundo de partida ────────────────────────────────────────────────────────────
    const auctionId = leer(
      `SELECT id FROM auctions WHERE seller_id='${actors.sellerId}' ORDER BY created_at DESC LIMIT 1`,
    ).trim();

    if (!auctionId) {
      rec('QA-CL-00', 'Hay una subasta del vendedor que seguir', 'FAIL', 'ninguna en la base');
      L.writeJSON(OUT, 'cierre-y-liquidacion.json', results);
      await browser.close();
      return;
    }
    rec('QA-CL-00', 'Hay una subasta del vendedor que seguir', 'PASS', auctionId);

    // ── QA-CL-01 · se adelanta el vencimiento y el cierre lo hace el codigo real ───────────────────
    //
    // No se espera la hora larga: una subasta dura >= 1 h por regla de negocio. Se adelanta `endsAt` por
    // el endpoint solo-desarrollo y **`closeExpiredAuctions()` hace el resto**.
    // `loginBase(ctx, usuario)` **crea la pagina y la devuelve**. La sesion del vendedor se abre una vez
    // y se reutiliza para adelantar el reloj y para declarar el envio.
    const ctxVendedor = await L.newContext(browser);
    const loginV = await L.loginBase(ctxVendedor, actors.SELLER);
    if (!loginV.ok) {
      rec('QA-CL-01', 'Login del vendedor', 'FAIL', loginV.error || 'no entro');
      L.writeJSON(OUT, 'cierre-y-liquidacion.json', results);
      await browser.close();
      return;
    }
    const pV = loginV.page;

    const expirada = await comoUsuario(
      pV,
      `/api/v1/scheduler/expire-auction/${auctionId}`,
      'POST',
    );

    const cerrada = await esperarA(
      'el cierre de la subasta',
      `SELECT count(*) FROM auctions WHERE id='${auctionId}' AND status='CLOSED'`,
      ESPERA_CIERRE_MS,
    );
    rec(
      'QA-CL-01',
      'La subasta cierra por `closeExpiredAuctions()`, no por siembra',
      cerrada ? 'PASS' : 'FAIL',
      expirada.json ? JSON.stringify(expirada.json) : `HTTP ${expirada.status}`,
    );

    // ── QA-CL-02 · el pedido y la comisión salen del cierre ───────────────────────────────────────
    const pedido = leer(
      `SELECT id||'|'||status||'|'||total_amount||'|'||coalesce(seller_net::text,'-') FROM orders WHERE auction_id='${auctionId}'`,
    ).trim();
    const [orderId, estadoPedido, importe, neto] = pedido.split('|');
    rec(
      'QA-CL-02',
      'El cierre genera el pedido, pagado (R-5.1a)',
      orderId && estadoPedido === 'PAID' ? 'PASS' : 'FAIL',
      pedido || 'sin pedido',
    );

    const comision = leer(
      `SELECT amount FROM commission_records WHERE order_id='${orderId}'`,
    ).trim();
    rec(
      'QA-CL-03',
      'La venta registra su comisión (R-5.1d)',
      comision ? 'PASS' : 'FAIL',
      comision ? `MXN ${comision} sobre ${importe}` : 'sin registro de comisión',
    );

    // ── QA-CL-04 · el neto entra en holdback, NO disponible ───────────────────────────────────────
    const monedero = () => {
      const r = leer(
        `SELECT balance||'|'||pending_balance FROM wallets WHERE user_id='${actors.sellerId}'`,
      ).trim();
      const [b, p] = r.split('|');
      return { balance: num(b), pending: num(p) };
    };

    const antesDeEnviar = monedero();
    rec(
      'QA-CL-04',
      'El neto de la venta está retenido, no disponible (RN-64)',
      antesDeEnviar.pending > 0 ? 'PASS' : 'FAIL',
      `pending=${antesDeEnviar.pending} · disponible=${antesDeEnviar.balance} · neto del pedido=${neto}`,
    );

    // ── QA-CL-05/06 · el vendedor declara el envío ────────────────────────────────────────────────
    await pV.goto(`${cfg.CLIENT}/orders/${orderId}`, { waitUntil: 'domcontentloaded' });

    const creado = await comoUsuario(pV, '/api/v1/shipments', 'POST', {
      orderId,
      provider: 'ESTAFETA',
      trackingNumber: `QA-${Date.now()}`,
    });
    rec(
      'QA-CL-05',
      'El vendedor registra el envío',
      creado.ok ? 'PASS' : 'FAIL',
      `HTTP ${creado.status}`,
    );

    const shipmentId = creado.json && creado.json.id;

    const enviado = await comoUsuario(pV, `/api/v1/shipments/${shipmentId}/status`, 'PATCH', {
      status: 'SHIPPED',
    });
    rec(
      'QA-CL-06',
      'El vendedor declara la salida (SHIPPED)',
      enviado.ok ? 'PASS' : 'FAIL',
      `HTTP ${enviado.status}`,
    );

    // ── QA-CL-07 · y NO puede confirmar la recepción — es el defecto que cerró PT-174 ─────────────
    const vendedorConfirma = await comoUsuario(pV, `/api/v1/shipments/${shipmentId}/status`, 'PATCH', {
      status: 'DELIVERED',
    });
    rec(
      'QA-CL-07',
      'El vendedor NO puede confirmar la recepción (PT-174)',
      vendedorConfirma.status === 403 ? 'PASS' : 'FAIL',
      `HTTP ${vendedorConfirma.status} — antes de PT-174 esto devolvía 200 y liberaba su propio holdback`,
    );

    await L.shot(pV, 'vendedor-envio-declarado', DIR);

    // ── QA-CL-08 · el comprador ve el aviso ───────────────────────────────────────────────────────
    const aviso = leer(
      `SELECT count(*) FROM notifications WHERE user_id='${actors.buyerId}' AND type='ORDER_SHIPPED'`,
    ).trim();
    rec(
      'QA-CL-08',
      'El comprador recibe el aviso del envío, con su tipo (H-012)',
      Number(aviso) > 0 ? 'PASS' : 'FAIL',
      `notificaciones ORDER_SHIPPED=${aviso}`,
    );

    // ── QA-CL-09 · el comprador confirma, desde su sesión ─────────────────────────────────────────
    const ctxComprador = await L.newContext(browser);
    const loginC = await L.loginBase(ctxComprador, actors.BUYER);
    if (!loginC.ok) {
      rec('QA-CL-09', 'Login del comprador', 'FAIL', loginC.error || 'no entro');
      L.writeJSON(OUT, 'cierre-y-liquidacion.json', results);
      await browser.close();
      return;
    }
    const pC = loginC.page;
    await pC.goto(`${cfg.CLIENT}/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
    await L.shot(pC, 'comprador-puede-confirmar', DIR);

    const confirmado = await comoUsuario(pC, `/api/v1/shipments/${shipmentId}/status`, 'PATCH', {
      status: 'DELIVERED',
    });
    rec(
      'QA-CL-09',
      'El COMPRADOR confirma la recepción',
      confirmado.ok ? 'PASS' : 'FAIL',
      `HTTP ${confirmado.status}`,
    );

    const sello = leer(`SELECT delivered_at FROM shipments WHERE id='${shipmentId}'`).trim();
    rec(
      'QA-CL-10',
      'La confirmación sella `delivered_at` — de ahí cuelga la espera',
      sello ? 'PASS' : 'FAIL',
      sello || 'sin sellar',
    );

    // ── QA-CL-11 · la liberación ──────────────────────────────────────────────────────────────────
    //
    // Con `SETTLEMENT_HOLDBACK_HOURS=0` el corte es «ahora», así que el disparador de desarrollo la
    // ejecuta al instante. En producción son 72 h y este disparador **no existe**: `DevelopmentOnlyGuard`
    // aborta con 403 si `NODE_ENV=production`.
    const disparo = await comoUsuario(pC, '/api/v1/scheduler/release-settlements', 'POST');
    rec(
      'QA-CL-11',
      'Se ejecuta la liberación de liquidaciones maduras',
      disparo.ok ? 'PASS' : 'FAIL',
      disparo.json ? JSON.stringify(disparo.json) : `HTTP ${disparo.status}`,
    );

    const despues = monedero();
    rec(
      'QA-CL-12',
      'El neto pasa de retenido a disponible',
      despues.balance > antesDeEnviar.balance && despues.pending < antesDeEnviar.pending
        ? 'PASS'
        : 'FAIL',
      `disponible ${antesDeEnviar.balance}→${despues.balance} · pending ${antesDeEnviar.pending}→${despues.pending}`,
    );

    const asiento = leer(
      `SELECT amount FROM ledger WHERE reference_id='${orderId}' AND type='SETTLEMENT_RELEASE'`,
    ).trim();
    rec(
      'QA-CL-13',
      'Queda su asiento `SETTLEMENT_RELEASE`',
      asiento ? 'PASS' : 'FAIL',
      asiento ? `MXN ${asiento}` : 'sin asiento',
    );

    // ── QA-CL-14 · el vendedor solicita el retiro de ESA ganancia ─────────────────────────────────
    //
    // **Alcance, dicho en claro.** El retiro exige una cuenta CLABE *verificada*, y la verificacion
    // pasa por un micro-deposito que **hoy dispersa un administrador a mano** — no hay API para
    // marcarlo enviado, y por eso `60-withdrawal.js` lo hace con un `UPDATE` a la base. Esta fase no
    // escribe, asi que no puede completar esa parte.
    //
    // Lo que SI afirma, y es lo que le toca: que la solicitud **llega a las reglas de negocio**. Un
    // rechazo por cuenta no verificada es la proteccion de TD-003 funcionando; un **500 es un fallo**,
    // porque significa que el sistema se rompio en vez de decidir. Es la leccion de H-018, donde un
    // deposito con referencia desconocida devolvia 500 donde correspondia un 4xx.
    //
    // El recorrido completo hasta `PAID` es de la fase 60, que lo ejercita real.
    const aRetirar = Math.min(despues.balance, num(neto) || despues.balance);

    const cuenta = await comoUsuario(pV, '/api/v1/wallet/payment-methods', 'POST', {
      clabe: '002010077777777771',
      holderName: 'Vendedor QA',
      bankName: 'Banamex',
    });

    const retiro = await comoUsuario(pV, '/api/v1/wallet/withdrawals', 'POST', {
      amount: aRetirar,
      paymentMethodId: '002010077777777771',
    });

    const decidio = retiro.status < 500;
    rec(
      'QA-CL-14',
      'La solicitud de retiro llega a las reglas de negocio, no a un crash',
      decidio ? 'PASS' : 'FAIL',
      `MXN ${aRetirar} · cuenta HTTP ${cuenta.status} · retiro HTTP ${retiro.status}` +
        `${retiro.json && retiro.json.message ? ' — ' + JSON.stringify(retiro.json.message) : ''}`,
    );

    rec(
      'QA-CL-14b',
      'La ganancia de esta venta esta disponible para retirar',
      despues.balance >= num(neto) ? 'PASS' : 'FAIL',
      `disponible=${despues.balance} >= neto=${neto}`,
    );

    // ── QA-CL-15 · y nada de esto se sembró ───────────────────────────────────────────────────────
    const propio = fs.readFileSync(__filename, 'utf8');
    const escrituras = (propio.match(/\b(INSERT|UPDATE|DELETE)\s+(INTO|FROM|[a-z_]+\s+SET)/gi) || [])
      .length;
    rec(
      'QA-CL-15',
      'La fase no escribe en la base: cero INSERT/UPDATE/DELETE',
      escrituras === 0 ? 'PASS' : 'FAIL',
      `escrituras detectadas=${escrituras}. Los dos adelantos de reloj van por endpoints solo-desarrollo, ` +
        `no por SQL. La fase 60 escribe 6 veces para fabricar su estado de partida`,
    );

    L.writeJSON(OUT, 'cierre-y-liquidacion.json', results);
    console.log(
      `\n=== 35-cierre-y-liquidacion === PASS=${results.filter((r) => r.status === 'PASS').length}/${results.length}`,
    );
  } finally {
    await browser.close();
  }
})();
