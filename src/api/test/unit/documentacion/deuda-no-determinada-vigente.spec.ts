import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-171 (RULE-35) — Un `ND-XXX` que afirma una ausencia se comprueba como un `TD-XXX`.
 *
 * ## El defecto
 *
 * `10-Technical-Debt.md` es la autoridad de la clase «deuda tecnica», y dentro lleva una seccion
 * `NOT DETERMINED` con entradas `ND-XXX`: lo que Foundation Protocol no pudo citar. Pesan lo mismo para
 * quien las lee, y **`coherencia-deuda-tecnica.spec.ts` solo mira los `TD-XXX`**.
 *
 * Medido el 2026-07-29, dos de las siete contradecian al codigo:
 *
 *   - **`ND-002`** daba como evidencia *«`src/api/src/app.module.ts:75-85` — no
 *     `ThrottlerStorageRedisService` referenced»*. Esta en `app.module.ts` **desde PT-030**, que es el PT
 *     que cerro **H-002**. El registro de deuda contradecia el cierre de un hallazgo.
 *   - **`ND-003`** decia que las plantillas de correo «no se encontraron». Estaban exactamente donde el
 *     propio `ND-003` mandaba mirar.
 *
 * `ND-004` (umbrales de cobertura) **sigue siendo cierto** —no hay `coverageThreshold`— y se deja.
 *
 * ## Por que una ausencia es la afirmacion peligrosa
 *
 * «Aqui no hay X» envejece de la peor manera: **el dia que alguien añade X, la frase sigue ahi y ya es
 * falsa**, sin que nada cambie de color. Es H-016 aplicado a la deuda: un registro con evidencia precisa
 * que ya no se cumple se lee con confianza y es falso. Y peor que un documento desfasado: **contradecia
 * un hallazgo cerrado**, asi que dos registros oficiales decian cosas opuestas sobre el mismo hecho.
 *
 * ## Lo que esta guarda comprueba
 *
 * Las afirmaciones se **declaran aqui**, con su `ND` y el hecho verificable. No se intenta leer la prosa:
 * una guarda que exija redactar de cierta forma enseña a escribir para el linter, y entonces el
 * documento deja de decir la verdad. Lo que se comprueba es que **el hecho que cerro cada `ND` siga
 * siendo cierto** y que **el documento lo declare cerrado** — las dos direcciones.
 */
const RAIZ = raizDelMonorepo();

const DEUDA = join(RAIZ, 'docs/enterprise-documentation/10-Technical-Debt.md');

/**
 * Los hechos que cerraron un `ND`. Si uno deja de ser cierto, el cierre es falso y hay que reabrirlo.
 *
 * Se declara el hecho, no la redaccion. Añadir una fila aqui es lo que cuesta cerrar un `ND` con una
 * cita: es deliberado, y es la diferencia entre cerrarlo y darlo por cerrado.
 */
const HECHOS_QUE_CIERRAN: {
  nd: string;
  fichero: string;
  debeContener?: string;
  porque: string;
}[] = [
  {
    nd: 'ND-002',
    fichero: 'src/api/src/app.module.ts',
    debeContener: 'ThrottlerStorageRedisService',
    porque:
      'PT-030 cerro H-002 poniendo el almacenamiento del throttler en Redis. Si desaparece, el rate limiting vuelve a ser por instancia y H-002 se reabre.',
  },
  {
    nd: 'ND-003',
    fichero: 'src/api/src/modules/notifications/templates/verification.hbs',
    porque: 'ND-003 decia que las plantillas no se encontraban. Existen, y aqui.',
  },
  {
    nd: 'ND-003',
    fichero: 'src/api/src/modules/notifications/templates/reset-password.hbs',
    porque: 'La segunda de las dos plantillas que ND-003 daba por no encontradas.',
  },
];

