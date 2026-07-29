import { existsSync } from 'fs';
import { join } from 'path';

/**
 * PT-138 — Dónde está la raíz del monorepo, mirado en vez de supuesto.
 *
 * Ocho guardas y el checkpoint D3 la resolvían con `join(__dirname, '..' × 5)`. Eso vale en el host
 * y en CI, donde existe el árbol completo. **Dentro del contenedor resolvía a `/`**, porque
 * `docker-compose` montaba `/app/src`, `/app/test` y `/app/prisma` pero no el monorepo.
 *
 * Y el fallo no era ruidoso de la forma útil: la guarda de PT-129 salía con
 *
 *     readFileSync(join(RAIZ, 'src/api/src/main.ts')) -> ENOENT
 *     Test Suites: 1 failed | Tests: 0 total
 *
 * —cero pruebas ejecutadas— y el checkpoint D3 contaba **0 silencios contra una línea base de 25**,
 * que es peor: un número plausible, más bajo que el anterior, que nadie lee como avería.
 *
 * Ahora se prefiere `/repo`, que es donde el compose monta la raíz (sólo lectura). Si no existe
 * —host, CI— se sube desde este fichero como siempre.
 *
 * **Se comprueba mirando un fichero que sólo existe en la raíz**, no dando por buena la ruta: una
 * ruta que "parece" la raíz y no lo es produce exactamente el fallo silencioso que esto corrige.
 */
export function raizDelMonorepo(): string {
  const candidatos = [
    // El montaje de `docker-compose` (PT-138). Primero, porque dentro del contenedor la otra vía
    // resuelve a `/` y no falla: devuelve resultados vacíos.
    '/repo',
    // Host y CI: `src/api/scripts` -> raíz.
    join(__dirname, '..', '..', '..'),
    // Desde `src/api/test/unit/<area>` -> raíz.
    join(__dirname, '..', '..', '..', '..', '..'),
  ];

  for (const c of candidatos) {
    if (existsSync(join(c, 'docker-compose.yml')) && existsSync(join(c, 'src', 'api'))) {
      return c;
    }
  }

  throw new Error(
    'No se pudo localizar la raiz del monorepo. Se probaron: ' +
      candidatos.join(', ') +
      '. Dentro del contenedor la raiz se monta en `/repo` (docker-compose.yml, servicio `api`). ' +
      'Se lanza en vez de devolver una ruta a medias: una raiz equivocada no da error — da ' +
      'resultados vacios, que es como esta familia de guardas estuvo fallando sin que nadie lo viera.',
  );
}
