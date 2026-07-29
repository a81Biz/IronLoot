import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-172 — La configuracion de Jest existe en un solo sitio y **esta montada** en el contenedor.
 *
 * ## El defecto que esto impide
 *
 * PT-172 saco la configuracion de Jest de `package.json` a `jest.config.js`, para que la medicion de
 * PT-159 sobre `maxWorkers` pudiera ser un comentario de verdad en vez de una clave
 * `_comentario_maxWorkers` que Jest rechazaba en **cada corrida**.
 *
 * Al probarlo —no al suponerlo— **las 111 suites fallaron con `SyntaxError` sobre TypeScript
 * perfectamente valido**: `docker-compose` monta `/app/src`, `/app/test`, `/app/package.json`… y el
 * fichero nuevo no estaba en la lista. Sin config, Jest cae a Babel y no aplica `ts-jest`.
 *
 * **Es PT-138 otra vez**, y su comentario ya estaba escrito tres lineas mas arriba en el mismo
 * `docker-compose.yml`: los scripts de auditoria no estaban montados y el contenedor ejecutaba una
 * copia congelada de la imagen. *«Es la peor forma de un fallo de entorno — no falla, miente.»* Aqui
 * fallo ruidosamente por suerte: si `jest.config.js` hubiera sido opcional, la suite habria corrido con
 * otra configuracion —otros `roots`, otro `maxWorkers`— y verde.
 *
 * ## Lo que comprueba
 *
 * - La configuracion vive en **un** sitio: si `package.json` recupera su bloque `jest`, hay dos fuentes
 *   y la de `package.json` es la que Jest ignora cuando existe `jest.config.js`.
 * - El fichero **esta declarado como montaje** del servicio `api`. Es la comprobacion que faltaba.
 * - `maxWorkers` sigue fijado y **explicado**: PT-159 lo dejo con su medicion a proposito, porque *«fue
 *   una prevencion que se quedo en una nota lo que hizo volver a H-014 en cuatro dias»*.
 */
const RAIZ = raizDelMonorepo();

const CONFIG = join(RAIZ, 'src/api/jest.config.js');
const PACKAGE = join(RAIZ, 'src/api/package.json');
const COMPOSE = join(RAIZ, 'docker-compose.yml');

/** Los montajes que un servicio declara en `docker-compose.yml`. */
export function montajesDelServicio(yaml: string, servicio: string): string[] {
  const lineas = yaml.split('\n');
  const inicio = lineas.findIndex((l) => new RegExp(`^  ${servicio}:`).test(l));
  if (inicio === -1) return [];

  const resto = lineas.slice(inicio + 1);
  const fin = resto.findIndex((l) => /^  [a-z0-9_-]+:/.test(l));
  const bloque = (fin === -1 ? resto : resto.slice(0, fin)).join('\n');

  return [...bloque.matchAll(/^\s*-\s+(\.[^\s:]+):([^\s:]+)/gm)].map((m) => `${m[1]}:${m[2]}`);
}

describe('La configuracion de pruebas vive en un sitio y esta montada (PT-172)', () => {
  it('C1: `jest.config.js` existe', () => {
    expect(existsSync(CONFIG)).toBe(true);
  });

  it('C2: `package.json` NO recupera su bloque `jest` — una sola fuente', () => {
    // Con `jest.config.js` presente, Jest ignora el bloque de `package.json`. Tener los dos es
    // garantizar que alguien edite el que no se lee.
    const pkg = JSON.parse(readFileSync(PACKAGE, 'utf8'));

    expect(pkg.jest).toBeUndefined();
  });

  it('C3: el fichero esta declarado como montaje del servicio `api`', () => {
    // La comprobacion que faltaba. Sin ella, las 111 suites fallan con SyntaxError y el motivo no
    // aparece en ningun sitio: el fichero existe en el host y no dentro del contenedor.
    const montajes = montajesDelServicio(readFileSync(COMPOSE, 'utf8'), 'api');

    expect(montajes.length).toBeGreaterThan(5);
    expect(montajes).toContain('./src/api/jest.config.js:/app/jest.config.js');
  });

  it('C4: `maxWorkers` sigue fijado y explicado', () => {
    const config = readFileSync(CONFIG, 'utf8');

    expect(config).toMatch(/maxWorkers:\s*1/);
    // La medicion de PT-159 y la de PT-166 son la razon del valor. Sin ellas, el siguiente que vea un
    // `1` lo subira, y la suite volvera a morir por SIGKILL sin que nada este roto.
    expect(config).toContain('PT-159');
    expect(config).toContain('PT-166');
  });

  it('C5: no queda ninguna clave de comentario que Jest rechace', () => {
    // El defecto original: `_comentario_maxWorkers` producia dos avisos de validacion por corrida.
    // Ruido que enseña a descartar la salida de la suite.
    const pkg = readFileSync(PACKAGE, 'utf8');

    expect(pkg).not.toContain('_comentario');
  });

  describe('casos de control', () => {
    it('AC-01: se extraen los montajes de un bloque de servicio', () => {
      const yaml = [
        '  api:',
        '    volumes:',
        '      - ./src/api/src:/app/src',
        '      - ./src/api/jest.config.js:/app/jest.config.js',
        '  db:',
        '    volumes:',
        '      - ./otro:/otro',
      ].join('\n');

      expect(montajesDelServicio(yaml, 'api')).toEqual([
        './src/api/src:/app/src',
        './src/api/jest.config.js:/app/jest.config.js',
      ]);
    });

    it('AC-02: el bloque se corta en el siguiente servicio', () => {
      const yaml = '  api:\n    volumes:\n      - ./a:/a\n  db:\n    volumes:\n      - ./b:/b';

      expect(montajesDelServicio(yaml, 'api')).not.toContain('./b:/b');
    });

    it('AC-03: un servicio que no existe da lista vacia, y C3 lo detectaria', () => {
      // Sin la asercion de longitud en C3, un servicio renombrado dejaria la comprobacion pasando
      // en vacio: `[]` no contiene el montaje, pero tampoco contiene nada.
      expect(montajesDelServicio('  api:\n    volumes:\n      - ./a:/a', 'inventado')).toEqual([]);
    });

    it('AC-04: un volumen nombrado (no una ruta) no se cuenta como montaje de fichero', () => {
      const yaml =
        '  api:\n    volumes:\n      - node_modules_api:/app/node_modules\n      - ./a:/a';

      expect(montajesDelServicio(yaml, 'api')).toEqual(['./a:/a']);
    });
  });
});
