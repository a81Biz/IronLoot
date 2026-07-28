import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * PT-136 — Toda rama nombrada en el disparador de un workflow tiene que existir en el remoto.
 *
 * `.github/workflows/ci.yml` disparaba en `[dev, qa, prep, prod]`. La unica rama de este
 * repositorio —local y remota— es `master`. Las cuatro **no existen**, y nunca han existido: son
 * los nombres de una convencion de ramas que este proyecto no adopto.
 *
 * Consecuencia medida el 2026-07-28:
 *
 *     gh api repos/a81Biz/IronLoot/actions/runs --jq .total_count   ->  0
 *
 * **Cero ejecuciones en toda la historia del repositorio.** Los ocho jobs, escritos y correctos.
 * Los tres checkpoints de auditoria —`schema-drift`, `security-audit`, `observabilidad`— declarados
 * en `CLAUDE.md` como vigilancia que un job roto no puede ocultar, **sin una sola ejecucion**.
 *
 * Y no daba ningun error: el YAML es valido y GitHub lista el workflow como `active`. Es el patron
 * que este repositorio ya pago tres veces —H-014 con `db push`, H-015 con el job colgado, H-017 con
 * el healthcheck de la imagen—, esta vez sobre la plataforma donde viven todos los controles:
 * **un mecanismo que no se ejecuta no avisa de nada.**
 *
 * Por que una guarda y no solo corregir el YAML: PT-129 tapo su sintoma con un parche en un
 * `Dockerfile` y el mismo defecto volvio dos veces mas. Un `ci.yml` corregido a mano hoy se vuelve
 * a desalinear el dia que alguien anada un workflow copiando el disparador del anterior.
 */
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');
const WORKFLOWS = join(RAIZ, '.github', 'workflows');

/**
 * Las ramas nombradas en el `on:` de un workflow.
 *
 * Se leen las dos listas —`push` y `pull_request`—, no solo la primera: un `push` correcto con un
 * `pull_request` apuntando a una rama fantasma deja las PR sin verificar, que es la mitad del
 * defecto.
 *
 * Parseo por linea en vez de con un parser de YAML a proposito: la dependencia no existe hoy en el
 * API y meter una para leer dos listas seria pagar mucho por poco. El formato que acepta es el que
 * el repositorio usa —`branches: [a, b]` y la forma con guiones—, y si alguien escribe otro, esta
 * funcion devuelve vacio y el `it` de mas abajo lo acusa.
 */
