import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-103 (F-33) — El registro de deuda no puede contradecir a la historia.
 *
 * Cerrar una deuda son **dos** escrituras: el código y `10-Technical-Debt.md`. La primera la
 * obliga el compilador. La segunda no la obligaba nada — y el registro acabó declarando `Open`
 * cuatro deudas que estaban cerradas (TD-003, TD-005, TD-010, TD-012).
 *
 * Lo grave es que era **la segunda vez**: PT-090 existía justamente para corregir que el registro
 * mintiera, y tres PT después volvía a mentir. La conclusión no es «hay que tener más cuidado»:
 * es que la disciplina sin mecanismo caduca. Esta guarda es el mecanismo.
 *
 * Un registro de deuda desactualizado no produce un error; produce **prioridades equivocadas**.
 * FPGE lee estos ficheros para ordenar el trabajo.
 *
 * Dos decisiones que conviene conocer antes de tocar esto:
 *
 * 1. **Es estrecha a propósito.** Sólo reconoce formas explícitas de decir «cerrada» y «abierta».
 *    Ante cualquier otra redacción, no acusa. Un falso negativo deja pasar una incoherencia; un
 *    falso positivo hace que alguien borre la guarda, y entonces se pierde también lo que sí
 *    protegía.
 * 2. **Se salta si los documentos no están.** `docs/` está en `.gitignore`, así que en un clon
 *    limpio o en CI no existen. Un rojo por ausencia sería un rojo injusto, y los rojos injustos
 *    se borran. Limitación real: esto protege a quien tiene los documentos — que es, justamente,
 *    quien puede desincronizarlos.
 */

const RAIZ = raizDelMonorepo();
const HISTORIA = join(RAIZ, 'docs', 'implementation', 'HISTORY.log');
const REGISTRO = join(RAIZ, 'docs', 'enterprise-documentation', '10-Technical-Debt.md');

/** Formas explícitas de declarar una deuda resuelta. */
const CERRADA = /\b(CERRADA|CLOSED|MITIGADA|RESUELTA)\b/i;
/** Formas explícitas de declararla viva. Todo lo demás no se acusa. */
const ABIERTA = /\b(Open|Acknowledged)\b/i;

/** Las deudas que `HISTORY.log` da por cerradas, en sus líneas `Deuda cerrada: …`. */
export function deudasDeclaradasCerradas(historia: string): string[] {
  const declaradas = new Set<string>();
  for (const linea of historia.split('\n')) {
    const m = linea.match(/Deuda cerrada:\s*(.+)$/i);
    if (!m) continue;
    for (const td of m[1].match(/TD-\d+/g) ?? []) declaradas.add(td);
  }
  return [...declaradas].sort();
}

/** El primer `**Status:**` que sigue a `### TD-XXX`. Es donde vive el estado. */
export function estadoEnRegistro(registro: string, td: string): string | null {
  const cabecera = new RegExp(`^###\\s+${td}\\b.*$`, 'm');
  const inicio = registro.search(cabecera);
  if (inicio < 0) return null;

  const resto = registro.slice(inicio);
  const siguiente = resto.slice(1).search(/^###\s+TD-/m);
  const seccion = siguiente < 0 ? resto : resto.slice(0, siguiente + 1);

  const estado = seccion.match(/\*\*Status:\*\*\s*(.+)/);
  return estado ? estado[1].trim() : null;
}

/** Deudas declaradas cerradas en la historia que el registro sigue dando por abiertas. */
export function incoherencias(
  historia: string,
  registro: string,
): { td: string; estado: string }[] {
  return deudasDeclaradasCerradas(historia)
    .map((td) => ({ td, estado: estadoEnRegistro(registro, td) }))
    .filter(
      (x): x is { td: string; estado: string } =>
        x.estado !== null && ABIERTA.test(x.estado) && !CERRADA.test(x.estado),
    );
}

describe('El registro de deuda no contradice a la historia (PT-103)', () => {
  const hayDocumentos = existsSync(HISTORIA) && existsSync(REGISTRO);

  // CD-05 — `docs/` esta gitignored: sin ellos, esta guarda no aplica.
  const siHayDocumentos = hayDocumentos ? it : it.skip;

  siHayDocumentos(
    'CD-01: ninguna deuda cerrada en HISTORY.log sigue abierta en el registro',
    () => {
      const fallos = incoherencias(readFileSync(HISTORIA, 'utf8'), readFileSync(REGISTRO, 'utf8'));

      expect(
        fallos
          .map((f) => `${f.td}: HISTORY.log la da por cerrada, el registro dice "${f.estado}"`)
          .join('\n'),
      ).toBe('');
    },
  );

  it('CD-05: se salta limpiamente cuando los documentos no estan', () => {
    // No es decorativo: si esta guarda fallara por ausencia, rompería la suite de cualquier clon
    // limpio, y el primero que viera ese rojo la borraría.
    expect(estadoEnRegistro('sin nada que ver aqui', 'TD-001')).toBeNull();
    expect(deudasDeclaradasCerradas('')).toEqual([]);
  });

  it('CD-02: RECHAZA una deuda cerrada en la historia y abierta en el registro', () => {
    const historia = 'Deuda cerrada: TD-042, TD-043.\n';
    const registro = [
      '### TD-042 — Algo que ya se arreglo',
      '**Status:** Open. Descubierta en PT-001.',
      '',
      '### TD-043 — Otra cosa',
      '**Status:** CERRADA 2026-07-27 por PT-002.',
    ].join('\n');

    const fallos = incoherencias(historia, registro);

    expect(fallos.map((f) => f.td)).toEqual(['TD-042']);
  });

  it('CD-03: ACEPTA un registro coherente', () => {
    const historia = 'Deuda cerrada: TD-042.\n';
    const registro =
      '### TD-042 — Algo\n**Status:** ✅ **CERRADA 2026-07-27 por PT-002.** Se lee en foo.ts.';

    expect(incoherencias(historia, registro)).toEqual([]);
  });

  it('CD-04: NO acusa ante una redaccion que no encaja en ninguna lista', () => {
    // Preferimos dejar pasar una incoherencia a producir un falso positivo: lo segundo termina
    // con la guarda desactivada, y entonces no protege nada.
    const historia = 'Deuda cerrada: TD-042.\n';
    const registro = '### TD-042 — Algo\n**Status:** en revision con el equipo.';

    expect(incoherencias(historia, registro)).toEqual([]);
  });

  it('CD-06: una deuda del registro que la historia no menciona es irrelevante', () => {
    const registro = '### TD-099 — Nunca cerrada\n**Status:** Open.';

    expect(incoherencias('', registro)).toEqual([]);
  });
});
