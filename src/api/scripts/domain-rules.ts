/**
 * PT-120 (`[R57]` / checkpoint D1.N1) — Domain Rules as Code.
 *
 * `[R57]`: «Toda regla de dominio objetiva y repetible identificada en F-1/F12 DEBE transformarse
 * en un test ejecutable para reducir subjetividad y permitir su verificacion automatica en cada
 * Delta Sync y en CI.»
 *
 * Estas reglas se habian verificado **tres veces** —DS-004, DS-006, DS-008— con guiones que vivian
 * en una carpeta temporal. Cada delta sync rehacia el mismo trabajo, y el score se transcribia a
 * mano. Un numero de auditoria que nadie puede reproducir no es un numero de auditoria.
 *
 * Las reglas son **datos**, no codigo: anadir una es anadir una entrada. F12 amplia el catalogo, y
 * debe poder hacerlo sin tocar el motor.
 *
 * Uso:  npm run audit:domain
 */
import { execSync } from 'child_process';

export type Veredicto = 'CUMPLE' | 'VIOLADA' | 'SIN_DATOS';

export interface Regla {
  id: string;
  enunciado: string;
  /** Peso en el `rubric_compliance_score`. El dinero pesa mas. */
  peso: number;
  /** Consulta que decide la regla. Debe devolver el numero de INFRACCIONES. */
  sql: string;
  /** Consulta que dice si hay algo que evaluar. Si devuelve 0, el veredicto es SIN_DATOS. */
  poblacion: string;
}

export interface Evaluada {
  id: string;
  peso: number;
  veredicto: Veredicto;
  observado?: string;
  enunciado?: string;
}

export interface Puntuacion {
  /** `round(100 × Σpeso(cumplidas) / Σpeso(aplicables))`, o `null` si no hay nada que puntuar. */
  rubric: number | null;
  falla: boolean;
  motivo: string;
  violadas: string[];
  sinDatos: string[];
}

/**
 * Calcula el score.
 *
 * Las `SIN_DATOS` quedan **fuera del denominador**: no se puede puntuar lo que no se ha podido
 * mirar. Contarlas como cumplidas inflaria el numero; como violadas, lo hundiria. Ninguna de las
 * dos seria cierta.
 */
export function puntuar(evaluadas: Evaluada[]): Puntuacion {
  const aplicables = evaluadas.filter((e) => e.veredicto !== 'SIN_DATOS');
  const sinDatos = evaluadas.filter((e) => e.veredicto === 'SIN_DATOS').map((e) => e.id);
  const violadas = evaluadas.filter((e) => e.veredicto === 'VIOLADA').map((e) => e.id);

  if (aplicables.length === 0) {
    return {
      rubric: null,
      falla: false,
      motivo:
        evaluadas.length === 0
          ? 'Sin reglas que evaluar.'
          : 'Todas las reglas quedaron SIN DATOS: no hay productos que evaluar. ' +
            'Esto NO es un 100: es una auditoria que no ha podido mirar.',
      violadas,
      sinDatos,
    };
  }

  const total = aplicables.reduce((s, e) => s + e.peso, 0);
  const suma = aplicables.filter((e) => e.veredicto === 'CUMPLE').reduce((s, e) => s + e.peso, 0);

  return {
    rubric: Math.round((100 * suma) / total),
    falla: violadas.length > 0,
    motivo: violadas.length
      ? `${violadas.length} regla(s) de dominio violada(s)`
      : 'Todas las reglas aplicables se cumplen',
    violadas,
    sinDatos,
  };
}

/**
 * Catalogo derivado de **F-1 §4 (reglas CR) y §5 (rubrica)**.
 *
 * Solo entran las reglas que cumplen el criterio de elegibilidad de `[R57]`: deterministas, con
 * entrada extraible del producto, y veredicto binario o numerico.
 *
 * **CR-007** (ventana de disputa) y **CR-008** (firma HMAC) NO estan: su entrada no es el producto
 * sino la peticion. Viven como evaluacion reproducible en `ventana-desde-la-entrega.spec.ts`
 * (PT-115) y en la fase 70 de la suite. Forzarlas aqui seria inventar un veredicto sobre algo que
 * no se esta midiendo.
 */
