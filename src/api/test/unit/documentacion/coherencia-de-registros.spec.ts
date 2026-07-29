import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-140 (RULE-20) — Los registros de trabajo no se contradicen entre si.
 *
 * La pregunta que origina esto fue del humano: *«se han realizado ya varias fases y al parecer
 * siempre quedan cosas por hacer y nunca se cierran completo»*. La respuesta resulto ser
 * estructural, no de disciplina: **un pendiente podia vivir en doce sitios, y ninguno declaraba cual
 * mandaba**. De los doce, **uno solo** tenia guarda automatica.
 *
 * Lo que eso producia, medido el 2026-07-28:
 *
 *   - `PENDING_TASKS.md` marcaba `PENDING` cosas hechas (`PT-104`, `TD-014`).
 *   - Declaraba `BLOCKED` **44 filas** de PT-127..130, los cuatro ya fusionados.
 *   - Pedia «empujar master» cuando `master` ya estaba empujado.
 *   - **PT-129 y PT-130 no tenian entrada en `HISTORY.log`**, con evidencia y commits fusionados.
 *
 * Ninguna de esas filas era trabajo sin hacer. Todas eran **trabajo hecho que ningun registro
 * recogio**.
 *
 * ## Solo lo determinista
 *
 * Esta guarda no lee prosa. Una que obligue a redactar de cierta forma para pasar enseña a escribir
 * para el linter, y entonces el documento deja de decir la verdad. Por eso la contradiccion interna
 * de `10-Technical-Debt.md` —que la hay— no la caza nadie, y se acepta a conciencia.
 */
const RAIZ = raizDelMonorepo();

const PENDING_TASKS = join(RAIZ, 'docs/implementation/PENDING_TASKS.md');
const HISTORY = join(RAIZ, 'docs/implementation/HISTORY.log');
const DEUDA = join(RAIZ, 'docs/enterprise-documentation/10-Technical-Debt.md');
const EVIDENCIA = join(RAIZ, 'docs/implementation/evidence');

