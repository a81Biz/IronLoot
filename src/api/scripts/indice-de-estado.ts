/**
 * PT-187 — Genera el ÍNDICE DE ESTADO de `HISTORY.log`.
 *
 * ## El problema que resuelve
 *
 * `HISTORY.log` es **append-only** por regla, así que cuando un PT se cierra el cierre se anota **más abajo**, en
 * un bloque de VoBo. La consecuencia: **102 entradas siguen diciendo `Status: VALIDATION_PENDING` estando
 * cerradas**, y quien lee una entrada ve «pendiente».
 *
 * Eso costó tiempo real: se reportó PT-147 como pendiente cuando llevaba cerrado desde el 2026-07-29, y el humano
 * lo señaló con razón — *«¿por qué PT-147 sigue pendiente si se ha pedido más de una vez que se cierre?»*. No
 * seguía pendiente. Lo decía el fichero.
 *
 * La guarda RULE-34 ya recorre el log cronológicamente y **entiende** que el `Status:` es histórico, por eso no
 * acusa en falso. Un lector humano no tiene esa compensación.
 *
 * ## Por qué un índice y no reescribir los `Status:`
 *
 * Reescribir las 102 líneas se lee mejor de inmediato **y falsifica el registro**: borraría el momento en que se
 * supo cada cosa, que es justo lo que la regla append-only existe para preservar. El índice **añade** al final,
 * no toca nada, y da un sitio único donde leer el estado real.
 *
 * ## Cómo decide el estado
 *
 * 1. Estado declarado en la entrada (`Status:`).
 * 2. Si un bloque **posterior** lo nombra en un cierre con VoBo, gana el cierre — con la línea donde consta.
 * 3. Las **declaraciones de totalidad** («toda la validación pendiente», «dalos a todos por validados») cierran
 *    todo lo que estuviera pendiente **hasta ese punto**. Es el mismo criterio que usa la guarda de RULE-34, y
 *    está aquí por la misma razón: su primera versión acusó a treinta PT antiguos por no entenderlas.
 *
 * Se ejecuta con `npm run indice:estado` y lo vigila `indice-de-estado-al-dia.spec.ts`.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from './raiz-monorepo';

const HISTORY = join(raizDelMonorepo(), 'docs', 'implementation', 'HISTORY.log');

/** Marca de inicio del índice. Todo lo que haya después se regenera; lo de antes no se toca nunca. */
export const MARCA = '## ÍNDICE DE ESTADO — generado, no escrito a mano';

type Entrada = {
  /** Identificadores del encabezado. Un encabezado puede agrupar varios (`## PT-149 / PT-150 — …`). */
  pts: string[];
  titulo: string;
  linea: number;
  estado: string;
  /** Línea del bloque que lo cerró, si lo cerró uno posterior. */
  cerradoEn?: number;
};

/** Frases que declaran un cierre en bloque de **todo** lo pendiente hasta ese punto. */
const TOTALIDAD = [
  'toda la validacion pendiente',
  'toda la validación pendiente',
  'dalos a todos por validados',
  'las validaciones dalas por validado',
];

const ESTADOS_ABIERTOS = new Set(['VALIDATION_PENDING', 'IN_PROGRESS', 'BLOCKED', 'PENDING']);

export function analizar(log: string): Entrada[] {
  const lineas = log.split('\n');
  const entradas: Entrada[] = [];

  // 1) Las entradas, con su estado declarado.
  lineas.forEach((l, i) => {
    const m = /^## ((?:PT-\d+)(?:\s*\/\s*PT-\d+)*)\s*(?:—|-)\s*(.*)$/.exec(l);
    if (!m) return;

    const pts = m[1].split('/').map((p) => p.trim());
    let estado = 'SIN_DECLARAR';

    for (let j = i + 1; j < Math.min(i + 12, lineas.length); j++) {
      if (lineas[j].startsWith('## ')) break;
      const s = /^Status:\s*(\S+)/.exec(lineas[j]);
      if (s) {
        estado = s[1];
        break;
      }
    }

    entradas.push({ pts, titulo: m[2].trim(), linea: i + 1, estado });
  });

  // 2) Los cierres posteriores. Se recorre de arriba abajo para que «hasta este punto» signifique algo.
  lineas.forEach((l, i) => {
    const bajo = l.toLowerCase();
    const esTotalidad = TOTALIDAD.some((t) => bajo.includes(t));
    const nombrados = [...l.matchAll(/PT-(\d+)/g)].map((m) => `PT-${m[1]}`);
    const esCierre = /vobo|closed|validad/i.test(l);

    if (!esCierre && !esTotalidad) return;

    for (const e of entradas) {
      if (e.linea >= i + 1) continue; // sólo cierra lo anterior
      if (e.cerradoEn) continue;

      // Se anota para **todas** las entradas, no sólo las que se declararon abiertas: `C4` de la guarda
      // necesita saber si un BUG escrito `DONE` tiene constancia de quién lo autorizó. Dos preguntas, una
      // sola implementación — porque dos implementaciones del mismo criterio acaban discrepando.
      if (esTotalidad || e.pts.some((p) => nombrados.includes(p))) {
        e.cerradoEn = i + 1;
      }
    }
  });

  return entradas;
}

/**
 * Estado real: el cierre posterior manda **sólo si lo declarado estaba abierto**. Un `DONE` no se reescribe como
 * `CLOSED` por el hecho de que un bloque posterior lo mencione — son cosas distintas y el índice no debe
 * confundirlas.
 */
