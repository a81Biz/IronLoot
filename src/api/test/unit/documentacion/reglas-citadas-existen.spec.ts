import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-141 (RULE-27) — Toda `RULE-NN` que el codigo cita existe en `11-Conventions.md`.
 *
 * ADR-049 acota `docs/enterprise-documentation/` al **contrato de agente**: las `RULE-NN`, el
 * registro `TD-XXX` y los inventarios. Elevar un documento a contrato unico exige comprobar que
 * dice lo que el codigo cree que dice — y no lo decia.
 *
 * Medido el 2026-07-28, antes de esta guarda:
 *
 *   - **RULE-25** — la invariante parcial serializada por bloqueo de fila. Citada **dos veces** en
 *     codigo de produccion y prueba (`account-verification.service.ts:90`,
 *     `creacion-perezosa-atomica.spec.ts:89`), y **ausente del documento**.
 *   - **RULE-26** — un workflow no cita ficheros que no existen. Citada por su propia guarda y por
 *     la evidencia de PT-147, y **ausente del documento**.
 *
 * Un agente que siguiera la cita hasta el contrato no habria encontrado nada. Eso es peor que no
 * citar: es la familia de H-016 —**una cita precisa que no lleva a ninguna parte se lee con
 * confianza y es falsa**— aplicada al documento que gobierna a quien toca el repositorio.
 *
 * ## Por que solo en un sentido
 *
 * Se comprueba codigo → documento, no al reves. Una regla puede existir en el contrato sin que
 * ningun comentario la nombre —RULE-01..RULE-06 son de esas— y exigir la cita obligaria a salpicar
 * el codigo de referencias para contentar a una prueba. La direccion util es la otra: **la cita que
 * miente**.
 */
const RAIZ = raizDelMonorepo();

const CONVENCIONES = join(RAIZ, 'docs/enterprise-documentation/11-Conventions.md');

/** Donde se buscan citas. Codigo y pruebas de los cuatro servicios, mas los scripts de auditoria. */
const ARBOLES = [
  'src/api/src',
  'src/api/test',
  'src/api/scripts',
  'src/admin/src',
  'src/apps/base/src',
  'src/apps/client/src',
  'src/packages/core/src',
];

const EXTENSIONES = new Set(['.ts', '.js', '.cjs', '.mjs']);