/** Los `PT-XXX` que una linea de `PENDING_TASKS` marca como pendientes. */
export function ptPendientes(md: string): string[] {
  const pendientes = new Set<string>();

  for (const linea of md.split('\n')) {
    if (/^\s*#/.test(linea)) continue; // titulos de seccion, no filas
    if (!/\b(PENDING|BLOCKED)\b/.test(linea)) continue;
    for (const m of linea.matchAll(/\b(PT-\d{3})\b/g)) pendientes.add(m[1]);
  }

  return [...pendientes].sort();
}

/**
 * Los `PT-XXX` que `HISTORY.log` declara terminados, con su estado.
 *
 * `HISTORY.log` agrupa: hay cabeceras como `## PT-090 … PT-104 — VALIDACION` que cierran quince PT
 * de una vez, y otras como `## PT-078 / PT-079 / PT-080`. Un analizador que solo mirase el primer
 * `PT-XXX` de la linea acusaria de «sin entrada» a catorce PT que SI estan registrados.
 *
 * Eso importa mas de lo que parece: **una guarda ruidosa acaba desactivada**, y entonces deja de
 * proteger tambien lo que si detectaba.
 */
export function ptEnHistoria(log: string): Map<string, string> {
  const estados = new Map<string, string>();
  const lineas = log.split('\n');

  for (let i = 0; i < lineas.length; i++) {
    if (!lineas[i].startsWith('## ')) continue;

    const cabecera = lineas[i];
    const enLinea = [...cabecera.matchAll(/PT-(\d{3})/g)].map((m) => Number(m[1]));
    if (enLinea.length === 0) continue;

    // Un rango —`PT-090 … PT-104`, `PT-105 ... PT-108`— cubre todo lo que hay en medio.
    const esRango = /PT-\d{3}\s*(?:…|\.\.\.)\s*PT-\d{3}/.test(cabecera);
    const cubiertos = esRango
      ? Array.from(
          { length: Math.max(...enLinea) - Math.min(...enLinea) + 1 },
          (_, k) => Math.min(...enLinea) + k,
        )
      : enLinea;

    // El `Status:` de la entrada esta en las lineas siguientes.
    let estado = 'REGISTRADO';
    for (let j = i + 1; j < Math.min(i + 6, lineas.length); j++) {
      const st = lineas[j].match(/^Status:\s*(\w+)/);
      if (st) {
        estado = st[1];
        break;
      }
    }

    for (const n of cubiertos) {
      const id = `PT-${String(n).padStart(3, '0')}`;
      if (!estados.has(id)) estados.set(id, estado);
    }
  }

  return estados;
}

/** Los `TD-XXX` que `10-Technical-Debt.md` declara cerrados. */
export function tdCerradas(md: string): string[] {
  const cerradas = new Set<string>();
  const lineas = md.split('\n');

  for (let i = 0; i < lineas.length; i++) {
    const cab = lineas[i].match(/^###\s+(TD-\d{3})/);
    if (!cab) continue;
    // El `Status:` va inmediatamente debajo del titulo de la deuda.
    const siguiente = lineas.slice(i + 1, i + 3).join(' ');
    if (/Status:.*(CERRADA|RESUELTA)/i.test(siguiente)) cerradas.add(cab[1]);
  }

  return [...cerradas].sort();
}

/** Los `TD-XXX` que `PENDING_TASKS` lista como pendientes. */
export function tdPendientes(md: string): string[] {
  const pendientes = new Set<string>();

  for (const linea of md.split('\n')) {
    if (/^\s*#/.test(linea)) continue;
    if (!/\b(PENDING|BLOCKED)\b/.test(linea)) continue;
    for (const m of linea.matchAll(/\b(TD-\d{3})\b/g)) pendientes.add(m[1]);
  }

  return [...pendientes].sort();
}

describe('Los registros de trabajo no se contradicen — RULE-20 (PT-140)', () => {
  const pending = existsSync(PENDING_TASKS) ? readFileSync(PENDING_TASKS, 'utf8') : '';
  const history = existsSync(HISTORY) ? readFileSync(HISTORY, 'utf8') : '';
  const deuda = existsSync(DEUDA) ? readFileSync(DEUDA, 'utf8') : '';

  it('los tres registros existen y tienen contenido', () => {
    // Si alguno faltara, las comprobaciones de abajo pasarian vacuamente.
    expect(pending.length).toBeGreaterThan(500);
    expect(history.length).toBeGreaterThan(500);
    expect(deuda.length).toBeGreaterThan(500);
  });

  it('C1: ningun PT marcado PENDING/BLOCKED figura terminado en HISTORY.log', () => {
    const terminados = ptEnHistoria(history);

    const contradictorios = ptPendientes(pending)
      .filter((pt) => terminados.has(pt))
      .map((pt) => `${pt}: PENDING_TASKS dice pendiente, HISTORY.log dice ${terminados.get(pt)}`);

    expect(contradictorios).toEqual([]);
  });

  it('C2: todo PT con carpeta de evidencia tiene entrada en HISTORY.log', () => {
    // Esta comprobacion sola habria cazado PT-129 y PT-130, que tenian evidencia, commits
    // fusionados y hallazgos PTSA cerrados — y ninguna linea en el registro que FDGE declara
    // fuente de verdad.
    const conEvidencia = existsSync(EVIDENCIA)
      ? readdirSync(EVIDENCIA).filter((d) => /^PT-\d{3}$/.test(d))
      : [];
    const enHistoria = ptEnHistoria(history);

    const sinEntrada = conEvidencia.filter((pt) => !enHistoria.has(pt)).sort();

    expect(sinEntrada).toEqual([]);
  });

  it('C3: ninguna TD cerrada figura pendiente en PENDING_TASKS', () => {
    const cerradas = new Set(tdCerradas(deuda));

    const contradictorias = tdPendientes(pending)
      .filter((td) => cerradas.has(td))
      .map((td) => `${td}: 10-Technical-Debt la da por cerrada y PENDING_TASKS la lista pendiente`);

    expect(contradictorias).toEqual([]);
  });

  describe('casos de control', () => {
    it('AC-01: un PT pendiente que HISTORY declara DONE se acusa', () => {
      const pendiente = ptPendientes('| **PT-999** | algo | PENDING |');
      const hist = ptEnHistoria('## PT-999 — BUG: x\nDate: hoy\nStatus: DONE\n');

      expect(pendiente).toEqual(['PT-999']);
      expect(hist.get('PT-999')).toBe('DONE');
    });

    it('AC-02: un PT pendiente SIN entrada en historia es legitimo', () => {
      // Es el estado normal de un trabajo que no ha empezado. Acusarlo haria la guarda insufrible.
      const hist = ptEnHistoria('## PT-001 — otro\nStatus: DONE\n');

      expect(hist.has('PT-999')).toBe(false);
    });

    it('AC-03: un titulo de seccion no cuenta como fila pendiente', () => {
      // `## 1. Trabajo realmente PENDING` es una cabecera, no una fila de tabla.
      expect(ptPendientes('## PT-127 … PT-130 — los cuatro hallazgos PENDING')).toEqual([]);
    });

    it('AC-04: `Status: VALIDATION_PENDING` cuenta como terminado', () => {
      // Terminado y esperando al humano. Si `PENDING_TASKS` lo lista como trabajo pendiente, miente.
      expect(ptEnHistoria('## PT-500 — x\nStatus: VALIDATION_PENDING\n').get('PT-500')).toBe(
        'VALIDATION_PENDING',
      );
    });

    it('AC-05: una TD cerrada se detecta por su `Status:`', () => {
      const md = '### TD-014 — algo\n**Status:** ✅ **CERRADA 2026-07-27 por PT-105.**\n';

      expect(tdCerradas(md)).toEqual(['TD-014']);
    });

    it('AC-06: una TD abierta no se cuenta como cerrada', () => {
      expect(
        tdCerradas('### TD-016 — otra\n**Status: ABIERTA — registrada 2026-07-28.**\n'),
      ).toEqual([]);
    });
  });
});
