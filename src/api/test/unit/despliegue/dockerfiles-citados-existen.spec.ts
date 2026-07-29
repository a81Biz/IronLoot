import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-147 (RULE-26) — Un workflow no cita ficheros que no existen.
 *
 * El job `docker` apuntaba a `./Dockerfile`, que **nunca ha existido**. Las imagenes de produccion
 * las creo PT-129 y viven en `src/api/`, `src/admin/`, `src/apps/base/` y `src/apps/client/`:
 *
 *     ERROR: failed to solve: failed to read dockerfile:
 *            open Dockerfile: no such file or directory
 *
 * Estuvo oculto por dos capas, y la segunda es la que conviene recordar: el job estaba condicionado
 * a `refs/heads/prod || refs/heads/prep` —dos ramas fantasma— y quedaba `skipped`. **Un job saltado
 * no cuenta como fallo**, asi que el workflow entero se declaraba `success` sin haber construido
 * nada. Es un escalon peor que H-015, donde `build` y `docker` no corrian por colgar de un job que
 * no terminaba y al menos eso se veia.
 *
 * Esta guarda comprueba lo que se puede comprobar sin construir: que cada `file:` apunte a un
 * fichero real y cada `context:` a un directorio real. Que la imagen **arranque** se comprueba
 * arrancandola, y eso vive en el job y en la evidencia — es la leccion de H-017.
 */
const RAIZ = raizDelMonorepo();
const WORKFLOWS = join(RAIZ, '.github', 'workflows');

export interface Cita {
  clave: 'file' | 'context';
  valor: string;
}

/**
 * Las rutas citadas por los pasos de build de un workflow.
 *
 * Los comentarios se descartan: documentar por que una ruta cambio no puede hacer fallar la guarda.
 * Es la leccion que dejo PT-143 al ampliar la guarda de ramas — una guarda que penaliza escribir la
 * razon acaba produciendo ficheros sin razones.
 */
export function rutasCitadas(yml: string): Cita[] {
  return yml
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .flatMap((l) => {
      const m = l.match(/^\s*(file|context):\s*(\S+)\s*$/);
      if (!m) return [];
      return [{ clave: m[1] as 'file' | 'context', valor: m[2].replace(/['"]/g, '') }];
    });
}

const ficheros = existsSync(WORKFLOWS)
  ? readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  : [];

describe('Los ficheros que citan los workflows existen (PT-147)', () => {
  it('hay workflows que comprobar', () => {
    expect(ficheros.length).toBeGreaterThan(0);
  });

  describe.each(ficheros)('%s', (fichero) => {
    const citas = rutasCitadas(readFileSync(join(WORKFLOWS, fichero), 'utf8'));

    it('cada `file:` apunta a un fichero que existe', () => {
      const rotas = citas
        .filter((c) => c.clave === 'file')
        .filter((c) => !existsSync(join(RAIZ, c.valor)));

      expect(rotas.map((c) => c.valor)).toEqual([]);
    });

    it('cada `context:` apunta a un directorio que existe', () => {
      const rotos = citas
        .filter((c) => c.clave === 'context')
        .filter((c) => {
          const completa = join(RAIZ, c.valor);
          return !existsSync(completa) || !statSync(completa).isDirectory();
        });

      expect(rotos.map((c) => c.valor)).toEqual([]);
    });
  });

  describe('casos de control', () => {
    it('C1: un `file:` inexistente se acusa', () => {
      const citas = rutasCitadas('    file: ./no-existe-jamas/Dockerfile');

      expect(citas).toEqual([{ clave: 'file', valor: './no-existe-jamas/Dockerfile' }]);
      expect(existsSync(join(RAIZ, citas[0].valor))).toBe(false);
    });

    it('C2: un `file:` real no se acusa', () => {
      const citas = rutasCitadas('    file: src/api/Dockerfile');

      expect(existsSync(join(RAIZ, citas[0].valor))).toBe(true);
    });

    it('C3: un `context:` a un directorio real', () => {
      const citas = rutasCitadas('    context: src/admin');

      expect(statSync(join(RAIZ, citas[0].valor)).isDirectory()).toBe(true);
    });

    it('C4: un paso sin `file:` no revienta ni inventa citas', () => {
      expect(rutasCitadas('  - name: Checkout\n    uses: actions/checkout@v4')).toEqual([]);
    });

    it('C5: un comentario que CITA una ruta no cuenta', () => {
      // Misma razon que en la guarda de ramas (PT-143): explicar por que una ruta cambio no puede
      // hacer fallar la comprobacion.
      expect(rutasCitadas('  # antes decia: file: ./Dockerfile')).toEqual([]);
    });

    it('C6: `context: .` es la raiz, y es legitimo', () => {
      // El API construye desde la raiz del monorepo a proposito: `@ironloot/core` es
      // `file:../packages/core` y con el contexto en `src/api` no se puede copiar.
      const citas = rutasCitadas('    context: .');

      expect(statSync(join(RAIZ, citas[0].valor)).isDirectory()).toBe(true);
    });
  });
});
