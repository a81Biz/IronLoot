import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * PT-135 — Un `package-lock.json` generado en un sistema operativo y consumido en otro deja de ser
 * un contrato reproducible, y no avisa al instalar: avisa al arrancar, dias despues, en otra maquina.
 *
 * PT-126 regenero `src/api/package-lock.json` en Windows. El lock paso de **17 paquetes de
 * plataforma a 2**: solo sobrevivieron los de la maquina que lo genero. El bloque
 * `optionalDependencies` de `@css-inline/css-inline` seguia declarando las once variantes, pero las
 * **entradas del arbol instalado** desaparecieron — y es el arbol lo que `npm install` reifica.
 *
 * Consecuencia medida: el contenedor del API arrancaba, aplicaba migraciones, compilaba con 0
 * errores, y moria al cargar el arbol de modulos:
 *
 *     Error: Cannot find module '@css-inline/css-inline-linux-x64-gnu'
 *     - @nestjs-modules/mailer/dist/adapters/handlebars.adapter.js
 *     - dist/modules/notifications/notifications.module.js
 *     - dist/modules/scheduler/scheduler.module.js  ->  app.module  ->  main
 *
 * Con el API `unhealthy`, nginx, admin, base y client **nunca arrancan**: los cuatro dependen de su
 * `service_healthy`. Un solo defecto, cinco contenedores caidos.
 *
 * Y estuvo un dia invisible porque `/app/node_modules` es un **volumen anonimo**: Compose lo conserva
 * al recrear el contenedor, asi que los reinicios reusaban un arbol instalado ANTES de PT-126.
 * Reconstruir la imagen no causo el defecto: lo destapo.
 *
 * Es la **tercera** vez que el repositorio se encuentra esto. PT-129 lo vio en `musl` y lo tapo con
 * un `npm install --no-save` explicito en `Dockerfile:62`; el comentario de esa linea llego a afirmar
 * que la variante «existe en package-lock.json» cuando PT-126 la habia borrado el dia anterior.
 * Un parche que oculta su causa no es una correccion.
 *
 * Esta guarda comprueba lo que se puede comprobar sin construir: **que el arbol del lock declara los
 * binarios de las plataformas que este repositorio construye de verdad**. Que el contenedor llegue a
 * `healthy` se comprueba arrancandolo (PT-135.3), y eso vive en la evidencia, no aqui.
 *
 * La otra mitad del contrato la sostiene `scripts/solo-en-contenedor.js` (PT-135.4), que impide
 * generar el lock donde no debe. Esta guarda caza el sintoma en CI; aquella impide producirlo.
 */
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');

/**
 * Los tres lock del repositorio.
 *
 * `base`, `client` y `core` no tienen lock propio: son **workspaces** de la raiz
 * (`package.json:5-8`), y su arbol vive en el lock de la raiz. `src/api` y `src/admin` se instalan
 * aparte (`postinstall` de la raiz, con `npm --prefix`) y tienen el suyo.
 *
 * Los tres se exigen presentes. `src/admin/package-lock.json` existia en disco y **no estaba seguido
 * por git**: su arbol no era reproducible por nadie mas que la maquina donde nacio. PT-135.6 lo
 * corrige, y hasta entonces esta guarda lo acusa.
 */
const LOCKS = ['package-lock.json', 'src/api/package-lock.json', 'src/admin/package-lock.json'];

/**
 * El cuarto lock, y la unica excepcion — declarada, no accidental.
 *
 * `tests/qa-browser-suite/` instala **en el host** a proposito: Playwright conduce un navegador real
 * en la maquina del desarrollador, y dentro del contenedor del API no hay navegador que conducir.
 * `run-all.sh` invoca `node` directamente.
 *
 * No se le exige nada de Linux, y no es dejadez: seria **al reves de lo correcto**. Un arbol para el
 * host necesita los binarios del host. Lo que si se le exige es que **siga sin dependencias nativas
 * divididas por plataforma** — hoy son cero, medido. Mientras sea cero, la excepcion no puede
 * reproducir el defecto de PT-135, y por eso es segura.
 *
 * Si algun dia deja de ser cero, esta prueba falla y obliga a decidir en vez de a suponer. Es la
 * diferencia entre una excepcion vigilada y un agujero.
 */
