// PT-080.13 — Reconciliacion puntual de lo ya perdido.
//
// Compara los pagos APROBADOS en Mercado Pago contra lo acreditado en el ledger y reporta las
// diferencias. NO acredita por su cuenta: emite un informe para revision humana, porque
// recuperar dinero es una decision del admin (ADR-022).
//
// Existe porque el 2026-07-26 un pago real de 180 MXN quedo cobrado y sin acreditar sin que el
// sistema tuviera forma de enterarse. La via garantizada impide que vuelva a pasar de ahora en
// adelante; esto sirve para lo que ya ocurrio.
//
// Uso: node reconcile-report.cjs [dias-atras]

const fs = require('fs');
const { execSync } = require('child_process');

const ENV = 'C:/DevOps/Desarrollos/IronLoot/src/api/.env';
const MPAPI = 'https://api.mercadopago.com';

const readEnv = (k) => {
  const m = fs.readFileSync(ENV, 'utf8').match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim().replace(/^"|"$/g, '') : '';
};

const db = (sql) =>
  execSync(`docker exec ironloot-db psql -U ironloot -d ironloot_db -t -A -c "${sql}"`, {
    encoding: 'utf8',
  }).trim();

(async () => {
  const days = Number(process.argv[2] || 30);
  const access = readEnv('MERCADO_PAGO_ACCESS_TOKEN');
  const since = new Date(Date.now() - days * 86400_000).toISOString();

  console.log(`\n=== Reconciliacion Mercado Pago — ultimos ${days} dias ===\n`);

  const res = await fetch(
    `${MPAPI}/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=${since}&end_date=NOW&limit=200`,
    { headers: { Authorization: `Bearer ${access}` } },
  );

  if (!res.ok) {
    console.error(`No se pudo consultar Mercado Pago: HTTP ${res.status}`);
    process.exit(1);
  }

  const { results = [] } = await res.json();
  const approved = results.filter((p) => p.status === 'approved' && p.external_reference);

  console.log(`Pagos aprobados en la pasarela: ${approved.length}\n`);

  const missing = [];
  const credited = [];

  for (const p of approved) {
    const ref = String(p.external_reference).replace(/'/g, '');
    const rows = db(`SELECT count(*) FROM ledger WHERE reference_id='${ref}'`);
    (Number(rows) > 0 ? credited : missing).push(p);
  }

  console.log(`Acreditados en el ledger : ${credited.length}`);
  console.log(`SIN acreditar            : ${missing.length}\n`);

  if (missing.length) {
    console.log('--- Pagos cobrados y NO acreditados ---');
    let total = 0;
    for (const p of missing) {
      total += Number(p.transaction_amount || 0);
      const cycle = db(
        `SELECT status::text FROM payment_cycles WHERE reference='${p.external_reference}'`,
      );
      console.log(
        `  id=${p.id}  ${p.transaction_amount} ${p.currency_id}  ref=${p.external_reference}  ciclo=${cycle || 'sin ciclo'}`,
      );
    }
    console.log(`\n  TOTAL sin acreditar: ${total.toFixed(2)}`);
    console.log('\n  No se acredita automaticamente: requiere revision del admin (ADR-022).');
  } else {
    console.log('Sin diferencias: todo lo cobrado esta acreditado.');
  }
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
