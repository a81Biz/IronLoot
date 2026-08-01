import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-238 — **El `tsconfig.json` de la raíz no compila nada, y tiene que poder decirlo sin error.**
 *
 * ## Por qué existe ese fichero
 *
 * Por `ts-node`, no por `tsc`. `npm run indice:estado` ejecuta
 * `node --require ts-node/register/transpile-only src/api/scripts/indice-de-estado.ts` **desde la
 * raíz**, y `ts-node` busca ahí sus opciones de compilación. Sin él fallaba con `TS5109` en el host y
 * `EROFS` en el contenedor: lo restituyó PT-200 después de que un commit de frontend lo borrara. Que
 * su ausencia fuese el descuido y no la regla lo dice el propio `.gitignore`, que lo **des-ignora**
 * explícitamente.
 *
 * ## Por qué `include: []`
 *
 * Porque si reclamara ficheros, el config de la raíz intentaría comprobar el monorepo entero desde
 * arriba, pisando a los cuatro que de verdad compilan —`src/api`, `src/admin`, `src/apps/base`,
 * `src/apps/client`—. `npm run typecheck` delega en esos cuatro.
 *
 * ## Y por qué `references: []`
 *
 * **Porque sin él, TypeScript emite `TS18003` de forma permanente.** Medido el 2026-07-31 con `tsc`
 * sobre tres configuraciones:
 *
 * | Forma | Resultado |
 * |---|---|
 * | `include: []` | `TS18003 — No inputs were found in config file` |
 * | `files: []` | `TS18002 — The 'files' list in config file is empty` |
 * | `include: []` + `references: []` | **sin error** |
 *
 * TypeScript sólo calla cuando el config declara `files` o `references`: son las dos formas de decir
 * «sé lo que hago, aquí no hay entradas». `references: []` es la única de las tres que no cambia el
 * comportamiento y no introduce otro error.
 *
 * ## Qué impide esta guarda
 *
 * Que alguien retire el `references: []` por parecer inútil —lo es para compilar; no lo es para
 * callar— y devuelva un error rojo permanente en la raíz del proyecto. **Un aviso constante que no
 * significa nada enseña a ignorar los avisos**, y este repositorio ya ha pagado eso más de una vez.
 */
const RAIZ = raizDelMonorepo();
const TSCONFIG = join(RAIZ, 'tsconfig.json');

/** `tsconfig.json` admite comentarios (JSONC); `JSON.parse` no. Se retiran antes de leerlo. */
function leerJsonc(ruta: string): Record<string, unknown> {
  const crudo = readFileSync(ruta, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');

  return JSON.parse(crudo) as Record<string, unknown>;
}

describe('El tsconfig de la raíz existe para ts-node y no emite TS18003 — PT-238', () => {
  it('C1: existe, y no compila nada a propósito', () => {
    const cfg = leerJsonc(TSCONFIG);

    // Las dos mitades del diseño: hereda las opciones —que es a lo que viene `ts-node`— y no reclama
    // ni un fichero, para no pisar a los cuatro proyectos que sí compilan.
    expect(cfg.extends).toBe('./tsconfig.base.json');
    expect(cfg.include).toEqual([]);
  });

  it('C2: declara `references`, que es lo único que evita el TS18003 permanente', () => {
    const cfg = leerJsonc(TSCONFIG);

    // Se comprueba la PRESENCIA de la clave, no su contenido: es la presencia lo que hace callar a
    // TypeScript. El día que el monorepo use project references de verdad, este caso seguirá valiendo.
    expect(Object.prototype.hasOwnProperty.call(cfg, 'references')).toBe(true);
    expect(Array.isArray(cfg.references)).toBe(true);
  });

  it('C3 (control): la guarda está leyendo el fichero de verdad, comentarios incluidos', () => {
    // Sin esto, una ruta equivocada o un `JSON.parse` que reventara con los comentarios dejarían los
    // casos de arriba sin nada que comprobar. Es el modo exacto en que una guarda se vuelve inútil
    // sin dejar de existir, y en este repositorio ya ha pasado cuatro veces en un mismo fichero.
    const crudo = readFileSync(TSCONFIG, 'utf-8');

    expect(crudo).toMatch(/\/\/|\/\*/);
    expect(Object.keys(leerJsonc(TSCONFIG)).length).toBeGreaterThan(2);
  });

  it('C4 (control): `files: []` NO sirve, y por eso no se usó', () => {
    // Medido, no supuesto: `files: []` cambia `TS18003` por `TS18002`. Queda escrito aquí para que
    // nadie lo intente como «simplificación» y reintroduzca un error distinto.
    const cfg = leerJsonc(TSCONFIG);

    expect(Object.prototype.hasOwnProperty.call(cfg, 'files')).toBe(false);
  });
});
