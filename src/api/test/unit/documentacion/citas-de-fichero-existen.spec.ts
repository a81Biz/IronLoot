import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-191 — **Todo fichero que el contrato de agente cita, existe.**
 *
 * ## De dónde sale, y la ironía que lo hace memorable
 *
 * De medir el repositorio al cerrar PT-191, en vez de releerlo. `11-Conventions.md` —lo que Foundation
 * Protocol llama *«the most critical output»*, el contrato que un agente no puede romper— citaba **tres
 * ficheros que no existen**:
 *
 * | Cita | Lo que hay |
 * |---|---|
 * | `tests/qa-browser-suite/32-puja-en-vivo.cjs` | `…/32-puja-en-vivo.js` |
 * | `scripts/schema-drift-check.ts` | `src/api/scripts/schema-drift-check.ts` |
 * | `src/api/test/unit/web-views/rutas-que-el-client-invoca.spec.ts` | `…/rutas-que-los-ssr-invocan.spec.ts` |
 *
 * **La tercera es la buena.** `RULE-32` existe *exactamente* porque PT-148 renombró ese fichero y el
 * patrón de `test:guardas` dejó de casar sin que nada protestara — su texto lo dice con todas las
 * letras: *«un renombrado la vacía sin dejar rastro»*. Y `RULE-31`, sesenta líneas antes, **seguía
 * citando el nombre viejo**. La regla que documenta el fallo estaba rota por el fallo que documenta.
 *
 * ## Por qué esta clase merece guarda propia
 *
 * `PT-189` dejó escrito que las citas `fichero:línea` fuera del TRD eran una clase **sin guarda**.
 * `coherencia-documentacion-codigo.spec.ts` cubre la tabla de stack del TRD (H-016) y
 * `coherencia-de-registros.spec.ts` cubre los registros de trabajo; entre las dos quedaba fuera lo que
 * más se lee: **el contrato**.
 *
 * Y el modo de fallo es el silencioso de siempre: la cita no se rompe, **se queda apuntando a nada**.
 * Un documento sin citas se lee con desconfianza; uno con citas rotas se lee con confianza y es falso.
 *
 * ## Qué mide, y qué no
 *
 * Mide las rutas entre comillas invertidas que **parecen un fichero** —tienen extensión y empiezan por
 * un directorio real del monorepo—. No mide:
 *
 * - **Plantillas**: `PT-XXX`, `H-XXX`, `P-XXX` son patrones de nombre, no rutas. Se excluyen por forma.
 * - **Menciones de ficheros retirados a propósito**: están en `RETIRADAS_A_PROPOSITO`, con su motivo.
 *   `CLAUDE.md` nombra `PTSA/Motor-PTSA.md` y `PTSA/PTSA.md` **para decir que nunca existieron** (PT-141);
 *   acusarlas sería exigir crear ficheros para que una nota deje de estar rota, que es hacerlo al revés.
 */
const RAIZ = raizDelMonorepo();

/** Los documentos que un agente lee como contrato y da por buenos. */
const CONTRATO = [
  'CLAUDE.md',
  'docs/enterprise-documentation/11-Conventions.md',
  'docs/enterprise-documentation/10-Technical-Debt.md',
  'docs/enterprise-documentation/README.md',
  'docs/implementation/HANDOFF.md',
  'docs/implementation/PENDING_TASKS.md',
];

/** Raíces que indican «esto es una ruta del repositorio», no una frase. */
const RAICES = ['src/', 'docs/', 'docs-v2/', 'PTSA/', 'tests/', 'scripts/', 'changes/', '.github/'];

/**
 * Rutas citadas a propósito aunque no existan, con el motivo. **No es una lista de excepciones: es la
 * parte declarada.** Una entrada sin motivo la rechaza `AC-03`.
 */
const RETIRADAS_A_PROPOSITO: Record<string, string> = {
  'PTSA/Motor-PTSA.md':
    'PT-141 — citado para decir que NUNCA existió; crear el fichero sería arreglarlo al revés',
  'PTSA/PTSA.md':
    'PT-141 — citado para decir que NUNCA existió; crear el fichero sería arreglarlo al revés',
};

/** Marcas de plantilla: no son rutas, son formas de nombre. */
const ES_PLANTILLA = /-(?:XXX|NN|N)\b|\[PT-ID\]|<[^>]+>|\*/;

interface Cita {
  ruta: string;
  documento: string;
  linea: number;
}

function citas(documento: string): Cita[] {
  const salida: Cita[] = [];
  const patron = /`([\w./-]+\.[A-Za-z0-9]{1,6})`/g;

  readFileSync(join(RAIZ, documento), 'utf-8')
    .split('\n')
    .forEach((l, i) => {
      for (const m of l.matchAll(patron)) {
        const ruta = m[1];
        if (!RAICES.some((r) => ruta.startsWith(r))) continue;
        if (ES_PLANTILLA.test(ruta)) continue;
        salida.push({ ruta, documento, linea: i + 1 });
      }
    });

  return salida;
}

describe('Las citas a fichero del contrato existen — PT-191', () => {
  const todas = CONTRATO.flatMap(citas);

  it('C1: ninguna cita apunta a un fichero que no existe', () => {
    const rotas = todas
      .filter((c) => !(c.ruta in RETIRADAS_A_PROPOSITO))
      .filter((c) => !existsSync(join(RAIZ, c.ruta)))
      .map((c) => `${c.documento}:${c.linea} → ${c.ruta}`);

    expect(rotas).toEqual([]);
  });

  describe('casos de control', () => {
    it('AC-01: la guarda esta leyendo citas de verdad', () => {
      // Sin esto, un patrón que no case daría cero citas y **cero rotas**: verde por no medir nada.
      // Es el modo en que una guarda se vuelve inútil sin dejar de existir, y hoy ya pasó una vez.
      expect(todas.length).toBeGreaterThan(40);
    });

    it('AC-02: reconoce una ruta inexistente cuando se la fabrica', () => {
      const falsa = 'src/api/src/modules/inventado/no-existe.ts';

      expect(existsSync(join(RAIZ, falsa))).toBe(false);
      expect(RAICES.some((r) => falsa.startsWith(r))).toBe(true);
      expect(ES_PLANTILLA.test(falsa)).toBe(false);
    });

    it('AC-03: las retiradas a proposito declaran su motivo, y siguen sin existir', () => {
      // Si una de ellas apareciera en el disco, la excepción sobra y hay que quitarla: si no, la lista
      // acabaría describiendo un pasado — el defecto que RULE-38 corrige en la documentación.
      for (const [ruta, motivo] of Object.entries(RETIRADAS_A_PROPOSITO)) {
        expect({
          ruta,
          existe: existsSync(join(RAIZ, ruta)),
          motivoLargo: motivo.length > 25,
        }).toEqual({ ruta, existe: false, motivoLargo: true });
      }
    });

    it('AC-04: las plantillas NO se acusan — `PT-XXX` no es una ruta', () => {
      for (const plantilla of [
        'docs/implementation/evidence/PT-XXX/self-review.md',
        'PTSA/Hallazgos/H-XXX.md',
        'changes/[PT-ID]-slug/design.md',
      ]) {
        expect({ plantilla, detectada: ES_PLANTILLA.test(plantilla) }).toEqual({
          plantilla,
          detectada: true,
        });
      }
    });
  });
});