const LOCK_DEL_HOST = 'tests/qa-browser-suite/package-lock.json';

/**
 * Las dos plataformas que este repositorio construye. No son una eleccion: estan medidas.
 *
 *   linux-x64-gnu   `Dockerfile.dev`  -> node:20-slim, Debian bookworm, glibc 2.36
 *   linux-x64-musl  `Dockerfile`      -> node:20-alpine, musl
 *
 * Por eso NO se exigen win32, darwin ni arm: nadie construye para ellas. Y desde PT-135 nadie
 * instala en el host (`preinstall`), asi que el lock tampoco necesita el binario de Windows —
 * conservarlo no molesta, pero no se exige.
 */
const LINUX_X64 = /-linux-x64(-|$)/;

/** Un nombre de paquete que es variante por plataforma, no una dependencia normal. */
const ES_VARIANTE_DE_PLATAFORMA = /(linux|win32|darwin|android|freebsd)/;

export interface Exigencia {
  /** El paquete que declara variantes por plataforma. Ej.: `@css-inline/css-inline`. */
  padre: string;
  /** Las variantes de Linux x64 que declara, y que por tanto el arbol debe traer. */
  exigidas: string[];
  /** Las que faltan en el arbol instalado. Vacio = correcto. */
  ausentes: string[];
}

/**
 * Lee un lock y devuelve, por cada paquete con variantes por plataforma, las de Linux x64 que
 * declara y las que faltan del arbol.
 *
 * Se comprueba **presencia de claves, nunca versiones**. Comparar versiones volveria la guarda
 * fragil ante cualquier `npm update` y alguien acabaria apagandola — y una guarda apagada es peor
 * que ninguna, porque figura como control.
 */
