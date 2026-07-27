/**
 * PT-118 (PTSA H-008) — Checkpoint D2: vulnerabilidades en dependencias de produccion.
 *
 * `audit-scope.yaml` declara este checkpoint desde el 23-jun. No existia. La consecuencia se
 * midio: H-008 llego con **34 dias de retraso**, con 71 avisos en produccion y uno alcanzable
 * **sin autenticar** contra la puja en vivo. Un checkpoint previsto y no ejecutado es peor que no
 * tenerlo: da por cubierta un area que nadie mira.
 *
 * Compara contra una **linea base** y no contra un umbral. `--audit-level=high` fallaria desde el
 * primer dia por las 27 ya triadas: el CI quedaria rojo permanente y alguien lo desactivaria. Asi
 * es como muere un control — no se borra, se ignora hasta que estorba.
 *
 * Uso:  npm run audit:check
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type Severidad = 'low' | 'moderate' | 'high' | 'critical' | string;

export interface Aviso {
  nombre: string;
  severidad: Severidad;
  /** Por donde entra: titulo del aviso o cadena de dependencias. */
  via: string;
}

export interface Baseline {
  generado: string;
  motivo: string;
  avisos: Record<string, Severidad>;
}

export interface Resultado {
  falla: boolean;
  motivo: string;
  nuevos: Aviso[];
  agravados: { nombre: string; antes: Severidad; ahora: Severidad }[];
  sobrantes: string[];
}

const ORDEN: Record<string, number> = { low: 1, moderate: 2, high: 3, critical: 4 };
const nivel = (s: Severidad): number => ORDEN[s] ?? 0;

/**
 * Compara lo observado contra la linea base.
 *
 * Se compara **paquete y severidad**, nunca la cifra total: 27 avisos hoy y 27 manana puede ser un
 * arreglo y una entrada nueva, y el numero no lo distingue.
 */
export function comparar(observados: Aviso[], base: Baseline | null): Resultado {
  if (!base) {
    // No pasar en silencio: si la ausencia de linea base dejara pasar, bastaria con borrar el
    // fichero para desactivar el control. Es la leccion de los `catch` mudos de F-34.
    return {
      falla: true,
      motivo:
        'No hay linea base (`security-baseline.json`). Generala con `npm run audit:baseline` ' +
        'y revisa lo que incluye antes de commitearla.',
      nuevos: [],
      agravados: [],
      sobrantes: [],
    };
  }

  const nuevos = observados.filter((a) => !(a.nombre in base.avisos));
  const agravados = observados
    .filter((a) => a.nombre in base.avisos && nivel(a.severidad) > nivel(base.avisos[a.nombre]))
    .map((a) => ({ nombre: a.nombre, antes: base.avisos[a.nombre], ahora: a.severidad }));
  const vistos = new Set(observados.map((a) => a.nombre));
  const sobrantes = Object.keys(base.avisos).filter((n) => !vistos.has(n));

  const falla = nuevos.length > 0 || agravados.length > 0;
  return {
    falla,
    motivo: falla
      ? `${nuevos.length} aviso(s) nuevo(s) y ${agravados.length} agravado(s) respecto a la linea base`
      : 'Sin novedades respecto a la linea base',
    nuevos,
    agravados,
    sobrantes,
  };
}

/** Los avisos de paquetes con advertencia propia (no las propagaciones de sus padres). */
export function leerAvisos(json: string): Aviso[] {
  const d = JSON.parse(json) as {
    vulnerabilities?: Record<string, { severity: string; via?: unknown[] }>;
  };
  return Object.entries(d.vulnerabilities ?? {})
    .filter(([, v]) => (v.via ?? []).some((a) => typeof a === 'object'))
    .map(([nombre, v]) => ({
      nombre,
      severidad: v.severity,
      via:
        ((v.via ?? []).find((a) => typeof a === 'object') as { title?: string } | undefined)
          ?.title ?? '(sin titulo)',
    }));
}

function main(): void {
  const raiz = join(__dirname, '..');
  let salida: string;
  try {
    salida = execSync('npm audit --omit=dev --json', {
      cwd: raiz,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    // `npm audit` sale con codigo != 0 cuando hay avisos: la salida sigue siendo valida.
    salida = (e as { stdout?: string }).stdout ?? '';
    if (!salida) {
      console.error('[audit:check] npm audit no devolvio nada. Revisa la instalacion.');
      process.exit(2);
    }
  }

  const rutaBase = join(raiz, 'security-baseline.json');
  const base = existsSync(rutaBase)
    ? (JSON.parse(readFileSync(rutaBase, 'utf8')) as Baseline)
    : null;

  const observados = leerAvisos(salida);
  const r = comparar(observados, base);

  console.log(`[audit:check] ${observados.length} paquete(s) con aviso propio en produccion.`);
  if (base) {
    console.log(
      `[audit:check] Linea base de ${base.generado}: ${Object.keys(base.avisos).length} — ${base.motivo}`,
    );
  }

  if (r.sobrantes.length) {
    console.log(
      `[audit:check] Ya no aparecen y se pueden quitar de la base: ${r.sobrantes.join(', ')}`,
    );
  }

  if (!r.falla) {
    console.log(`[audit:check] OK — ${r.motivo}.`);
    return;
  }

  console.error(`\n[audit:check] FALLA — ${r.motivo}.\n`);
  for (const n of r.nuevos) {
    console.error(`  NUEVO      ${n.severidad.padEnd(9)} ${n.nombre}`);
    console.error(`             ${n.via}`);
  }
  for (const a of r.agravados) {
    console.error(`  AGRAVADO   ${a.antes} -> ${a.ahora}   ${a.nombre}`);
  }
  console.error(
    '\n  Que hacer: triar cada uno. Si se puede subir dentro del MISMO mayor, subelo.\n' +
      '  Si exige un salto mayor, registralo en TD-015 y anadelo a `security-baseline.json`\n' +
      '  con su motivo. No uses `npm audit fix --force` en un servidor de pagos.\n',
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