export function ramasDelDisparador(yml: string): string[] {
  const ramas: string[] = [];
  const lineas = yml.split('\n');

  for (let i = 0; i < lineas.length; i++) {
    const enLinea = lineas[i].match(/^\s*branches:\s*\[(.+)\]\s*$/);
    if (enLinea) {
      ramas.push(...enLinea[1].split(',').map((r) => r.trim().replace(/['"]/g, '')));
      continue;
    }

    // Forma con guiones:  branches:
    //                       - master
    if (/^\s*branches:\s*$/.test(lineas[i])) {
      for (let j = i + 1; j < lineas.length; j++) {
        const item = lineas[j].match(/^\s*-\s*(.+?)\s*$/);
        if (!item) break;
        ramas.push(item[1].replace(/['"]/g, ''));
      }
    }
  }

  return [...new Set(ramas.filter(Boolean))];
}

/** Un patron (`release/**`, `v*`) no es una rama: no se puede comprobar que "exista". */
export function esPatron(rama: string): boolean {
  return /[*?[\]!]/.test(rama);
}

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

/**
 * Las ramas que existen, resueltas **sin red** siempre que se pueda.
 *
 * Se leen las referencias de seguimiento del clon (`refs/remotes/origin/*`). Es determinista,
 * instantaneo y funciona igual en el host, en el contenedor y en CI —`actions/checkout` crea la
 * referencia de la rama que descarga—.
 *
 * Lo que NO se hace es dar por buena una rama porque no se pudo comprobar. Si una rama del
 * disparador no aparece aqui, se confirma contra el remoto antes de acusar (ver `existeEnElRemoto`):
 * un checkout superficial podria no traer todas las referencias, y acusar a una rama legitima seria
 * la clase de falso positivo que hace que la gente desactive una guarda.
 */
export function ramasConocidas(): string[] {
  const salida = git(['for-each-ref', '--format=%(refname:short)', 'refs/remotes/origin']);
  if (!salida) return [];

  return salida
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => r.replace(/^origin\//, ''))
    .filter((r) => r !== 'HEAD');
}

/** Segunda opinion contra el remoto, solo para lo que no se encontro localmente. */
function existeEnElRemoto(rama: string): boolean | null {
  const salida = git(['ls-remote', '--heads', 'origin', rama]);
  if (salida === null) return null; // sin red o sin credenciales: no se sabe, y no se aprueba
  return salida.trim().length > 0;
}

/**
 * La resolucion completa: primero el clon, y si ahi no esta, el remoto.
 *
 * Existe porque **esta guarda se acuso a si misma en la primera corrida de CI**. El caso de
 * control C2 comprobaba `conocidas.includes('master')` directamente, y en CI eso es falso: el
 * checkout de una rama trae solo su propia referencia, asi que `conocidas` era
 * `["fix/PT-136-ci-que-se-ejecuta"]`.
 *
 * El chequeo de verdad **paso** —resolvio `master` por la via del remoto, que es justo para lo que
 * estaba puesta—, y lo que fallo fue el control, escrito contra el estado de mi maquina en vez de
 * contra el contrato. Un caso de control que solo pasa en un sitio no controla nada.
 *
 * Ahora los dos usan esta funcion, que es la unica forma de que el control compruebe lo mismo que
 * el chequeo.
 */
export function existe(rama: string, conocidas: string[]): boolean {
  if (conocidas.includes(rama)) return true;
  return existeEnElRemoto(rama) === true;
}

const ficheros = existsSync(WORKFLOWS)
  ? readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  : [];

describe('Las ramas del disparador de cada workflow existen (PT-136)', () => {
  const conocidas = ramasConocidas();

  it('hay workflows que comprobar', () => {
    // Si esto fallara, todo lo de abajo pasaria vacuamente. No se aprueba lo que no se puede mirar.
    expect(ficheros.length).toBeGreaterThan(0);
  });

  it('las ramas del clon se pudieron resolver', () => {
    // El mismo principio: una lista vacia haria que cualquier rama pareciera inexistente, o —peor,
    // segun como se escribiera la comprobacion— que ninguna se comprobara.
    expect(conocidas.length).toBeGreaterThan(0);
  });

  describe.each(ficheros)('%s', (fichero) => {
    const yml = readFileSync(join(WORKFLOWS, fichero), 'utf8');
    const ramas = ramasDelDisparador(yml);

    it('declara al menos una rama, o no depende de ramas', () => {
      // Un workflow solo con `workflow_dispatch` es legitimo y no nombra ramas. Lo que no es
      // legitimo es que el parseo devuelva vacio porque el formato no se entendio.
      const dependeDeRamas = /^\s*(push|pull_request):\s*$/m.test(yml);
      if (dependeDeRamas) expect(ramas.length).toBeGreaterThan(0);
    });

    it('cada rama nombrada existe', () => {
      // `existe()` mira primero el clon y solo pregunta al remoto por lo que no encuentra. Un
      // fallo de red NO absuelve: se acusa igual, porque no haber podido mirar no es un aprobado.
      const inexistentes = ramas.filter((r) => !esPatron(r)).filter((r) => !existe(r, conocidas));

      expect(inexistentes).toEqual([]);
    });
  });

  describe('casos de control', () => {
    it('C1: detecta una rama que no existe', () => {
      const falso = 'on:\n  push:\n    branches: [rama-que-no-existe-jamas]\n';

      expect(ramasDelDisparador(falso)).toEqual(['rama-que-no-existe-jamas']);
      // Por la MISMA via que el chequeo real, no mirando solo el clon: es el fallo que este
      // fichero cometio y que CI caso en su primera corrida.
      expect(existe('rama-que-no-existe-jamas', conocidas)).toBe(false);
    });

    it('C2: acepta una rama que si existe', () => {
      const bueno = 'on:\n  push:\n    branches: [master]\n';

      expect(ramasDelDisparador(bueno)).toEqual(['master']);
      // `master` no esta en `conocidas` cuando CI hace checkout de otra rama. Que esto pase en el
      // host **y** en CI es exactamente lo que se compra al resolver igual en los dos sitios.
      expect(existe('master', conocidas)).toBe(true);
    });

    it('C3: un `on:` sin `branches:` no revienta ni inventa ramas', () => {
      expect(ramasDelDisparador('on:\n  workflow_dispatch:\n')).toEqual([]);
    });

    it('C4: lee tambien las ramas de `pull_request`, no solo las de `push`', () => {
      // Un `push` correcto con un `pull_request` a una rama fantasma deja las PR sin verificar.
      const mixto =
        'on:\n  push:\n    branches: [master]\n  pull_request:\n    branches: [fantasma]\n';

      expect(ramasDelDisparador(mixto)).toEqual(['master', 'fantasma']);
    });

    it('C5: entiende la forma con guiones', () => {
      expect(
        ramasDelDisparador('on:\n  push:\n    branches:\n      - master\n      - otra\n'),
      ).toEqual(['master', 'otra']);
    });

    it('C6: un patron no se comprueba como rama', () => {
      // `release/**` no es una rama; exigir que "exista" seria acusar a un comodin legitimo.
      expect(esPatron('release/**')).toBe(true);
      expect(esPatron('master')).toBe(false);
    });

    it('C7: no se cuelan duplicados', () => {
      const repetido =
        'on:\n  push:\n    branches: [master]\n  pull_request:\n    branches: [master]\n';

      expect(ramasDelDisparador(repetido)).toEqual(['master']);
    });
  });
});