/** Los `RULE-NN` que un documento **declara** — solo los que abren su propia seccion. */
export function reglasDeclaradas(md: string): Set<number> {
  const declaradas = new Set<number>();

  for (const linea of md.split('\n')) {
    // Solo un titulo declara. Nombrar RULE-24 dentro del cuerpo de RULE-25 es una referencia
    // cruzada, no una declaracion: contarla dejaria pasar una regla citada y nunca escrita.
    const m = linea.match(/^#{2,4}\s+RULE-(\d{2}):/);
    if (m) declaradas.add(Number(m[1]));
  }

  return declaradas;
}

/**
 * Los `RULE-NN` que un fichero cita **de verdad**.
 *
 * Un bloque `casos de control` no cita: **construye contraejemplos**. Una guarda que exige saber
 * fallar necesita nombrar reglas inexistentes, y acusarlas seria acusar al mecanismo por hacer su
 * trabajo. (Este comentario no escribe el numero de ejemplo a proposito: esta por encima del corte,
 * y escribirlo aqui haria fallar a la guarda por su propia explicacion — que ya le paso a tres
 * guardas de este repositorio.)
 *
 * Esto no es una exencion de fichero: vale para cualquier guarda futura que necesite un
 * contraejemplo. **Una excepcion exime a uno; una regla sirve al siguiente.** Y no abre un agujero,
 * porque el codigo de produccion no tiene bloques de casos de control.
 */
export function reglasCitadas(fuente: string): number[] {
  const control = fuente.search(/describe\(\s*['"`]casos de control/);
  const util = control === -1 ? fuente : fuente.slice(0, control);

  return [...util.matchAll(/\bRULE-(\d{2})\b/g)].map((m) => Number(m[1]));
}

function ficherosDe(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const encontrados: string[] = [];

  for (const entrada of readdirSync(dir)) {
    if (entrada === 'node_modules' || entrada === 'dist') continue;

    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) encontrados.push(...ficherosDe(ruta));
    else if (EXTENSIONES.has(extname(entrada))) encontrados.push(ruta);
  }

  return encontrados;
}

describe('Toda RULE-NN citada existe en el contrato — RULE-27 (PT-141)', () => {
  const convenciones = existsSync(CONVENCIONES) ? readFileSync(CONVENCIONES, 'utf8') : '';
  const declaradas = reglasDeclaradas(convenciones);

  it('el contrato existe y declara un numero plausible de reglas', () => {
    // Sin esto, un `11-Conventions.md` borrado dejaria C1 pasando en vacio: cero reglas declaradas
    // y cero acusaciones solo si ademas nadie cita ninguna. Es el fallo que hace inutiles a las
    // guardas de documentacion.
    expect(convenciones.length).toBeGreaterThan(2000);
    expect(declaradas.size).toBeGreaterThanOrEqual(20);
  });

  it('C1: ninguna RULE-NN citada en el codigo falta del contrato', () => {
    const huerfanas = new Map<number, string[]>();

    for (const arbol of ARBOLES) {
      for (const fichero of ficherosDe(join(RAIZ, arbol))) {
        for (const n of reglasCitadas(readFileSync(fichero, 'utf8'))) {
          if (declaradas.has(n)) continue;
          const donde = huerfanas.get(n) ?? [];
          donde.push(fichero.replace(RAIZ, '').replace(/\\/g, '/'));
          huerfanas.set(n, donde);
        }
      }
    }

    const acusaciones = [...huerfanas.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(
        ([n, donde]) =>
          `RULE-${String(n).padStart(2, '0')}: citada en ${donde.length} fichero(s) ` +
          `(${donde[0]}) y no declarada en 11-Conventions.md`,
      );

    expect(acusaciones).toEqual([]);
  });

  it('C2: la numeracion no reutiliza un identificador', () => {
    // Dos secciones con el mismo numero convertirian la cita en ambigua, que es la manera silenciosa
    // de que un contrato deje de serlo.
    const numeros = [...convenciones.matchAll(/^#{2,4}\s+RULE-(\d{2}):/gm)].map((m) => m[1]);
    const repetidos = numeros.filter((n, i) => numeros.indexOf(n) !== i);

    expect(repetidos).toEqual([]);
  });

  describe('casos de control', () => {
    it('AC-01: una regla citada y no declarada se detecta', () => {
      const declaradasDePrueba = reglasDeclaradas('### RULE-01: algo\ntexto\n');

      expect(reglasCitadas('// esto sigue RULE-99')).toEqual([99]);
      expect(declaradasDePrueba.has(99)).toBe(false);
    });

    it('AC-02: una regla citada Y declarada no se acusa', () => {
      const declaradasDePrueba = reglasDeclaradas('### RULE-25: invariante parcial\n');

      expect(declaradasDePrueba.has(25)).toBe(true);
    });

    it('AC-03: nombrar una regla dentro del cuerpo de otra no la declara', () => {
      // Este es el caso que hizo falsa la version ingenua: RULE-24 aparece en el cuerpo de RULE-25.
      const md = '### RULE-25: otra cosa\n**Relation to RULE-24:** es la misma tecnica.\n';

      expect([...reglasDeclaradas(md)]).toEqual([25]);
    });

    it('AC-06: lo que un bloque de casos de control nombra no cuenta como cita', () => {
      // El caso que hizo que esta guarda se acusara a si misma en su primera ejecucion.
      const fuente = "const a = 'RULE-24';\ndescribe('casos de control', () => {\n 'RULE-99';\n});";

      expect(reglasCitadas(fuente)).toEqual([24]);
    });

    it('AC-04: un hueco de numeracion no se acusa si nadie lo cita', () => {
      // RULE-18 y RULE-21 se reservaron en paquetes de propuesta (b361970) y sus reglas acabaron
      // plegadas en otras. No existen y **no deben existir**: acusar huecos obligaria a inventar
      // reglas para tapar numeros, que es escribir para el linter.
      const declaradasDePrueba = reglasDeclaradas('### RULE-17: a\n### RULE-19: b\n');

      expect(declaradasDePrueba.has(18)).toBe(false);
      expect(reglasCitadas('nada aqui')).toEqual([]);
    });

    it('AC-05: la deteccion es por palabra completa', () => {
      // `RULE-240` no es una cita a RULE-24. Sin el limite de palabra la guarda aprobaria por
      // coincidencia parcial, que es aprobar sin mirar.
      expect(reglasCitadas('RULE-240 y RULE-2')).toEqual([]);
      expect(reglasCitadas('RULE-24 al final')).toEqual([24]);
    });
  });
});