/** Los `ND-XXX` que el documento declara cerrados, por su `Status:`. */
export function ndCerradas(md: string): Set<string> {
  const cerradas = new Set<string>();
  const lineas = md.split('\n');

  for (let i = 0; i < lineas.length; i++) {
    const cab = lineas[i].match(/^###\s+(ND-\d{3})/);
    if (!cab) continue;

    // El `Status:` de la entrada esta en las lineas siguientes, antes del siguiente `###`.
    for (let j = i + 1; j < lineas.length && !/^###\s/.test(lineas[j]); j++) {
      if (/^\*\*Status:\*\*/.test(lineas[j]) && /CERRAD|CLOSED|RESUELT/i.test(lineas[j])) {
        cerradas.add(cab[1]);
        break;
      }
    }
  }

  return cerradas;
}

/** Las rutas de fichero que la seccion `NOT DETERMINED` cita. */
export function rutasCitadasPorND(md: string): string[] {
  const seccion = md.split('## NOT DETERMINED')[1]?.split('\n## ')[0] ?? '';

  return [
    ...new Set(
      [...seccion.matchAll(/`(src\/[A-Za-z0-9_./-]+\.(?:ts|js|json|hbs))(?::\d+(?:-\d+)?)?`/g)].map(
        (m) => m[1],
      ),
    ),
  ];
}

describe('Un `ND-XXX` que afirma una ausencia se comprueba — RULE-35 (PT-171)', () => {
  const md = readFileSync(DEUDA, 'utf8');

  it('el documento existe y tiene seccion NOT DETERMINED con entradas', () => {
    expect(md).toContain('## NOT DETERMINED');
    expect([...md.matchAll(/^###\s+ND-\d{3}/gm)].length).toBeGreaterThanOrEqual(5);
  });

  it('C1: el hecho que cerro cada `ND` sigue siendo cierto', () => {
    const rotos = HECHOS_QUE_CIERRAN.filter(({ fichero, debeContener }) => {
      const ruta = join(RAIZ, fichero);
      if (!existsSync(ruta)) return true;
      if (!debeContener) return false;

      return !readFileSync(ruta, 'utf8').includes(debeContener);
    }).map(({ nd, fichero, debeContener }) => `${nd}: ${fichero} ${debeContener ?? '(no existe)'}`);

    expect(rotos).toEqual([]);
  });

  it('C2: todo `ND` con un hecho verificado esta declarado cerrado en el documento', () => {
    // La otra direccion. Sin esto, el hecho puede ser cierto y el documento seguir diciendo
    // «not verified» — que es exactamente el estado en que estaba ND-002 desde PT-030.
    const cerradas = ndCerradas(md);
    const pendientes = [...new Set(HECHOS_QUE_CIERRAN.map((h) => h.nd))].filter(
      (nd) => !cerradas.has(nd),
    );

    expect(pendientes).toEqual([]);
  });

  it('C3: toda ruta que la seccion cita existe', () => {
    const rotas = rutasCitadasPorND(md).filter((r) => !existsSync(join(RAIZ, r)));

    expect(rotas).toEqual([]);
  });

  it('C4: cada hecho declarado explica por que importa', () => {
    // Una fila sin motivo es una asercion sin razon: dentro de un año nadie sabra si se puede quitar.
    for (const { porque } of HECHOS_QUE_CIERRAN) {
      expect(porque.length).toBeGreaterThan(40);
    }
  });

  describe('casos de control', () => {
    it('AC-01: un `Status:` cerrado se reconoce', () => {
      const texto = '### ND-002 — algo\n**Status:** ✅ **CERRADA 2026-07-29 por PT-171.**\n';

      expect(ndCerradas(texto).has('ND-002')).toBe(true);
    });

    it('AC-02: un `ND` sin cierre NO se cuenta como cerrado', () => {
      const texto = '### ND-004 — umbrales\n**Status:** coverage thresholds not confirmed.\n';

      expect(ndCerradas(texto).has('ND-004')).toBe(false);
    });

    it('AC-03: el `Status:` de un `ND` no se atribuye al siguiente', () => {
      const texto =
        '### ND-002 — a\n**Status:** CERRADA por PT-171.\n\n### ND-004 — b\n**Status:** abierto.\n';
      const cerradas = ndCerradas(texto);

      expect(cerradas.has('ND-002')).toBe(true);
      expect(cerradas.has('ND-004')).toBe(false);
    });

    it('AC-04: una ausencia que ya es falsa se detecta', () => {
      // El estado real de ND-002 antes de PT-171: el documento decia que no estaba, y estaba.
      const app = readFileSync(join(RAIZ, 'src/api/src/app.module.ts'), 'utf8');

      expect(app).toContain('ThrottlerStorageRedisService');
    });

    it('AC-05: se extrae la ruta aunque la cita lleve `:linea`', () => {
      const texto = '## NOT DETERMINED\n**Evidence:** `src/api/src/app.module.ts:75-85` — nada.\n';

      expect(rutasCitadasPorND(texto)).toEqual(['src/api/src/app.module.ts']);
    });

    it('AC-06: la extraccion se limita a la seccion NOT DETERMINED', () => {
      const texto =
        '## TD\n`src/inventado/no-existe.ts`\n## NOT DETERMINED\n`src/api/src/main.ts`\n';

      expect(rutasCitadasPorND(texto)).toEqual(['src/api/src/main.ts']);
    });
  });
});
