import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-165 (RULE-32) — Todo patron de `test:guardas` casa con al menos una suite.
 *
 * ## El defecto, cometido y detectado en el mismo dia
 *
 * `package.json` define `test:guardas` con una lista de patrones separados por `|`. PT-148 renombro
 * `rutas-que-el-client-invoca.spec.ts` a `rutas-que-los-ssr-invocan.spec.ts` — y el patron
 * `rutas-que-el-client` **dejo de casar con nada**.
 *
 * El guion siguio saliendo en verde. Jest no protesta cuando un patron no encuentra ficheros: los
 * demas pasan y el resumen dice OK. **La guarda del contrato SSR-API dejo de estar en el guion de
 * guardas, en silencio, cuatro horas despues de ampliarla.**
 *
 * Lo detecte a mano, leyendo el `package.json` por otro motivo. Eso significa que la proxima vez no
 * habria pasado nada — de ahi esta prueba.
 *
 * ## Es el patron de la casa, aplicado al guion que vigila
 *
 * *Un mecanismo que no se ejecuta no avisa de nada* (RULE-26). Aqui el mecanismo es la lista de
 * patrones, y su modo de fallo es el peor: **no se rompe, se encoge**. Un renombrado la vacia sin
 * dejar rastro, y lo que deja de vigilarse no aparece por ninguna parte.
 */
const RAIZ = raizDelMonorepo();

const PACKAGE = join(RAIZ, 'src/api/package.json');
const TESTS = join(RAIZ, 'src/api/test');

/** Los patrones que `test:guardas` pasa a `--testPathPattern`. */
export function patronesDeGuardas(pkg: string): string[] {
  const scripts = (JSON.parse(pkg).scripts ?? {}) as Record<string, string>;
  const guion = scripts['test:guardas'] ?? '';

  const m = guion.match(/--testPathPattern=\\?"([^"\\]+)/);
  if (!m) return [];

  return m[1]
    .split('|')
    .map((p) => p.trim())
    .filter(Boolean);
}

function suites(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const salida: string[] = [];

  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) salida.push(...suites(p));
    else if (e.name.endsWith('.spec.ts')) salida.push(p.replace(/\\/g, '/'));
  }

  return salida;
}

describe('Los patrones de `test:guardas` casan con algo — RULE-32 (PT-165)', () => {
  const patrones = patronesDeGuardas(readFileSync(PACKAGE, 'utf8'));
  const ficheros = suites(TESTS);

  it('se leyeron patrones y suites — si no, la guarda no compara nada', () => {
    // Sin esto, un `test:guardas` renombrado dejaria C1 pasando en vacio: cero patrones, cero
    // huerfanos, verde. Que es exactamente el fallo que esta prueba existe para cazar.
    expect(patrones.length).toBeGreaterThan(5);
    expect(ficheros.length).toBeGreaterThan(50);
  });

  it('C1: ningun patron se queda sin suite', () => {
    const huerfanos = patrones.filter((p) => {
      const re = new RegExp(p);
      return !ficheros.some((f) => re.test(f));
    });

    expect(huerfanos).toEqual([]);
  });

  describe('casos de control', () => {
    it('AC-01: un patron que no casa se detecta', () => {
      const re = new RegExp('rutas-que-el-client');

      // El fichero real tras el renombrado de PT-148.
      expect(re.test('test/unit/web-views/rutas-que-los-ssr-invocan.spec.ts')).toBe(false);
    });

    it('AC-02: el patron corregido si casa', () => {
      const re = new RegExp('rutas-que-los-ssr');

      expect(re.test('test/unit/web-views/rutas-que-los-ssr-invocan.spec.ts')).toBe(true);
    });

    it('AC-03: se extraen los patrones separados por `|`', () => {
      const pkg = JSON.stringify({
        scripts: { 'test:guardas': 'jest --testPathPattern=\\"uno|dos|tres\\"' },
      });

      expect(patronesDeGuardas(pkg)).toEqual(['uno', 'dos', 'tres']);
    });

    it('AC-04: sin guion declarado no se inventan patrones', () => {
      expect(patronesDeGuardas(JSON.stringify({ scripts: {} }))).toEqual([]);
    });
  });
});
