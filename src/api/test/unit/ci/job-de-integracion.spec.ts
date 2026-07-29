import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-128 (PTSA H-015) — El job «Integration Tests» tiene que verificar algo.
 *
 * `ci.yml` levantaba un Postgres y ejecutaba la suite e2e contra el. **Entre ambas cosas no habia
 * ningun paso que creara el esquema**: ni `migrate deploy`, ni `db push`, ni `prisma generate`. La
 * base llegaba vacia, y hay 17 ficheros e2e que correr, asi que `--passWithNoTests` no salvaba
 * nada.
 *
 * `build: needs: [test-unit, test-integration]` y `docker: needs: build`. Con `test-integration`
 * incapaz de terminar en verde, **ni `build` ni `docker` se ejecutaban jamas**: del pipeline no
 * salia ni artefacto compilado ni imagen verificada.
 *
 * Esta guarda vigila las dos cosas que no pueden faltar, y **una que no puede aparecer**:
 *
 * 1. `prisma generate` — sin el, el cliente puede quedar sin generar (`npm install` en la raiz no
 *    lo dispara: `src/api/package.json` no tiene `postinstall`).
 * 2. `prisma migrate deploy` — el esquema.
 * 3. **`db push` NO puede usarse aqui.** Es la trampa que causo H-014: aplica esquema sin dejar
 *    rastro y sin verificar el artefacto desplegable. Con `migrate deploy`, este job es ademas la
 *    prueba continua de que las migraciones de PT-127 siguen funcionando — gratis, en cada push.
 *
 * Es estrecha a proposito: mira el job por nombre y solo esas tres condiciones. Una guarda con
 * falsos positivos acaba borrada, y con ella lo que si protegia (la leccion de PT-103).
 */
const RAIZ = raizDelMonorepo();
const CI = join(RAIZ, '.github', 'workflows', 'ci.yml');

/**
 * El bloque de un job, desde su cabecera hasta el siguiente job al mismo nivel.
 *
 * **Los comentarios se descartan.** La guarda vigila lo que el job EJECUTA, no lo que explica: sin
 * esto, un comentario que dijera «aqui no se usa `db push`» haria fallar la comprobacion que
 * prohibe `db push`. Paso de verdad al escribir este fichero.
 */
export function bloqueDelJob(yml: string, nombre: string): string | null {
  const lineas = yml.split('\n');
  const inicio = lineas.findIndex((l) => l.startsWith(`  ${nombre}:`));
  if (inicio === -1) return null;

  const resto = lineas.slice(inicio + 1);
  const fin = resto.findIndex((l) => /^ {2}[a-z][a-z0-9-]*:/.test(l));
  return (fin === -1 ? resto : resto.slice(0, fin)).filter((l) => !/^\s*#/.test(l)).join('\n');
}

describe('El job de integracion aplica el esquema antes de los tests (PT-128)', () => {
  const yml = existsSync(CI) ? readFileSync(CI, 'utf8') : '';

  it('el fichero de CI existe', () => {
    // Si no existiera, todo lo de abajo pasaria vacuamente. No se aprueba lo que no se puede mirar.
    expect(existsSync(CI)).toBe(true);
    expect(yml.length).toBeGreaterThan(0);
  });

  it('AC-01: el job test-integration existe', () => {
    expect(bloqueDelJob(yml, 'test-integration')).not.toBeNull();
  });

  it('AC-02: genera el cliente Prisma antes de los tests', () => {
    // Vale el comando directo o el alias de npm que lo envuelve (`db:generate`).
    expect(bloqueDelJob(yml, 'test-integration')).toMatch(/prisma generate|db:generate/);
  });

  it('AC-03: aplica el esquema con `migrate deploy`', () => {
    // Vale el comando directo o el alias de npm que lo envuelve (`db:migrate:deploy`, que es
    // `npx prisma migrate deploy` en `package.json`). Lo que importa es el mecanismo, no la forma
    // de invocarlo.
    expect(bloqueDelJob(yml, 'test-integration')).toMatch(
      /prisma migrate deploy|db:migrate:deploy/,
    );
  });

  it('AC-04: NO usa `db push` — es la trampa que causo H-014', () => {
    // Un `db push` aqui dejaria el job verde sobre un esquema que nadie ha verificado, y las
    // migraciones volverian a divergir sin que nada lo dijera.
    expect(bloqueDelJob(yml, 'test-integration')).not.toMatch(/db push/);
  });

  it('AC-05: `build` sigue dependiendo del job de integracion', () => {
    // Desbloquear `build` quitandole la dependencia seria hacer verde el pipeline vaciandolo de
    // contenido. La dependencia se conserva a proposito.
    expect(bloqueDelJob(yml, 'build')).toMatch(/needs:.*test-integration/);
  });

  it('AC-06 (control): un job inventado no existe', () => {
    // Sin este caso, un `bloqueDelJob` que devolviera siempre algo haria pasar todo lo anterior.
    expect(bloqueDelJob(yml, 'job-que-no-existe')).toBeNull();
  });

  it('AC-07 (control): el extractor no se lleva el job siguiente', () => {
    const yaml = ['jobs:', '  uno:', '    run: a', '  dos:', '    run: b'].join('\n');

    expect(bloqueDelJob(yaml, 'uno')).toContain('run: a');
    expect(bloqueDelJob(yaml, 'uno')).not.toContain('run: b');
  });

  it('AC-08 (control): un comentario que menciona `db push` no hace fallar la guarda', () => {
    // Sin descartar comentarios, el propio comentario que explica por que NO se usa `db push`
    // haria fallar AC-04. Paso de verdad al escribir este fichero: la primera version de la guarda
    // se acusaba a si misma.
    const yaml = [
      'jobs:',
      '  uno:',
      '    # aqui no se usa db push, a proposito',
      '    run: prisma migrate deploy',
    ].join('\n');

    expect(bloqueDelJob(yaml, 'uno')).not.toMatch(/db push/);
    expect(bloqueDelJob(yaml, 'uno')).toMatch(/migrate deploy/);
  });
});