export function exigenciasDePlataforma(lock: string): Exigencia[] {
  const paquetes: Record<string, { optionalDependencies?: Record<string, string> }> =
    JSON.parse(lock).packages ?? {};

  const enElArbol = (nombre: string): boolean =>
    Object.keys(paquetes).some(
      (ruta) => ruta === `node_modules/${nombre}` || ruta.endsWith(`/node_modules/${nombre}`),
    );

  const exigencias: Exigencia[] = [];

  for (const [ruta, entrada] of Object.entries(paquetes)) {
    const opcionales = Object.keys(entrada.optionalDependencies ?? {});
    if (!opcionales.some((n) => ES_VARIANTE_DE_PLATAFORMA.test(n))) continue;

    const exigidas = opcionales.filter((n) => LINUX_X64.test(n));
    if (exigidas.length === 0) continue;

    exigencias.push({
      padre: ruta.replace(/^node_modules\//, '') || '(raiz)',
      exigidas,
      ausentes: exigidas.filter((n) => !enElArbol(n)),
    });
  }

  return exigencias;
}

describe('El lock declara los binarios de las plataformas que construimos (PT-135)', () => {
  describe.each(LOCKS)('%s', (relativo) => {
    const completa = join(RAIZ, relativo);

    it('existe — un lock que no viaja no reproduce nada', () => {
      expect(existsSync(completa)).toBe(true);
    });

    it('su arbol trae las variantes de Linux x64 que sus paquetes declaran', () => {
      if (!existsSync(completa)) return; // el `it` de arriba ya lo acusa

      const faltan = exigenciasDePlataforma(readFileSync(completa, 'utf8')).filter(
        (e) => e.ausentes.length > 0,
      );

      // El mensaje nombra el paquete: quien lo lea en CI tiene que saber que regenerar y donde.
      expect(faltan.map((e) => `${e.padre} -> falta ${e.ausentes.join(', ')}`)).toEqual([]);
    });
  });

  it('la suite de navegador sigue sin dependencias nativas — su excepcion sigue siendo segura', () => {
    const completa = join(RAIZ, LOCK_DEL_HOST);
    expect(existsSync(completa)).toBe(true);

    // Cero exigencias = cero binarios por plataforma = la excepcion no puede morder.
    expect(exigenciasDePlataforma(readFileSync(completa, 'utf8'))).toEqual([]);
  });

  it('el lock del API declara al menos un paquete nativo — o esta guarda no vigila nada', () => {
    // Sin esto, retirar el mailer dejaria la guarda pasando en vacio y nadie lo notaria. No se
    // aprueba lo que no se puede mirar.
    const exigencias = exigenciasDePlataforma(
      readFileSync(join(RAIZ, 'src/api/package-lock.json'), 'utf8'),
    );

    expect(exigencias.length).toBeGreaterThan(0);
  });

  describe('casos de control', () => {
    /** El estado exacto de `master` antes de PT-135: el padre declara, el arbol solo tiene win32. */
    const LOCK_ROTO = JSON.stringify({
      packages: {
        'node_modules/@css-inline/css-inline': {
          optionalDependencies: {
            '@css-inline/css-inline-linux-x64-gnu': '0.20.0',
            '@css-inline/css-inline-linux-x64-musl': '0.20.0',
            '@css-inline/css-inline-win32-x64-msvc': '0.20.0',
          },
        },
        'node_modules/@css-inline/css-inline-win32-x64-msvc': { version: '0.20.0' },
      },
    });

    it('C1: detecta el lock podado en Windows, y nombra las dos variantes que faltan', () => {
      const [exigencia] = exigenciasDePlataforma(LOCK_ROTO);

      expect(exigencia.ausentes).toEqual([
        '@css-inline/css-inline-linux-x64-gnu',
        '@css-inline/css-inline-linux-x64-musl',
      ]);
    });

    it('C2: con las dos variantes en el arbol, no acusa nada', () => {
      const sano = JSON.parse(LOCK_ROTO);
      sano.packages['node_modules/@css-inline/css-inline-linux-x64-gnu'] = { version: '0.20.0' };
      sano.packages['node_modules/@css-inline/css-inline-linux-x64-musl'] = { version: '0.20.0' };

      expect(exigenciasDePlataforma(JSON.stringify(sano))[0].ausentes).toEqual([]);
    });

    it('C3: no exige plataformas que no construimos — win32, darwin, arm', () => {
      const soloAjenas = JSON.stringify({
        packages: {
          'node_modules/algo': {
            optionalDependencies: {
              'algo-win32-x64-msvc': '1.0.0',
              'algo-darwin-arm64': '1.0.0',
              'algo-linux-arm64-gnu': '1.0.0',
            },
          },
        },
      });

      // Ninguna es linux-x64: no hay exigencia que hacer, y no se inventa una.
      expect(exigenciasDePlataforma(soloAjenas)).toEqual([]);
    });

    it('C4: un lock sin dependencias nativas no genera exigencias falsas', () => {
      // Es el caso de la raiz y de `admin` hoy: 0 paquetes de plataforma, medido.
      const sinNativas = JSON.stringify({
        packages: { 'node_modules/nada': { dependencies: { otra: '1.0.0' } } },
      });

      expect(exigenciasDePlataforma(sinNativas)).toEqual([]);
    });

    it('C5: una variante anidada cuenta como presente', () => {
      // npm puede colocar el binario bajo el arbol del padre en vez de en la raiz. Si la guarda no
      // lo contemplara, acusaria un lock correcto — y un falso positivo es como muere un control.
      const anidado = JSON.stringify({
        packages: {
          'node_modules/algo': {
            optionalDependencies: { 'algo-linux-x64-gnu': '1.0.0' },
          },
          'node_modules/algo/node_modules/algo-linux-x64-gnu': { version: '1.0.0' },
        },
      });

      expect(exigenciasDePlataforma(anidado)[0].ausentes).toEqual([]);
    });
  });
});
