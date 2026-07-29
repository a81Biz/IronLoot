/**
 * PT-122 (metricas D5) — Fiabilidad operacional.
 *
 * `audit-scope.yaml` declaraba D5 entre los `ci_checkpoints` desde el 23-jun. **Es una
 * clasificacion equivocada, no una implementacion pendiente**: `Success Rate` y `Retry Rate` se
 * calculan sobre historia de ejecucion real, y en CI la base nace vacia en cada corrida. Un
 * checkpoint de D5 en el pipeline devolveria `SIN_DATOS` siempre — y con el tiempo alguien lo
 * leeria como «verde».
 *
 * D5 es una metrica de **delta sync**: se toma contra un entorno con historia.
 *
 * ## De donde sale la señal
 *
 * BullMQ tiene las colas pero sus contadores estan a cero: los trabajos se limpian al completarse.
 * Lo que si tiene señal es el **ciclo de pago**, que es la transformacion principal del sistema.
 *
 * ## El matiz que hay que leer antes que los numeros
 *
 * Un `POLL_ATTEMPT` **no es un fallo**: es la via garantizada haciendo lo que PT-087 diseño —
 * encontrar un pago que la notificacion no trajo. Un `Retry Rate` alto aqui significa «las
 * pasarelas no notifican», no «el sistema falla».
 *
 * Uso:  npm run audit:reliability
 */
import { PrismaClient } from '@prisma/client';

export type Semaforo = 'VERDE' | 'AMBAR' | 'ROJO' | 'SIN_DATOS';

export interface Tasa {
  nombre: string;
  valor: number | null;
  semaforo: Semaforo;
  detalle: string;
}

/** Umbrales declarados en F-1 §6. */
export function clasificarExito(pct: number | null): Semaforo {
  if (pct === null) return 'SIN_DATOS';
  if (pct >= 95) return 'VERDE';
  if (pct >= 85) return 'AMBAR';
  return 'ROJO';
}

export function clasificarReintento(pct: number | null): Semaforo {
  if (pct === null) return 'SIN_DATOS';
  if (pct <= 10) return 'VERDE';
  if (pct <= 25) return 'AMBAR';
  return 'ROJO';
}

/**
 * PT-153 (H-022) — La consulta va por Prisma, no por `docker exec`.
 *
 * Esto era `execSync('docker exec ironloot-db psql …')`, y **dentro del contenedor del API no hay
 * binario `docker`**: el checkpoint devolvia SIN_DATOS siempre y salia con 0. PT-138 (F-135-B)
 * corrigio exactamente esto en `observability-check.ts`; este fichero y `domain-rules.ts` se
 * quedaron con la forma vieja y nadie lo noto.
 *
 * Un checkpoint tiene que correr **donde corre npm** — el contenedor (RULE-15). `DATABASE_URL` esta
 * en los dos entornos, asi que esto funciona en ambos; `docker exec` solo funcionaba en uno.
 */
let prisma: PrismaClient | null = null;

async function q(sql: string): Promise<number> {
  if (!prisma) prisma = new PrismaClient();
  const filas = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
  if (!filas.length) return 0;
  return Number(Object.values(filas[0])[0] ?? 0);
}

