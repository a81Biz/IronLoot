import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-157 (H-024) — El fichero que declara QUE se audita no cita lo que no existe.
 * PT-154 (R-011)  — Y los nueve documentos archivados por ADR-049 no reaparecen.
 *
 * Dos guardas en un fichero porque son la misma pregunta: **¿sigue siendo cierto lo que la
 * documentacion de gobierno afirma?**
 *
 * ## H-024 — lo que se midio el 2026-07-29
 *
 * `audit-scope.yaml` declaraba auditar cinco documentos. **Cuatro no existian en esa ruta**:
 * `02-PRD`, `03-TRD`, `09-Security-Architecture` y `06-Backend-Architecture` los archivo **PT-141**
 * el dia anterior bajo ADR-049, y ese PT no siguio esta cita — si siguio las de `CLAUDE.md` y la
 * guarda del TRD.
 *
 * Y el comentario `# 23 migraciones — ninguna se ha ejecutado nunca (H-014)` era falso por partida
 * doble: son **2** —PT-127 las refundio— y **las dos estan aplicadas**, verificado en
 * `_prisma_migrations` (E-027). El comentario congelo el estado de H-014 en el momento de
 * detectarlo y nadie lo reviso al cerrarlo.
 *
 * ## Por que MEDIA y no BAJA
 *
 * Es la familia de H-016 —*una cita precisa que no lleva a ninguna parte se lee con confianza y es
 * falsa*— aplicada al documento que dice **que se audita**. Una auditoria que declara cubrir cuatro
 * documentos inexistentes declara una cobertura que no tiene, y `[A8]` hace de la cobertura
 * declarada un requisito del score.
 *
 * ## Y por que hay guarda en vez de solo reapuntar las rutas
 *
 * Es la **tercera** vez que el patron aparece: H-016 (las cinco citas del TRD desplazadas), PT-130
 * (la guarda que las vigila) y esto. Reapuntar cuatro rutas y esperar es lo que produjo la tercera.
 *
 * ## PT-154 — el mecanismo que ADR-049 no tenia
 *
 * ADR-049 archivo nueve documentos y su unica proteccion eran **tres avisos en prosa**: en
 * `CLAUDE.md`, en el README de `enterprise-documentation/` y en el de `archive/`. Una ejecucion de
 * `[START FOUNDATION]` que los reemitiera desharia la decision **sin error**: apareceria nueve
 * ficheros y todo seguiria en verde. Un control que solo existe como texto no es un control
 * (RULE-14).
 */
const RAIZ = raizDelMonorepo();

const ALCANCE = join(RAIZ, 'PTSA/audit-scope.yaml');
const ENTERPRISE = join(RAIZ, 'docs/enterprise-documentation');
const MIGRACIONES = join(RAIZ, 'src/api/prisma/migrations');

/** Los nueve que ADR-049 mando a `archive/`. Reaparecer en la raiz seria deshacer la decision. */
export const ARCHIVADOS_POR_ADR_049 = [
  '01-Platform-Overview.md',
  '02-PRD.md',
  '03-TRD.md',
  '04-App-Flow.md',
  '05-UIUX-Brief.md',
  '06-Backend-Architecture.md',
  '07-Database-Architecture.md',
  '08-API-Catalog.md',
  '09-Security-Architecture.md',
];

/**
 * Las rutas de fichero que `audit-scope.yaml` declara auditar.
 *
 * Se leen las entradas de lista que **parecen una ruta con extension**. Un patron con comodin
 * (`src/api/src/**\/*.ts`) no se comprueba: es un glob, no una cita, y exigirle existencia literal
 * seria un falso positivo garantizado.
 */
