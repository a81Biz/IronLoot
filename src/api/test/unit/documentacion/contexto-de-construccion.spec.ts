import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * F-42 (PT-126) — Un `COPY . .` sin `.dockerignore` mete en la imagen cosas del disco de quien
 * construye.
 *
 * ADMIN arranco con el `dist/` vacio y murio con `Cannot find module '/app/dist/main'`. La causa no
 * era NestJS 11: era `tsconfig.tsbuildinfo`, el estado de la compilacion incremental. Esta
 * gitignored —asi que nadie lo ve en un diff— pero **`COPY . .` no lee `.gitignore`**, y ningun
 * servicio tenia `.dockerignore`. El fichero viajaba a la imagen, y ahi dentro `tsc` lo leia,
 * concluia que ya habia emitido todo, y no emitia nada. Con `deleteOutDir: false` —puesto a
 * proposito por PT-094 para cerrar TD-013— no habia nada que rellenara el hueco.
 *
 * El sintoma es identico al de F-36 y TD-013, y por eso costo verlo: ya se habia «arreglado» dos
 * veces, en otro sitio.
 *
 * Lo que esta prueba fija no es el fichero concreto: es que **el contexto de construccion este
 * declarado**. Un `.dockerignore` ausente no da error en ningun sitio; sencillamente mete en la
 * imagen lo que hubiera en la carpeta del ultimo que construyo.
 */
describe('El contexto de construccion de Docker esta acotado (F-42)', () => {
  /**
   * PT-141 — Esto era `join(__dirname, '../../../../..')`, y **la guarda no podia ejecutarse dentro
   * del contenedor**: el API vive en `/app` y el repositorio se monta en `/repo`, asi que contar
   * cinco `..` daba `/` y el `readdirSync` moria con `ENOENT` antes del primer `it`. Una suite que
   * no arranca no acusa nada — el patron mas repetido de este repositorio (RULE-26).
   *
   * `raizDelMonorepo()` (PT-137) resuelve la raiz **comprobandola**, y lanza si no la encuentra en
   * vez de devolver una ruta parcial. Contar `..` funciona hasta que alguien mueve el fichero o lo
   * ejecuta desde otro sitio, y entonces falla en silencio o donde nadie mira.
   */
  const raiz = raizDelMonorepo();

  /** Servicios con Dockerfile propio, descubiertos — no una lista escrita a mano. */
  const servicios = ['src/api', 'src/apps/base', 'src/apps/client', 'src/admin'].filter((s) =>
    readdirSync(join(raiz, s)).some((f) => f.startsWith('Dockerfile')),
  );

  it('CD-01: se encontraron los servicios con Dockerfile', () => {
    // Si esto falla, la prueba esta mirando donde no es y todo lo demas es un falso verde.
    expect(servicios.length).toBeGreaterThanOrEqual(4);
  });

  describe.each(servicios)('%s', (servicio) => {
    const dockerfiles = readdirSync(join(raiz, servicio)).filter((f) => f.startsWith('Dockerfile'));

    const copiaTodo = dockerfiles.some((f) =>
      /^COPY\s+\.\s+\./m.test(readFileSync(join(raiz, servicio, f), 'utf8')),
    );

    it('CD-02: si hace `COPY . .`, tiene .dockerignore', () => {
      if (!copiaTodo) return; // Nada que acotar.

      expect(existsSync(join(raiz, servicio, '.dockerignore'))).toBe(true);
    });

    it.each(['*.tsbuildinfo', 'node_modules', 'dist'])(
      'CD-03: y ese .dockerignore excluye %s',
      (patron) => {
        if (!copiaTodo) return;

        const contenido = readFileSync(join(raiz, servicio, '.dockerignore'), 'utf8');

        expect(contenido).toContain(patron);
      },
    );
  });
});