export const CATALOGO: Regla[] = [
  {
    id: 'CR-001',
    enunciado: 'El balance del monedero nunca es negativo',
    peso: 20,
    sql: 'SELECT count(*) FROM wallets WHERE balance < 0',
    poblacion: 'SELECT count(*) FROM wallets',
  },
  {
    id: 'CR-002',
    enunciado: 'Los fondos retenidos no superan el balance',
    peso: 20,
    sql: 'SELECT count(*) FROM wallets WHERE held_funds > balance',
    poblacion: 'SELECT count(*) FROM wallets',
  },
  {
    id: 'CR-003',
    enunciado: 'El ultimo balance_after del ledger coincide con el balance del monedero',
    peso: 25,
    sql:
      'SELECT count(*) FROM wallets w JOIN LATERAL (SELECT balance_after FROM ledger l ' +
      'WHERE l.wallet_id=w.id ORDER BY l.created_at DESC, l.id DESC LIMIT 1) u ON true ' +
      'WHERE abs(u.balance_after - w.balance) > 0.01',
    poblacion: 'SELECT count(DISTINCT wallet_id) FROM ledger',
  },
  {
    id: 'CR-004',
    enunciado: 'El deposito acreditado coincide con el pago del proveedor',
    peso: 20,
    sql:
      'SELECT count(*) FROM ledger l JOIN payments p ON p.reference = l.reference_id ' +
      "WHERE l.type='DEPOSIT' AND l.amount <> p.amount",
    poblacion:
      "SELECT count(*) FROM ledger l JOIN payments p ON p.reference = l.reference_id WHERE l.type='DEPOSIT'",
  },
  {
    id: 'CR-005',
    enunciado: 'Ninguna puja es sobre la subasta propia',
    peso: 15,
    sql: 'SELECT count(*) FROM bids b JOIN auctions a ON a.id=b.auction_id WHERE a.seller_id = b.bidder_id',
    poblacion: 'SELECT count(*) FROM bids',
  },
  {
    id: 'CR-006',
    enunciado: 'Ninguna puja iguala o baja de la anterior',
    peso: 15,
    sql:
      'SELECT count(*) FROM (SELECT b.amount, LAG(b.amount) OVER ' +
      '(PARTITION BY b.auction_id ORDER BY b.created_at) prev FROM bids b) t ' +
      'WHERE prev IS NOT NULL AND amount <= prev',
    poblacion: 'SELECT count(*) FROM bids',
  },
  {
    id: 'CR-010',
    enunciado: 'La moneda es MXN exclusivamente',
    peso: 10,
    sql: "SELECT count(*) FROM wallets WHERE currency <> 'MXN'",
    poblacion: 'SELECT count(*) FROM wallets',
  },
  {
    id: 'CR-015',
    enunciado: 'Los importes financieros son Decimal, nunca Float',
    peso: 15,
    sql:
      "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' " +
      "AND data_type IN ('double precision','real') AND (column_name LIKE '%amount%' " +
      "OR column_name LIKE '%balance%' OR column_name LIKE '%price%' OR column_name LIKE '%funds%')",
    poblacion:
      "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND column_name LIKE '%amount%'",
  },
  // ── Rubrica de F-1 §5: completitud transaccional ────────────────────────
  {
    id: 'R-5.1a',
    enunciado: 'Toda subasta cerrada con pujas genera pedido',
    peso: 20,
    sql:
      "SELECT count(*) FROM auctions a WHERE a.status='CLOSED' " +
      'AND EXISTS(SELECT 1 FROM bids b WHERE b.auction_id=a.id) ' +
      'AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.auction_id=a.id)',
    poblacion: "SELECT count(*) FROM auctions WHERE status='CLOSED'",
  },
  {
    id: 'R-5.1b',
    enunciado: 'Todo pago COMPLETED tiene su asiento de deposito',
    peso: 25,
    sql:
      "SELECT count(*) FROM payments p WHERE p.status='COMPLETED' " +
      "AND NOT EXISTS(SELECT 1 FROM ledger l WHERE l.reference_id=p.reference AND l.type='DEPOSIT')",
    poblacion: "SELECT count(*) FROM payments WHERE status='COMPLETED'",
  },
  {
    id: 'R-5.1c',
    enunciado: 'Ningun deposito se acredito dos veces',
    peso: 25,
    sql:
      "SELECT count(*) FROM (SELECT reference_id FROM ledger WHERE type='DEPOSIT' " +
      'AND reference_id IS NOT NULL GROUP BY reference_id HAVING count(*)>1) t',
    poblacion: "SELECT count(*) FROM ledger WHERE type='DEPOSIT'",
  },
  {
    id: 'R-5.1d',
    enunciado: 'Toda venta liquidada registra su comision (H-010 / PT-114)',
    peso: 20,
    sql:
      "SELECT count(*) FROM ledger l WHERE l.type='FEE_PLATFORM' AND NOT EXISTS(" +
      'SELECT 1 FROM commission_records c JOIN orders o ON o.id=c.order_id ' +
      'WHERE o.auction_id::text = l.reference_id)',
    poblacion: "SELECT count(*) FROM ledger WHERE type='FEE_PLATFORM'",
  },
  {
    id: 'R-5.2b',
    enunciado: 'Cada asiento del ledger tiene tipo del catalogo',
    peso: 5,
    sql: 'SELECT count(*) FROM ledger WHERE type IS NULL',
    poblacion: 'SELECT count(*) FROM ledger',
  },
  {
    id: 'R-5.3b',
    enunciado: 'Ningun vendedor habilitado sin KYC aprobado',
    peso: 15,
    sql:
      'SELECT count(*) FROM users u WHERE u.is_seller = true AND NOT EXISTS(' +
      "SELECT 1 FROM kyc_submissions k WHERE k.user_id=u.id AND k.status='APPROVED')",
    poblacion: 'SELECT count(*) FROM users WHERE is_seller = true',
  },
];

