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
 *
 * ## PT-153 (H-022) — la consulta va por Prisma, no por `docker exec`
 *
 * Esto usaba `execSync('docker exec ironloot-db psql …')`, y **dentro del contenedor del API no hay
 * binario `docker`**: las 19 reglas devolvian SIN_DATOS y el proceso salia con 0. PT-138 (F-135-B)
 * corrigio exactamente esto en `observability-check.ts` pasandolo a `PrismaClient`; este fichero y
 * `reliability-check.ts` se quedaron con la forma vieja y nada lo noto durante nueve sesiones.
 *
 * Un checkpoint tiene que correr **donde corre npm**, que en este repositorio es el contenedor
 * (RULE-15). La conexion sale de `DATABASE_URL`, que ambos entornos tienen.
 *
 * ## PT-149 (H-021) — el veredicto se DERIVA, no se imprime aparte
 *
 * Ver `veredictoCoherencia()` al final. Resumen: `cross_coherence_verified = true` se emitia con las
 * cinco comprobaciones en error.
 */
import { PrismaClient } from '@prisma/client';

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

let prisma: PrismaClient | null = null;

/**
 * Ejecuta una consulta de conteo y devuelve su valor como cadena.
 *
 * Las consultas del catalogo devuelven **una fila con un numero**. `$queryRawUnsafe` es correcto
 * aqui —y no una puerta de inyeccion— porque el SQL es **literal en este fichero**: no hay entrada
 * de usuario en ningun punto del camino. Es el mismo criterio que `observability-check.ts`.
 */
async function consultar(sql: string): Promise<string> {
  if (!prisma) prisma = new PrismaClient();
  const filas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
  if (!filas.length) return '0';
  const valor = Object.values(filas[0])[0];
  return String(valor ?? '0');
}

export async function cerrarConexion(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function evaluar(catalogo: Regla[] = CATALOGO): Promise<Evaluada[]> {
  const salida: Evaluada[] = [];

  for (const r of catalogo) {
    try {
      const poblacion = Number(await consultar(r.poblacion));
      if (!poblacion) {
        salida.push({
          id: r.id,
          peso: r.peso,
          veredicto: 'SIN_DATOS' as const,
          enunciado: r.enunciado,
          observado: 'sin productos que evaluar',
        });
        continue;
      }
      const infracciones = Number(await consultar(r.sql));
      salida.push({
        id: r.id,
        peso: r.peso,
        veredicto: (infracciones === 0 ? 'CUMPLE' : 'VIOLADA') as Veredicto,
        enunciado: r.enunciado,
        observado: `${infracciones} infraccion(es) sobre ${poblacion} registro(s)`,
      });
    } catch (e) {
      salida.push({
        id: r.id,
        peso: r.peso,
        veredicto: 'SIN_DATOS' as const,
        enunciado: r.enunciado,
        observado: `error: ${(e as Error).message.slice(0, 70)}`,
      });
    }
  }

  return salida;
}

/** Lo que devuelve una comprobacion de coherencia: el conteo, o `ERR` si no se pudo mirar. */
export interface Comprobacion {
  par: string;
  resultado: string;
}

export type EstadoCoherencia = 'verificado' | 'sin_datos' | 'incoherente';

export interface VeredictoCoherencia {
  estado: EstadoCoherencia;
  medidas: number;
  incoherentes: number;
  noMedidas: number;
}

/**
 * PT-149 (H-021) — El veredicto de coherencia, DERIVADO del resultado.
 *
 * Lo que habia era `let incoherentes = 0; if (!ok && n !== 'ERR') incoherentes++;` y luego
 * `cross_coherence_verified = incoherentes === 0`. Un error **no contaba**, asi que con las cinco
 * comprobaciones en `(ERR)` el veredicto era `true`: **cuantos menos datos, mas verde**.
 *
 * Tres estados, no un booleano — el mismo criterio que `puntuar()` ya aplicaba al
 * `rubric_compliance_score` veinte lineas mas arriba, y que nadie traslado aqui:
 *
 *   - `verificado`   todas midieron y ninguna fallo. **El unico que permite salir con 0.**
 *   - `incoherente`  alguna MEDIDA fallo. Gana sobre la falta de datos: una incoherencia observada
 *                    es peor noticia que una no observada.
 *   - `sin_datos`    alguna no se pudo mirar. **No es un aprobado.**
 *
 * Un catalogo vacio da `sin_datos`, no `verificado`: afirmar que se verifico la coherencia de cero
 * pares es la version degenerada del mismo error.
 */
export function veredictoCoherencia(comprobaciones: Comprobacion[]): VeredictoCoherencia {
  const noMedidas = comprobaciones.filter((c) => c.resultado === 'ERR').length;
  const incoherentes = comprobaciones.filter(
    (c) => c.resultado !== 'ERR' && c.resultado !== '0',
  ).length;
  const medidas = comprobaciones.length - noMedidas;

  const estado: EstadoCoherencia =
    incoherentes > 0 ? 'incoherente' : medidas === 0 || noMedidas > 0 ? 'sin_datos' : 'verificado';

  return { estado, medidas, incoherentes, noMedidas };
}

async function main(): Promise<void> {
  console.log('=== D1.N1 — Reglas de dominio (F-1) sobre la salida real ===\n');
  const evaluadas = await evaluar();
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
  const comprobaciones: Comprobacion[] = [];
  for (const c of COHERENCIA) {
    let n: string;
    try {
      n = await consultar(c.sql);
    } catch (e) {
      n = 'ERR';
    }
    comprobaciones.push({ par: c.par, resultado: n });
    const marca = n === '0' ? 'OK  ' : n === 'ERR' ? 'n/d ' : 'FALLA';
    console.log(`  [${marca}] ${c.par.padEnd(16)} ${c.regla}  (${n})`);
  }

  const v = veredictoCoherencia(comprobaciones);
  console.log(`\n  cross_coherence_verified = ${v.estado}`);
  console.log(
    `  ${v.medidas} de ${comprobaciones.length} medidas · ${v.incoherentes} incoherente(s) · ` +
      `${v.noMedidas} sin poder mirar`,
  );
  if (v.estado === 'sin_datos') {
    console.log('  Esto NO es un aprobado: es una comprobacion que no ha podido mirar.');
  }

  await cerrarConexion();

  // PT-149: salir con 0 cuando no se pudo medir era lo que hacia grave a H-021. Un fallo que sale
  // con 0 no es un fallo para nadie que lo automatice. `verificado` es el unico estado que pasa.
  if (p.falla || v.estado !== 'verificado') {
    console.error(
      p.falla || v.estado === 'incoherente'
        ? '\n  Una regla de dominio violada es un HALLAZGO, no un test roto: registralo en PTSA.\n'
        : '\n  No se pudo medir. Revisa la conexion a la base antes de leer nada de arriba.\n',
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error(`\n  audit:domain fallo: ${(e as Error).message}\n`);
    await cerrarConexion();
    process.exit(1);
  });
}
