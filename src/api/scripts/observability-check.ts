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
import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

export interface CatchMudo {
  fichero: string;
  linea: number;
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
      out.push({ fichero, linea: texto.slice(0, m.index).split('\n').length });
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
  const nuevos = observados.filter((c) => !enBase.has(`${c.fichero}:${c.linea}`));
  return { falla: nuevos.length > 0, nuevos, total: observados.length, base: base.length };
}

const CONTENEDOR = process.env.PTSA_DB_CONTAINER ?? 'ironloot-db';
const PASOS_ESPERADOS = ['DEPOSIT_REQUESTED', 'PROVIDER_CREATE', 'CYCLE_DECISION'];

/** `trace_completeness`: % de ciclos SETTLED con todos los pasos esperados en su traza. */
export function trazaCompleta(): { pct: number | null; detalle: string } {
  try {
    const q = (sql: string): string =>
      execSync(`docker exec ${CONTENEDOR} psql -U ironloot -d ironloot_db -t -A -c "${sql}"`, {
        encoding: 'utf8',
      }).trim();

    const total = Number(q("SELECT count(*) FROM payment_cycles WHERE status='SETTLED'"));
    if (!total) {
      return { pct: null, detalle: 'SIN DATOS: no hay ciclos liquidados que evaluar' };
    }
    const pasos = PASOS_ESPERADOS.map((p) => `'${p}'`).join(',');
    const completos = Number(
      q(
        "SELECT count(*) FROM payment_cycles c WHERE c.status='SETTLED' AND (" +
          `SELECT count(DISTINCT e.step) FROM payment_cycle_events e ` +
          `WHERE e.reference = c.reference AND e.step IN (${pasos})) = ${PASOS_ESPERADOS.length}`,
      ),
    );
    return {
      pct: Math.round((100 * completos) / total),
      detalle: `${completos} de ${total} ciclos liquidados con la traza completa`,
    };
  } catch (e) {
    return { pct: null, detalle: `SIN DATOS: ${(e as Error).message.slice(0, 60)}` };
  }
}

function main(): void {
  const raiz = join(__dirname, '..', '..', '..');
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
    for (const n of c.nuevos) console.log(`    ${n.fichero}:${n.linea}`);
  }

  const t = trazaCompleta();
  console.log(`\n  trace_completeness = ${t.pct === null ? 'SIN_DATOS' : t.pct + '%'}`);
  console.log(`    ${t.detalle}`);

  console.log('\n  prompt_provenance  = NO_APLICA (sistema determinista, sin LLM)');
  console.log('  fallback_quality   = evaluacion documentada (no automatizable, [R57])');

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
  main();
}
