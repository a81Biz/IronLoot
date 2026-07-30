import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-189 — **Una afirmación de estado en `docs-v2` no puede quedarse sin verificar para siempre.**
 *
 * ## El defecto que esta guarda existe para impedir
 *
 * Medido el 2026-07-29: **74 líneas en 22 documentos** declaraban como defectos vigentes nueve `AUD-XXX` que
 * llevaban **meses corregidos**. Una de ellas —`RN-64`— no estaba desactualizada: describía **el
 * comportamiento defectuoso como si fuera la regla de negocio**, la misma que PT-174 tuvo que corregir porque
 * permitía al vendedor liberar su propio dinero.
 *
 * Y el registro de hallazgos afirmaba **«36/36 corregidos»** cuando cinco no lo estaban, y decía que su columna
 * de recomendación «indica el PT que lo resolvió» cuando **sólo dos de 36 filas citan un PT**.
 *
 * Nada de eso apareció por un cambio reciente. Apareció porque **nadie lo había vuelto a mirar**, y ninguna
 * guarda cubría esta clase: `11-Conventions.md` tiene guarda, `10-Technical-Debt.md` tiene guarda, y las
 * afirmaciones de estado de `docs-v2` no tenían ninguna.
 *
 * ## Lo que comprueba, y por qué no comprueba más
 *
 * **No verifica si la afirmación es cierta** — eso exige leer código y no se puede automatizar sin volver a
 * caer en la heurística frágil que PT-188 tuvo que retirar. Lo que comprueba es más modesto y suficiente:
 *
 *   **cada `AUD-XXX` citado con una señal de problema tiene que aparecer en la tabla de veredictos del
 *   registro**, y esa tabla dice si está corregido, abierto o **sin verificar**.
 *
 * Es decir: se permite decir «no lo sé» —lo que no se permite es **no haberlo mirado nunca**. Un `AUD` que
 * alguien cite como defecto sin que conste su veredicto hace fallar esta prueba, y arreglarla obliga a medirlo.
 *
 * Es el mismo criterio que `deuda-no-determinada-vigente.spec.ts` aplica a `ND-XXX`: lo que no se puede
 * comprobar se **declara**, y la declaración es lo que se vigila.
 */
const RAIZ = raizDelMonorepo();
const DOCS_V2 = join(RAIZ, 'docs-v2');
const REGISTRO = join(DOCS_V2, 'transversal', 'Registro-de-Hallazgos.md');

/** Ficheros históricos: se leen, no se actualizan. */
const HISTORICOS = new Set(['Informe-Remediacion.md', 'Registro-de-Hallazgos.md']);

/** Señales de que una línea declara un problema vigente. */
const SENALES = [
  '⚠',
  '✗',
  'no cumple',
  'No cumple',
  'drift',
  'mockead',
  'sin implementar',
  'no aplicado',
  'no existe',
  'stub',
];

function markdowns(dir: string = DOCS_V2): string[] {
  const salida: string[] = [];

  for (const e of readdirSync(dir)) {
    if (e === 'archive') continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) salida.push(...markdowns(p));
    else if (e.endsWith('.md') && !HISTORICOS.has(e)) salida.push(p);
  }

  return salida;
}

/**
 * Los `AUD-XXX` que una línea presenta como **defecto vivo**.
 *
 * ## Por qué el listón está aquí y no más arriba
 *
 * La primera versión exigía la palabra «corregido/abierto/sin verificar» en **toda** línea con señal de
 * problema. Acusó a 18 documentos — y la mayoría **decían la verdad**: `AUD-010` sigue abierto, y un `⚠️` a su
 * lado es exacto. Obligar a anotar cada uno habría sido un impuesto de prosa sobre las líneas correctas, y
 * habría enseñado a escribir para la guarda.
 *
 * El defecto real era otro y sólo uno: **presentar como defecto vivo algo que ya está corregido**. Eso es lo
 * que se prohíbe. Una línea que declara un hallazgo abierto no necesita permiso de nadie.
 */
export function presentadosComoDefecto(texto: string): string[] {
  const salida: string[] = [];

  for (const linea of texto.split('\n')) {
    if (!SENALES.some((s) => linea.includes(s))) continue;
    // Si la línea ya dice el estado, no es una afirmación obsoleta: es una afirmación fechada.
    if (/corregido|abierto|sin verificar|limitación declarada/i.test(linea)) continue;

    for (const m of linea.matchAll(/\bAUD-(\d{3})\b/g)) {
      salida.push(`AUD-${m[1]}`);
    }
  }

  return [...new Set(salida)];
}

/**
 * Los veredictos que el registro declara, leídos **sólo de la tabla de veredictos**.
 *
 * Se parsea la tabla y no la prosa porque la primera versión leía cualquier línea con un `AUD` y una palabra de
 * estado: la prosa de la cabecera —que explica *por qué* «36/36» era inexacto— hacía que `AUD-016` saliera
 * «corregido» por aparecer en un párrafo que contiene esa palabra. **Una tabla es un sitio; un párrafo es una
 * coincidencia.**
 *
 * Formato exigido: `| AUD-NNN | veredicto | … `, con o sin negritas.
 */