export async function cerrarConexion(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export async function medir(): Promise<Tasa[]> {
  const resueltos = await q(
    "SELECT count(*) FROM payment_cycles WHERE status IN ('SETTLED','EXPIRED','FAILED')",
  );
  const totales = await q('SELECT count(*) FROM payment_cycles');

  if (!totales) {
    const sinDatos = (nombre: string): Tasa => ({
      nombre,
      valor: null,
      semaforo: 'SIN_DATOS',
      detalle: 'No hay ciclos de pago que evaluar',
    });
    return [sinDatos('Success Rate'), sinDatos('Retry Rate'), sinDatos('Failure Rate')];
  }

  // El denominador del Retry Rate son los ciclos RESUELTOS, no todos.
  //
  // Un ciclo abierto que la via garantizada esta sondeando no «necesito un reintento»: esta
  // esperando a que alguien pague. Contarlo como reintento inflaba la tasa al 75% ROJO cuando la
  // realidad era 0% — y esa lectura habria puesto `health_unstable = true` y capado la clase a B
  // por una metrica mal definida, no por un sistema inestable.
  const conSondeo = await q(
    'SELECT count(DISTINCT c.reference) FROM payment_cycles c ' +
      "WHERE c.status IN ('SETTLED','EXPIRED','FAILED') AND EXISTS(" +
      "SELECT 1 FROM payment_cycle_events e WHERE e.reference=c.reference AND e.step='POLL_ATTEMPT')",
  );
  // Los ciclos abiertos en sondeo se informan aparte: son señal, pero no de reintento.
  const abiertosEnSondeo = await q(
    "SELECT count(DISTINCT c.reference) FROM payment_cycles c WHERE c.status='REQUESTED' AND EXISTS(" +
      "SELECT 1 FROM payment_cycle_events e WHERE e.reference=c.reference AND e.step='POLL_ATTEMPT')",
  );
  const fallidos = await q(
    "SELECT count(*) FROM payment_cycles WHERE status IN ('EXPIRED','FAILED')",
  );

  // «Exito al primer intento» = resuelto SIN haber necesitado la via garantizada.
  const alPrimerIntento = await q(
    "SELECT count(*) FROM payment_cycles c WHERE c.status='SETTLED' AND NOT EXISTS(" +
      "SELECT 1 FROM payment_cycle_events e WHERE e.reference=c.reference AND e.step='POLL_ATTEMPT')",
  );

  const exito = resueltos ? Math.round((100 * alPrimerIntento) / resueltos) : null;
  const reintento = resueltos ? Math.round((100 * conSondeo) / resueltos) : null;
  const fallo = Math.round((100 * fallidos) / totales);

  return [
    {
      nombre: 'Success Rate',
      valor: exito,
      semaforo: clasificarExito(exito),
      detalle: `${alPrimerIntento} de ${resueltos} ciclos resueltos sin necesitar la via garantizada`,
    },
    {
      nombre: 'Retry Rate',
      valor: reintento,
      semaforo: clasificarReintento(reintento),
      detalle:
        `${conSondeo} de ${resueltos} ciclos RESUELTOS necesitaron al menos un POLL_ATTEMPT` +
        (abiertosEnSondeo
          ? ` · ${abiertosEnSondeo} ciclo(s) abierto(s) en sondeo (no cuentan)`
          : ''),
    },
    {
      nombre: 'Failure Rate',
      valor: fallo,
      semaforo: fallo === 0 ? 'VERDE' : fallo <= 5 ? 'AMBAR' : 'ROJO',
      detalle: `${fallidos} de ${totales} ciclos EXPIRED o FAILED`,
    },
  ];
}

async function main(): Promise<void> {
  console.log('=== D5 — Fiabilidad operacional (metrica de delta sync, NO de CI) ===\n');

  let tasas: Tasa[];
  try {
    tasas = await medir();
  } catch (e) {
    // PT-153: esto hacia `return`, y un `return` desde `main` sale con **codigo 0**. Es decir: no
    // poder consultar la base se reportaba como corrida correcta. Es el mismo defecto que H-021 en
    // el fichero de al lado, y por eso los dos PT van juntos.
    //
    // «No hay ciclos que evaluar» (SIN_DATOS legitimo) y «no pude mirar» son cosas distintas: la
    // primera sale por `medir()` con las tasas a null, la segunda sale por aqui y **falla**.
    console.error(
      `  NO MEDIBLE — no se pudo consultar la base: ${(e as Error).message.slice(0, 90)}`,
    );
    console.error('\n  Esto NO es «sin datos»: es una medicion que no ha podido hacerse.\n');
    await cerrarConexion();
    process.exit(1);
  }

  for (const t of tasas) {
    const v = t.valor === null ? 'SIN_DATOS' : `${t.valor}%`;
    console.log(`  ${t.nombre.padEnd(14)} ${v.padStart(9)}   ${t.semaforo}`);
    console.log(`                 ${t.detalle}`);
  }

  console.log('\n  Hallucination Rate = NO_APLICA (sistema determinista, sin LLM)');
  console.log('  Output Drift       = NO_APLICA');

  console.log(
    '\n  COMO LEER EL RETRY RATE: un POLL_ATTEMPT no es un fallo. Es la via garantizada\n' +
      '  haciendo lo que PT-087 diseño — encontrar un pago que la notificacion no trajo.\n' +
      '  Un Retry Rate alto significa «las pasarelas no notifican», no «el sistema falla».\n' +
      '  Sigue valiendo medirlo: si sube, algo cambio en las pasarelas.\n',
  );

  const rojo = tasas.find((t) => t.semaforo === 'ROJO');
  if (rojo) {
    console.log(`  health_unstable = true por ${rojo.nombre}. Segun §13, la clase tope pasa a B.`);
  } else {
    console.log('  health_unstable = false');
  }

  await cerrarConexion();
}

if (require.main === module) {
  main().catch(async (e) => {
    console.error(`\n  audit:reliability fallo: ${(e as Error).message}\n`);
    await cerrarConexion();
    process.exit(1);
  });
}
