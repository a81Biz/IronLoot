/**
 * PT-121 (checkpoint D3) — Observabilidad y recuperacion.
 *
 * `audit-scope.yaml` declara este checkpoint desde el 23-jun. No existia.
 *
 * Mide dos cosas de las cuatro que la especificacion pide para D3:
 *
 *   silent_failure_count  — bloques `catch` que no registran ni relanzan.
 *   trace_completeness    — % de ciclos de pago con la cadena de traza completa.
 *
 * (`prompt_provenance` es `NO_APLICA`: sistema determinista. `fallback_quality` exige juicio sobre
 * cada fallback y queda como evaluacion documentada, que es lo que `[R57]` prescribe para lo no
 * automatizable.)
 *
 * ## Por que `silent_failure_count` y no otra
 *
 * En una sola sesion aparecieron cinco fallos silenciosos —F-34, F-39, H-010, H-011, H-012— y
 * ninguno lo encontro un test. Todos de la misma familia: **el codigo anuncia una cosa y hace otra,
 * sin ruido**.
 *
 * El caso que mas duele: un `catch` rotulado *«live feed is optional; the page still works without
 * it»* mantuvo la puja en vivo apagada varios dias con la suite entera en verde.
 *
 * ## Por que una linea base y no un juicio
 *
 * Casi los 25 llevan comentario y son decisiones deliberadas. Pero **F-34 tambien tenia
 * comentario**: un comentario dice que alguien penso en ello, no que siga siendo cierto.
 *
 * Asi que esto no juzga cuales son aceptables. Los fija en una linea base —como PT-118 con las
 * dependencias— y **falla cuando aparece el numero 26**.
 *
 * Uso:  npm run audit:observability
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from './raiz-monorepo';

export interface CatchMudo {
  fichero: string;
  linea: number;
  /**
   * Firma estable del `catch`, para identificarlo sin depender de en que linea este.
   *
   * F-142-A — La linea base se indexaba por `fichero:linea`, y eso envejece exactamente igual que
   * una cita del TRD (H-016): **cualquier edicion por encima de un silencio declarado lo desplaza y
   * lo hace parecer nuevo**. En una sola sesion, el mismo `catch { // Fall through to ENV }` de
   * `system-config.service.ts` paso por las lineas 211, 223 y 234, y puso el job en rojo dos veces
   * sin que hubiera aparecido ningun silencio.
   *
   * Mover el numero cada vez es mantenimiento manual invisible, y acaba haciendo que la linea base
   * no signifique nada: quien la vea roja aprendera a mover el numero en vez de mirar.
   *
   * La huella es el contenido del bloque normalizado —incluidos los comentarios, que son justo lo
   * que distingue un silencio de otro—. Se desplaza con el fichero sin cambiar.
   */
  huella: string;
}

/** Identificador estable de un silencio, para la linea base. */
export function clave(c: Pick<CatchMudo, 'fichero' | 'huella'>): string {
  return `${c.fichero}::${c.huella}`;
}

/** Normaliza el cuerpo de un `catch` a una linea legible y corta. */
export function huellaDe(cuerpo: string): string {
  const normalizado = cuerpo.replace(/\s+/g, ' ').trim();
  return normalizado.length > 70 ? `${normalizado.slice(0, 70)}...` : normalizado || '(vacio)';
}

/** Ambitos barridos. El JavaScript de navegador entra: es donde vivia F-34. */
const AMBITOS = [
  'src/api/src',
  'src/apps/base/src',
  'src/apps/client/src',
  'src/admin/src',
  'src/packages/core/src',
  'src/apps/base/public/js',
  'src/apps/client/public/js',
  'src/admin/public/js',
];

const CATCH = /catch\s*(?:\([^)]*\))?\s*\{([^{}]*)\}/g;
/** Un catch deja rastro si registra, relanza, o corta el proceso. */
const DEJA_RASTRO = /logger|console|throw|reject|Logger|process\.exit/;

/**
 * Localiza los `catch` que no dejan rastro.
 *
 * Los comentarios se descartan antes de decidir: un `catch` cuyo unico contenido es una
 * explicacion sigue siendo mudo para quien lea los logs a las tres de la manana.
 */