export function veredictos(registro: string): Map<string, string> {
  const salida = new Map<string, string>();
  const FILA = /^\|\s*\*{0,2}AUD-(\d{3})\*{0,2}\s*\|\s*\*{0,2}([^|*]+?)\*{0,2}\s*\|/gm;

  for (const m of registro.matchAll(FILA)) {
    const v = m[2].trim().toLowerCase();
    if (['corregido', 'abierto', 'sin verificar', 'limitación declarada'].includes(v)) {
      salida.set(`AUD-${m[1]}`, v);
    }
  }

  return salida;
}

describe('Toda afirmacion de estado sobre un AUD tiene veredicto — PT-189', () => {
  const registro = readFileSync(REGISTRO, 'utf-8');
  const conocidos = veredictos(registro);

  it('C1: ningun documento presenta como defecto vivo un AUD que la tabla declara corregido', () => {
    // **Este es el defecto medido**: 74 líneas en 22 documentos declaraban como vigentes nueve hallazgos
    // corregidos hacía meses. Una de ellas describía el comportamiento defectuoso **como si fuera la regla de
    // negocio**.
    const acusados: string[] = [];

    for (const f of markdowns()) {
      const vivos = presentadosComoDefecto(readFileSync(f, 'utf-8')).filter(
        (id) => conocidos.get(id) === 'corregido',
      );
      if (vivos.length) acusados.push(`${f.slice(f.indexOf('docs-v2'))}: ${vivos.join(', ')}`);
    }

    expect(acusados).toEqual([]);
  });

  it('C2: el registro declara un veredicto para cada AUD citado en docs-v2', () => {
    const citados = new Set<string>();

    for (const f of markdowns()) {
      for (const m of readFileSync(f, 'utf-8').matchAll(/\bAUD-(\d{3})\b/g)) {
        citados.add(`AUD-${m[1]}`);
      }
    }

    const sinVeredicto = [...citados].filter((id) => !conocidos.has(id)).sort();

    expect(sinVeredicto).toEqual([]);
  });

  it('C3: el registro NO afirma un recuento redondo sin desglosarlo', () => {
    // La cabecera decía «36/36 hallazgos corregidos» y cinco no lo estaban. Un recuento así se lee y se cree.
    // Si vuelve a aparecer un «N/N corregidos», tiene que ir con el desglose que lo sostiene.
    const redondos = [...registro.matchAll(/(\d+)\s*\/\s*\1\s+hallazgos?\s+corregidos/gi)];

    for (const m of redondos) {
      const contexto = registro.slice(Math.max(0, (m.index ?? 0) - 600), (m.index ?? 0) + 600);
      expect(contexto).toMatch(/sin verificar|ABIERTO|no era exacto|Nota original/i);
    }
  });

  describe('casos de control', () => {
    it('AC-01: una linea con senal y veredicto NO se acusa', () => {
      expect(presentadosComoDefecto('| algo | ⚠️ AUD-012 abierto |')).toEqual([]);
      expect(presentadosComoDefecto('| algo | ✗ AUD-008 corregido |')).toEqual([]);
    });

    it('AC-02: una linea con senal y SIN veredicto si se acusa', () => {
      expect(presentadosComoDefecto('| algo | ⚠️ roto (AUD-099) |')).toEqual(['AUD-099']);
    });

    it('AC-03: una linea que cita un AUD SIN senal de problema no se acusa', () => {
      // Citar un hallazgo para explicar de dónde viene una decisión es legítimo y no es una afirmación de
      // estado. Si esto acusara, la guarda enseñaría a dejar de citar los hallazgos — lo contrario de lo
      // que se quiere.
      expect(presentadosComoDefecto('La decisión nació de AUD-045, ver el registro.')).toEqual([]);
    });

    it('AC-04: «sin verificar» cuenta como veredicto — se permite no saber, no se permite no mirar', () => {
      expect(presentadosComoDefecto('| algo | ⚠️ AUD-077 sin verificar |')).toEqual([]);
      // La forma que se parsea es la de la tabla de veredictos: el estado va en la SEGUNDA columna. Con el
      // veredicto perdido al final de una fila larga, `veredictos` no lo lee — y eso es correcto: si se
      // aceptara en cualquier columna, volveríamos a leer coincidencias en vez de un sitio.
      expect(veredictos('| AUD-077 | sin verificar | nadie lo ha medido |').get('AUD-077')).toBe(
        'sin verificar',
      );
      expect(
        veredictos('| AUD-078 | ALTA | algo | — | sin verificar |').get('AUD-078'),
      ).toBeUndefined();
    });

    it('AC-05: el registro no esta vacio — una guarda sobre un fichero vacio pasa sin comprobar nada', () => {
      expect(conocidos.size).toBe(36);
    });
  });
});
