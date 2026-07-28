import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * PT-135 — `npm` no se ejecuta en el host. Se ejecuta en el contenedor.
 *
 * No es una preferencia de estilo: es la invariante de la que depende que el lock sea reproducible.
 * Un `npm install` en Windows regenera `package-lock.json` con el arbol de ESA plataforma y **se
 * lleva los binarios nativos de Linux**. El contenedor instala entonces menos de lo que necesita y
 * **no falla al instalar: falla al arrancar**, en otra maquina, dias despues — con el volumen
 * anonimo de `node_modules` tapandolo mientras no se recree.
 *
 * La invariante existia antes de este PT. Lo que no existia era el mecanismo, y **ya se violo una
 * vez**: el lock de PT-126 solo pudo salir de un `npm install` en Windows. Nadie se entero hasta que
 * un contenedor murio.
 *
 * `lock-declara-plataformas.spec.ts` caza el sintoma en CI. Esta guarda impide producirlo, y por eso
 * es la correccion real del PT: sin ella esto vuelve, como volvio de PT-129 a hoy.
 *
 * **Por que la senal es la plataforma y no `/.dockerenv`** — medido, no supuesto:
 *
 *     docker exec ironloot-api ls /.dockerenv   ->  existe
 *     ci.yml: `runs-on: ubuntu-latest` SIN `container:`  ->  los siete jobs corren directamente
 *                                                            en la VM, donde /.dockerenv NO existe
 *
 * Exigir `/.dockerenv` habria bloqueado la instalacion en los siete jobs de CI. Se midio antes de
 * elegir, y por eso la guarda mira `process.platform`: cubre el caso real (host Windows o macOS) sin
 * romper CI, que **debe** poder instalar.
 *
 * **Sin puerta de escape por variable de entorno.** Una invariante con `--force` es una costumbre
 * otra vez, y este PT existe porque una costumbre no basto.
 */
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');
const RUTA_GUARDA = join(RAIZ, 'scripts', 'solo-en-contenedor.js');

interface Guarda {
  permitido(plataforma: string): boolean;
  mensaje(plataforma: string): string;
}

describe('npm solo se ejecuta en el contenedor (PT-135)', () => {
  it('la guarda existe donde los tres package.json la invocan', () => {
    expect(existsSync(RUTA_GUARDA)).toBe(true);
  });

  describe('decision por plataforma', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const guarda: Guarda = existsSync(RUTA_GUARDA) ? require(RUTA_GUARDA) : ({} as Guarda);

    it('linux pasa — es el contenedor, y tambien CI', () => {
      // CI corre en `ubuntu-latest` sobre la VM. Si esto fallara, los siete jobs no instalarian.
      expect(guarda.permitido('linux')).toBe(true);
    });

    it('C1: win32 aborta — es el caso que produjo el defecto', () => {
      expect(guarda.permitido('win32')).toBe(false);
    });

    it('C2: darwin aborta — la invariante no es «no Windows», es «solo el contenedor»', () => {
      expect(guarda.permitido('darwin')).toBe(false);
    });

    it('el mensaje dice QUE ejecutar, no solo que esta prohibido', () => {
      // Una guarda que solo prohibe empuja a saltarsela. La que ensena el camino correcto, no.
      const mensaje = guarda.mensaje('win32');

      expect(mensaje).toContain('docker');
      expect(mensaje).toMatch(/lock:api|npm run lock/);
    });
  });

  describe('los tres puntos de instalacion la invocan', () => {
    // `base`, `client` y `core` son workspaces de la raiz: se instalan con ella. `api` y `admin` se
    // instalan aparte (el `postinstall` de la raiz, con `npm --prefix`), asi que necesitan la suya.
    const PUNTOS = ['package.json', 'src/api/package.json', 'src/admin/package.json'];

    it.each(PUNTOS)('%s declara preinstall', (relativo) => {
      const manifiesto = JSON.parse(readFileSync(join(RAIZ, relativo), 'utf8')) as {
        scripts?: Record<string, string>;
      };

      expect(manifiesto.scripts?.preinstall).toMatch(/solo-en-contenedor/);
    });
  });
});