export function buscarCatchMudos(texto: string, fichero: string): CatchMudo[] {
  const out: CatchMudo[] = [];
  CATCH.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CATCH.exec(texto)) !== null) {
    const sinComentarios = m[1].replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '').trim();
    if (!DEJA_RASTRO.test(sinComentarios)) {
      out.push({
        fichero,
        linea: texto.slice(0, m.index).split('\n').length,
        huella: huellaDe(m[1]),
      });
    }
  }
  return out;
}

function ficheros(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((e) => {
    const r = join(dir, e);
    if (e === 'node_modules' || e === 'dist') return [];
    if (statSync(r).isDirectory()) return ficheros(r);
    return (r.endsWith('.ts') || r.endsWith('.js')) && !r.includes('.spec.') ? [r] : [];
  });
}

export function barrer(raiz: string): CatchMudo[] {
  return AMBITOS.flatMap((a) =>
    ficheros(join(raiz, a)).flatMap((f) =>
      buscarCatchMudos(readFileSync(f, 'utf8'), f.slice(raiz.length + 1).replace(/\\/g, '/')),
    ),
  );
}

export interface Comparacion {
  falla: boolean;
  nuevos: CatchMudo[];
  total: number;
  base: number;
}

/** Compara contra la linea base. Solo lo NUEVO rompe: lo viejo esta declarado. */
export function comparar(observados: CatchMudo[], base: string[]): Comparacion {
  const enBase = new Set(base);
  // Se acepta la huella (estable) **y** la forma antigua `fichero:linea`, para que una linea base
  // a medio migrar siga valiendo. Lo nuevo se declara con huella; lo viejo deja de romperse solo.
  const nuevos = observados.filter(
    (c) => !enBase.has(clave(c)) && !enBase.has(`${c.fichero}:${c.linea}`),
  );
  return { falla: nuevos.length > 0, nuevos, total: observados.length, base: base.length };
}

const PASOS_ESPERADOS = ['DEPOSIT_REQUESTED', 'PROVIDER_CREATE', 'CYCLE_DECISION'];

/**
 * Tres estados, y distinguirlos es la mitad de este control.
 *
 * PT-138 — Antes habia dos —`pct` o `null`— y `null` significaba las dos cosas: «no hay ciclos que
 * evaluar» y «no pude consultar». El script imprimia `SIN_DATOS` y **salia con codigo 0**, o sea
 * que un checkpoint que no habia podido medir nada se leia como aprobado.
 *
 * Es exactamente lo que PT-122 dejo escrito al reclasificar `audit:domain` y `audit:reliability`:
 * *en CI la base nace vacia y devolverian `SIN_DATOS` siempre, que alguien acabaria leyendo como
 * verde*. La leccion estaba escrita, y la metrica de al lado la incumplia.
 *
 * - `medido`     — hay ciclos y se contaron. Es el unico que da porcentaje.
 * - `sin_ciclos` — no hay nada que evaluar. **No es un fallo**: una base recien creada es un estado
 *                  legitimo, y hacerlo fallar dejaria CI rojo para siempre sin decir nada util.
 * - `no_medible` — la consulta no se pudo hacer. **Si es un fallo**: no haber podido mirar no es un
 *                  aprobado, que es la regla que `audit:schema` ya aplicaba.
 */
export type EstadoTraza =
  | { estado: 'medido'; pct: number; detalle: string }
  | { estado: 'sin_ciclos'; detalle: string }
  | { estado: 'no_medible'; detalle: string };

/**
 * `trace_completeness`: % de ciclos SETTLED con todos los pasos esperados en su traza.
 *
 * PT-138 — Esto consultaba con `docker exec ironloot-db psql`, asi que **solo funcionaba desde
 * fuera del contenedor**. Dentro —que es donde RULE-15 dice que se ejecuta npm— daba
 * `/bin/sh: 1: docker: not found` y de ahi el `SIN_DATOS`. Ahora habla con la base por
 * `DATABASE_URL`, como el resto del repositorio, y funciona igual en el host, en el contenedor y en
 * CI.
 */
