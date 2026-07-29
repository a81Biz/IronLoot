import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-106 — Las capturas de la suite van a la carpeta de su corrida.
 *
 * `shot()` nacio con tres parametros —`(page, dir, name)`— y 16 de sus 20 llamadas pasaban dos.
 * JavaScript no protesta por un argumento que falta: lo pone a `undefined` y sigue. El resultado
 * eran ficheros `<etiqueta>/undefined.png` **dentro del codigo fuente de la suite**, no en la
 * carpeta de la corrida.
 *
 * Se leyo como rareza durante semanas. No era cosmetico: las capturas no servian para
 * diagnosticar —todas con el mismo nombre, fuera de su ejecucion—, se pisaban entre corridas, y
 * 12 ficheros binarios cambiaban en cada `git status`.
 *
 * Esta guarda mira el sintoma directamente, que es lo unico que no se puede fingir.
 */
describe('Las capturas de la suite van a su sitio (PT-106)', () => {
  const RAIZ = raizDelMonorepo();
  const SUITE = join(RAIZ, 'tests', 'qa-browser-suite');

  /** Todos los ficheros bajo `dir`, recursivamente. */
  function ficheros(dir: string): string[] {
    if (!existsSync(dir)) return [];
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (entrada === 'node_modules') return [];
      return statSync(ruta).isDirectory() ? ficheros(ruta) : [ruta];
    });
  }

  it('CS-01: no hay ninguna captura llamada `undefined.png`', () => {
    const huerfanas = ficheros(SUITE)
      .filter((f) => f.endsWith('undefined.png'))
      .map((f) => f.slice(RAIZ.length + 1));

    // Si esto falla, alguien llamo a `shot()` sin nombre y el fallo se guardo en disco en vez
    // de avisar.
    expect(huerfanas.join('\n')).toBe('');
  });

  it('CS-02: la suite no guarda capturas dentro de su propio codigo', () => {
    const dentro = ficheros(SUITE)
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.slice(RAIZ.length + 1));

    // Las capturas pertenecen a la carpeta de la corrida (`qa-out/<marca de tiempo>/`), que es
    // efimera y esta fuera del repositorio. Dentro del codigo fuente no pinta nada ninguna.
    expect(dentro.join('\n')).toBe('');
  });

  it('CS-03: `shot()` exige el nombre de la captura', () => {
    // Se lee el fuente en vez de importarlo: `lib.js` arrastra Playwright, que no esta en las
    // dependencias del API. La comprobacion es mas debil que ejecutarlo —fija que la guarda
    // existe, no que funcione— y por eso CS-01 y CS-02 miran el disco, que no se puede fingir.
    const fuente = readFileSync(join(SUITE, 'lib.js'), 'utf8');
    const cuerpo = fuente.slice(fuente.indexOf('function shot('));

    expect(cuerpo.slice(0, 400)).toMatch(/if \(!name\)[\s\S]*?throw/);
  });
});