export function estadoReal(e: Entrada): string {
  if (e.cerradoEn && ESTADOS_ABIERTOS.has(e.estado)) return 'CLOSED';
  return e.estado;
}

/**
 * Los bloques de cierre con VoBo, **completos**.
 *
 * La primera versión de esto vivía en la guarda, y su regex terminaba en `(?=\n## |$)` con la bandera
 * `m`. Con `m`, `$` casa **fin de línea** y no fin de texto, así que cada bloque se cortaba en su encabezado.
 *
 * El resultado: la guarda comprobaba sólo los **títulos**, y acusaba de «sin constancia» a cinco PT que estaban
 * nombrados en el **cuerpo** del bloque de al lado. Tercera vez en la jornada que un caso mío mide otra cosa que
 * la que dice medir — por eso esto es una función con nombre y no un regex dentro de un `expect`.
 */
export function bloquesDeCierre(log: string): string {
  const lineas = log.split('\n');
  const trozos: string[] = [];

  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i].startsWith('## CIERRE CON VoBo')) continue;

    let j = i + 1;
    while (j < lineas.length && !lineas[j].startsWith('## ')) j++;
    trozos.push(lineas.slice(i, j).join('\n'));
  }

  return trozos.join('\n');
}

export const ABIERTOS = ESTADOS_ABIERTOS;

export function generar(log: string): string {
  const entradas = analizar(log);
  const abiertos = entradas.filter((e) => ESTADOS_ABIERTOS.has(estadoReal(e)));
  const sinDeclarar = entradas.filter((e) => estadoReal(e) === 'SIN_DECLARAR');

  const filas = entradas.map((e) => {
    const real = estadoReal(e);
    const nota = e.cerradoEn ? `cerrado en la línea ${e.cerradoEn}` : e.estado === real ? '—' : '';
    return `| ${e.pts.join(' / ')} | ${e.linea} | \`${e.estado}\` | **${real}** | ${nota} |`;
  });

  return [
    '',
    '---',
    '',
    MARCA,
    '',
    '**No edites esta sección a mano.** La genera `npm run indice:estado` desde el propio fichero, y la vigila',
    '`indice-de-estado-al-dia.spec.ts`.',
    '',
    'Existe porque `HISTORY.log` es **append-only**: un cierre se anota más abajo, en un bloque de VoBo, así que la',
    'línea `Status:` de una entrada **es histórica y no el estado de hoy**. Reescribirla se leería mejor y',
    'falsificaría el registro. Esto añade, no toca.',
    '',
    `**${entradas.length}** encabezados · **${abiertos.length}** realmente abiertos · **${sinDeclarar.length}** sin \`Status:\` declarado.`,
    '',
    '| PT | Línea | `Status:` escrito | Estado real | Dónde consta el cierre |',
    '|---|---:|---|---|---|',
    ...filas,
    '',
  ].join('\n');
}

function main(): void {
  const log = readFileSync(HISTORY, 'utf-8');
  const corte = log.indexOf(MARCA);
  // Se corta desde el separador que precede a la marca, para no acumular `---` en cada regeneración.
  const inicioBloque = corte < 0 ? -1 : log.lastIndexOf('\n---', corte);
  const previo = corte < 0 ? log.replace(/\s*$/, '') : log.slice(0, inicioBloque);

  // PT-191 — **Si hay contenido entre el separador y la marca, se aborta en vez de borrarlo.**
  //
  // Todo lo que va desde ese `---` hasta el final se considera bloque generado y se reemplaza. Una
  // entrada nueva escrita **después** del separador entra en esa zona y **desaparece en la siguiente
  // regeneración, sin error y sin traza** — pasó dos veces al anotar este mismo PT, y las dos el
  // comando dijo que todo había ido bien.
  //
  // En un fichero cuyo valor entero es ser **append-only**, una herramienta que borra en silencio es
  // peor que una que no existe: la primera vez se pierde el trabajo, y la segunda ya nadie se fía del
  // registro. Se prefiere abortar nombrando el problema. Es RULE-17 aplicada a un fichero en vez de a
  // una variable de entorno: **mal colocado no puede parecerse a bien colocado.**
  if (corte >= 0) {
    const zona = log.slice(inicioBloque, corte);
    const intrusa = /^##\s+PT-\d+/m.exec(zona);
    if (intrusa) {
      console.error(
        `[indice:estado] ABORTADO — hay una entrada («${intrusa[0].trim()}») entre el separador ` +
          `y el ÍNDICE DE ESTADO.\n` +
          `  Todo eso se reemplaza al regenerar, así que la entrada se perdería en silencio.\n` +
          `  Muévela ARRIBA del «---» que precede al índice y vuelve a ejecutar.`,
      );
      process.exit(1);
    }
  }

  const salida = previo + generar(previo);
  writeFileSync(HISTORY, salida, 'utf-8');

  const entradas = analizar(previo);
  const abiertos = entradas.filter((e) => ESTADOS_ABIERTOS.has(estadoReal(e)));
  console.log(
    `[indice:estado] ${entradas.length} encabezados · ${abiertos.length} realmente abiertos`,
  );
  for (const e of abiertos)
    console.log(`   ABIERTO  ${e.pts.join(' / ')}  (linea ${e.linea})  ${e.estado}`);
}

if (require.main === module) main();
