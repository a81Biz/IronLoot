import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * PT-129 (PTSA H-017) — El healthcheck de una imagen tiene que apuntar a una ruta que existe.
 *
 * `src/api/Dockerfile:60` pedia `http://localhost:3000/health`. Esa ruta devuelve **404**:
 * `main.ts` fija `app.setGlobalPrefix('api')` mas versionado, asi que la real es `/api/v1/health`.
 *
 * Un contenedor de produccion habria quedado `unhealthy` **de forma permanente** desde los 5 s de
 * arranque, con la aplicacion sirviendo trafico perfectamente. Un orquestador lo reinicia en bucle
 * o nunca le enruta nada.
 *
 * Lo que lo explica todo: **nadie habia construido ni arrancado nunca esa imagen**. El healthcheck
 * de `docker-compose` —el que si corre a diario— estaba corregido desde hacia tiempo. Se arreglo
 * ahi y no se propago.
 *
 * Un healthcheck que nadie ha visto pasar no es un healthcheck; es una linea de texto.
 *
 * Esta guarda comprueba lo que se puede comprobar sin construir: que la ruta escrita en cada
 * `HEALTHCHECK` empieza por el prefijo global real. Que el contenedor llegue a `healthy` se
 * comprueba arrancandolo (PT-129.6), y eso vive en la evidencia, no aqui.
 */
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');

/** El prefijo global, leido de `main.ts` — no escrito a mano aqui. */
export function prefijoGlobal(mainTs: string): string {
  const prefijo = mainTs.match(/setGlobalPrefix\(\s*['"]([^'"]+)['"]/)?.[1];
  if (!prefijo) return '';

  // Versionado por URI: `/api` + `/v1`. Si algun dia se quita, esta guarda lo notara.
  const version = mainTs.match(/defaultVersion:\s*['"]?v?(\d+)/)?.[1];
  return version ? `/${prefijo}/v${version}` : `/${prefijo}`;
}

/** Las URLs de todos los `HEALTHCHECK` de un Dockerfile. */
export function urlsDeHealthcheck(dockerfile: string): string[] {
  return [...dockerfile.matchAll(/https?:\/\/[^\s'"]+/g)]
    .map((m) => m[0])
    .filter((u) => /localhost|127\.0\.0\.1/.test(u));
}

/**
 * Cada servicio con la ruta que su healthcheck DEBE pedir.
 *
 * No es la misma para todos, y la diferencia importa. El API expone su salud bajo el prefijo
 * global. Los tres SSR **no tienen endpoint de salud**: lo que hay que comprobar de un sitio
 * renderizado en servidor es que **sirve una pagina**, asi que piden `/`.
 *
 * Se leyo de los contenedores en marcha antes de escribir esto, no se supuso:
 *
 *     base    http://localhost:5174/
 *     client  http://localhost:5175/
 *     admin   http://localhost:3001/
 *
 * Replicar el `/api/v1/health` del API en los tres SSR habria creado un healthcheck contra una
 * ruta inexistente: **el defecto de H-017, repetido tres veces**. Esta guarda se escribio primero
 * de esa forma equivocada y se corrigio al medirlo.
 *
 * Ventaja de pedir `/` en un SSR: si `views/` o `public/` faltaran en la imagen, lo detecta. Un
 * healthcheck contra un endpoint JSON no lo haria.
 */
const SERVICIOS: { dockerfile: string; esperado: 'prefijo-global' | 'raiz' }[] = [
  { dockerfile: 'src/api/Dockerfile', esperado: 'prefijo-global' },
  { dockerfile: 'src/admin/Dockerfile', esperado: 'raiz' },
  { dockerfile: 'src/apps/base/Dockerfile', esperado: 'raiz' },
  { dockerfile: 'src/apps/client/Dockerfile', esperado: 'raiz' },
];

describe('El healthcheck de cada imagen apunta a una ruta real (PT-129)', () => {
  const main = readFileSync(join(RAIZ, 'src/api/src/main.ts'), 'utf8');
  const prefijo = prefijoGlobal(main);

  it('el prefijo global se lee de main.ts, no se supone', () => {
    // Si esto fallara, todo lo de abajo estaria comparando contra una cadena vacia y pasaria
    // vacuamente. No se aprueba lo que no se puede mirar.
    expect(prefijo).toBe('/api/v1');
  });

  describe.each(SERVICIOS)('$dockerfile', ({ dockerfile, esperado }) => {
    const completa = join(RAIZ, dockerfile);

    it('existe — los cuatro servicios necesitan imagen de produccion', () => {
      // ADMIN, BASE y CLIENT solo tenian `Dockerfile.dev`: tres de los cuatro servicios no tenian
      // artefacto desplegable.
      expect(existsSync(completa)).toBe(true);
    });

    it('su healthcheck pide una ruta que el servicio sirve de verdad', () => {
      if (!existsSync(completa)) return; // el `it` de arriba ya lo acusa

      const urls = urlsDeHealthcheck(readFileSync(completa, 'utf8'));
      expect(urls.length).toBeGreaterThan(0);

      for (const url of urls) {
        const camino = new URL(url).pathname;

        if (esperado === 'prefijo-global') {
          // El API: `/health` a secas devuelve 404 desde que existe el prefijo. Es H-017.
          expect(camino.startsWith(prefijo)).toBe(true);
        } else {
          // Los SSR: la raiz. No tienen endpoint de salud, y servir la pagina ES la senal.
          expect(camino).toBe('/');
        }
      }
    });
  });

  describe('casos de control', () => {
    it('C1: detecta una ruta sin el prefijo', () => {
      const falso = 'HEALTHCHECK CMD node -e "get(\'http://localhost:3000/health\')"';
      const camino = new URL(urlsDeHealthcheck(falso)[0]).pathname;

      expect(camino.startsWith('/api/v1')).toBe(false);
    });

    it('C2: sin setGlobalPrefix, el prefijo es vacio y no se inventa', () => {
      expect(prefijoGlobal('const app = await NestFactory.create(AppModule);')).toBe('');
    });

    it('C3: no se cuelan URLs que no son del healthcheck', () => {
      // Un `Dockerfile` puede citar un registro o una documentacion. Solo interesan las locales.
      const conRuido = ['# ver https://docs.docker.com/healthcheck', 'FROM node:20-alpine'].join(
        '\n',
      );

      expect(urlsDeHealthcheck(conRuido)).toEqual([]);
    });
  });
});