export function rutasCitadas(yaml: string): string[] {
  const rutas: string[] = [];

  for (const linea of yaml.split('\n')) {
    const m = linea.match(/^\s*-\s*["']?([A-Za-z0-9_./-]+\.(?:md|yml|yaml|json|ts|conf))["']?\s*$/);
    if (!m) continue;
    if (m[1].includes('*')) continue;
    rutas.push(m[1]);
  }

  return rutas;
}

describe('El alcance de auditoria no cita lo que no existe — RULE-28 (PT-157)', () => {
  const yaml = existsSync(ALCANCE) ? readFileSync(ALCANCE, 'utf8') : '';

  it('el fichero de alcance existe y declara documentos', () => {
    // Sin esto, un `audit-scope.yaml` borrado dejaria C1 pasando en vacio.
    expect(yaml.length).toBeGreaterThan(500);
    expect(rutasCitadas(yaml).length).toBeGreaterThan(0);
  });

  it('C1: toda ruta citada por `audit-scope.yaml` existe', () => {
    const rotas = rutasCitadas(yaml).filter((r) => !existsSync(join(RAIZ, r)));

    expect(rotas).toEqual([]);
  });

  it('C2: el comentario de migraciones dice el numero real', () => {
    // El comentario congelo el estado de H-014 al detectarlo y nadie lo reviso al cerrarlo. Esta
    // comprobacion es estrecha a proposito: solo mira el numero, no la prosa. Una guarda que exija
    // redactar de cierta forma enseña a escribir para el linter.
    const declarado = yaml.match(/#\s*(\d+)\s+migraciones/)?.[1];
    if (!declarado) return; // sin cifra declarada no hay nada que contradecir

    const reales = existsSync(MIGRACIONES)
      ? readdirSync(MIGRACIONES).filter((d) => /^\d{14}_/.test(d)).length
      : 0;

    expect(Number(declarado)).toBe(reales);
  });
});

describe('ADR-049 no se deshace sin retirarla — RULE-29 (PT-154)', () => {
  it('C1: ninguno de los nueve archivados reaparece en la raiz', () => {
    // El escenario exacto: `[START FOUNDATION]` los reemite, aparecen nueve ficheros, y **nada
    // falla**. La decision quedaria deshecha en silencio cuatro dias despues de tomarse.
    const resucitados = ARCHIVADOS_POR_ADR_049.filter((n) => existsSync(join(ENTERPRISE, n)));

    expect(resucitados).toEqual([]);
  });

  it('C2: y siguen estando en `archive/` — archivar no es borrar', () => {
    // La otra mitad. Si alguien los borrase, esta guarda pasaria igual con solo C1: cero en la raiz.
    // Pero `[A6]` los protege —PTSA los cita en evidencias cerradas— y `03-TRD.md` ademas lo vigila
    // `coherencia-documentacion-codigo.spec.ts`.
    const perdidos = ARCHIVADOS_POR_ADR_049.filter(
      (n) => !existsSync(join(ENTERPRISE, 'archive', n)),
    );

    expect(perdidos).toEqual([]);
  });

  it('C3: el contrato de agente sigue en la raiz', () => {
    // Lo que ADR-049 CONSERVA. Si esto desapareciera, la decision estaria deshecha por el otro lado.
    for (const n of ['10-Technical-Debt.md', '11-Conventions.md', 'README.md']) {
      expect(existsSync(join(ENTERPRISE, n))).toBe(true);
    }
    expect(existsSync(join(ENTERPRISE, 'inventory'))).toBe(true);
  });

  describe('casos de control', () => {
    it('AC-01: una ruta inexistente se detecta', () => {
      const yamlFalso = ['docs:', '  - CLAUDE.md', '  - docs/no-existe-jamas.md'].join('\n');
      const citadas = rutasCitadas(yamlFalso);

      expect(citadas).toContain('docs/no-existe-jamas.md');
      expect(existsSync(join(RAIZ, 'docs/no-existe-jamas.md'))).toBe(false);
    });

    it('AC-02: un glob no se cuenta como cita', () => {
      // `- "src/api/src/**/*.ts"` es un patron, no una ruta. Exigirle existencia literal seria un
      // falso positivo garantizado, y una guarda con falsos positivos acaba borrada (PT-103).
      expect(rutasCitadas('  - "src/api/src/**/*.ts"')).toEqual([]);
    });

    it('AC-03: la lista de archivados es la de ADR-049, los nueve', () => {
      expect(ARCHIVADOS_POR_ADR_049).toHaveLength(9);
    });
  });
});