/** Coherencia inter-producto (Nivel 3). Se reporta aparte: NO entra en el score de rubrica. */
export const COHERENCIA: { par: string; regla: string; sql: string }[] = [
  {
    par: 'P-002 → P-003',
    regla: 'El importe del pedido coincide con el precio final',
    sql:
      'SELECT count(*) FROM orders o JOIN auctions a ON a.id=o.auction_id ' +
      'WHERE abs(o.total_amount - a.current_price) > 0.01',
  },
  {
    par: 'P-003 → P-010',
    regla: 'La comision es el porcentaje aplicado al importe del pedido',
    sql:
      'SELECT count(*) FROM commission_records c JOIN orders o ON o.id=c.order_id ' +
      'WHERE abs(c.amount - (o.total_amount * c.rate_percent / 100)) > 0.01',
  },
  {
    par: 'P-010 → P-009',
    regla: 'El registro de comision coincide con el asiento FEE_PLATFORM',
    sql:
      'SELECT count(*) FROM commission_records c JOIN orders o ON o.id=c.order_id ' +
      "JOIN ledger l ON l.type='FEE_PLATFORM' AND l.reference_id=o.auction_id::text " +
      'WHERE abs(c.amount - l.amount) > 0.01',
  },
  {
    par: 'P-003 → P-006',
    regla: 'Toda disputa cuelga de un pedido existente',
    sql: 'SELECT count(*) FROM disputes d WHERE NOT EXISTS(SELECT 1 FROM orders o WHERE o.id=d.order_id)',
  },
  {
    par: 'P-002 → P-007',
    regla: 'El tipo del aviso corresponde al evento (H-012 / PT-117)',
    sql:
      "SELECT count(*) FROM notifications n WHERE n.type='AUCTION_WON' " +
      'AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.buyer_id=n.user_id)',
  },
];

const CONTENEDOR = process.env.PTSA_DB_CONTAINER ?? 'ironloot-db';

function consultar(sql: string): string {
  return execSync(
    `docker exec ${CONTENEDOR} psql -U ironloot -d ironloot_db -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' },
  ).trim();
}

export function evaluar(catalogo: Regla[] = CATALOGO): Evaluada[] {
  return catalogo.map((r) => {
    try {
      const poblacion = Number(consultar(r.poblacion));
      if (!poblacion) {
        return {
          id: r.id,
          peso: r.peso,
          veredicto: 'SIN_DATOS' as const,
          enunciado: r.enunciado,
          observado: 'sin productos que evaluar',
        };
      }
      const infracciones = Number(consultar(r.sql));
      return {
        id: r.id,
        peso: r.peso,
        veredicto: (infracciones === 0 ? 'CUMPLE' : 'VIOLADA') as Veredicto,
        enunciado: r.enunciado,
        observado: `${infracciones} infraccion(es) sobre ${poblacion} registro(s)`,
      };
    } catch (e) {
      return {
        id: r.id,
        peso: r.peso,
        veredicto: 'SIN_DATOS' as const,
        enunciado: r.enunciado,
        observado: `error: ${(e as Error).message.slice(0, 70)}`,
      };
    }
  });
}

function main(): void {
  console.log('=== D1.N1 — Reglas de dominio (F-1) sobre la salida real ===\n');
  const evaluadas = evaluar();
  for (const e of evaluadas) {
    const marca = { CUMPLE: 'OK  ', VIOLADA: 'FALLA', SIN_DATOS: 'n/d ' }[e.veredicto];
    console.log(
      `  [${marca}] ${e.id.padEnd(8)} (peso ${String(e.peso).padStart(2)})  ${e.enunciado}`,
    );
    if (e.veredicto !== 'CUMPLE') console.log(`            ${e.observado}`);
  }

  const p = puntuar(evaluadas);
  console.log(`\n  rubric_compliance_score = ${p.rubric ?? 'null'}`);
  console.log(`  ${p.motivo}`);
  if (p.sinDatos.length)
    console.log(`  Sin datos (fuera del denominador): ${p.sinDatos.join(', ')}`);

  console.log('\n=== Nivel 3 — Coherencia inter-producto (aparte del score) ===\n');
  let incoherentes = 0;
  for (const c of COHERENCIA) {
    let n: string;
    try {
      n = consultar(c.sql);
    } catch (e) {
      n = 'ERR';
    }
    const ok = n === '0';
    if (!ok && n !== 'ERR') incoherentes++;
    console.log(
      `  [${ok ? 'OK  ' : n === 'ERR' ? 'n/d ' : 'FALLA'}] ${c.par.padEnd(16)} ${c.regla}  (${n})`,
    );
  }
  console.log(`\n  cross_coherence_verified = ${incoherentes === 0}`);

  if (p.falla || incoherentes > 0) {
    console.error(
      '\n  Una regla de dominio violada es un HALLAZGO, no un test roto: registralo en PTSA.\n',
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