export async function trazaCompleta(): Promise<EstadoTraza> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const [{ total }] = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      "SELECT count(*)::bigint AS total FROM payment_cycles WHERE status='SETTLED'",
    );

    if (Number(total) === 0) {
      return { estado: 'sin_ciclos', detalle: 'no hay ciclos liquidados que evaluar' };
    }

    const pasos = PASOS_ESPERADOS.map((p) => `'${p}'`).join(',');
    const [{ completos }] = await prisma.$queryRawUnsafe<{ completos: bigint }[]>(
      "SELECT count(*)::bigint AS completos FROM payment_cycles c WHERE c.status='SETTLED' AND (" +
        'SELECT count(DISTINCT e.step) FROM payment_cycle_events e ' +
        `WHERE e.reference = c.reference AND e.step IN (${pasos})) = ${PASOS_ESPERADOS.length}`,
    );

    return {
      estado: 'medido',
      pct: Math.round((100 * Number(completos)) / Number(total)),
      detalle: `${completos} de ${total} ciclos liquidados con la traza completa`,
    };
  } catch (e) {
    return { estado: 'no_medible', detalle: (e as Error).message.slice(0, 120) };
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  // PT-138 — Esto resolvia a `/` dentro del contenedor, y el checkpoint contaba **0 silencios
  // contra una linea base de 25**: un numero plausible y mas bajo, que nadie lee como averia.
  const raiz = raizDelMonorepo();
  const rutaBase = join(__dirname, '..', 'observability-baseline.json');

  console.log('=== D3 — Observabilidad y recuperacion ===\n');

  const observados = barrer(raiz);
  const base: string[] = existsSync(rutaBase)
    ? (JSON.parse(readFileSync(rutaBase, 'utf8')) as { silencios: string[] }).silencios
    : [];
  const c = comparar(observados, base);

  console.log(`  silent_failure_count = ${c.total}   (linea base: ${c.base})`);
  if (c.nuevos.length) {
    console.log('\n  NUEVOS catch que no registran ni relanzan:');
    // Se imprime la CLAVE, no la linea: es lo que hay que copiar a la linea base si el silencio se
    // declara. Imprimir la linea invitaba a apuntar algo que caduca a la siguiente edicion.
    for (const n of c.nuevos) console.log(`    ${clave(n)}    (linea ${n.linea})`);
  }

  const t = await trazaCompleta();
  const etiqueta =
    t.estado === 'medido' ? `${t.pct}%` : t.estado === 'sin_ciclos' ? 'SIN CICLOS' : 'NO MEDIBLE';
  console.log(`\n  trace_completeness = ${etiqueta}`);
  console.log(`    ${t.detalle}`);

  console.log('\n  prompt_provenance  = NO_APLICA (sistema determinista, sin LLM)');
  console.log('  fallback_quality   = evaluacion documentada (no automatizable, [R57])');

  // NO MEDIBLE es un fallo, y se dice antes que nada: un checkpoint que no pudo mirar no aprueba.
  if (t.estado === 'no_medible') {
    console.error(
      '\n  FALLA — no se pudo medir `trace_completeness`.\n' +
        '  No haber podido mirar NO es un aprobado. Revisa `DATABASE_URL` y que la base responda.\n' +
        '  Esta salida devolvia codigo 0 hasta PT-138, de modo que un checkpoint ciego se leia\n' +
        '  como verde — la trampa que PT-122 ya habia descrito para las metricas de delta sync.\n',
    );
    process.exit(1);
  }

  if (c.falla) {
    console.error(
      '\n  FALLA — hay `catch` nuevos que no dejan rastro.\n' +
        '  Un fallo que nadie puede observar no es un fallo tolerado: es un fallo oculto.\n' +
        '  Registra el error, o anadelo a `observability-baseline.json` explicando por que no.\n' +
        '  Recuerda F-34: aquel catch TENIA comentario, y la puja en vivo estuvo apagada dias.\n',
    );
    process.exit(1);
  }
  console.log('\n  OK — sin silencios nuevos.');
}

if (require.main === module) {
  main().catch((e) => {
    // Ni siquiera un fallo inesperado puede salir con 0.
    console.error('\n  FALLA — el checkpoint no pudo completarse:', e);
    process.exit(1);
  });
}
