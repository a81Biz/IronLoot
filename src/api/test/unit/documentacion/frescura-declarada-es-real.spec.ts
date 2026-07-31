import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-202 — **`FRESH` es una afirmación comprobable, y hasta hoy nadie la comprobaba.**
 *
 * ## De dónde sale
 *
 * `PTSA/ESTADO_ACTUAL.md` declara la frescura del certificado. La especificación la define sin margen:
 *
 * > **FRESH** — `commits_since_audit == 0` sobre patrones auditables.
 * > **STALE** — existen commits sobre patrones auditables sin reauditar.
 *
 * Es decir: **es una afirmación sobre el estado de git**, y por tanto medible. No se medía.
 *
 * **Ha fallado dos veces.** `S-010` se declaró `FRESH` con **28 commits y 6 PT** encima —incluida una
 * migración de esquema y cambios de autenticación—, y lo encontró `PT-197` leyendo. Corregido eso,
 * `S-011` se emitió bien… y volvió a quedarse obsoleto en cuanto `PT-200` tocó `10-Technical-Debt.md`,
 * que está en `auditable_patterns`. **También lo encontré leyendo.** Dos veces a mano es una clase sin
 * guarda.
 *
 * ## Por qué importa más de lo que parece
 *
 * `freshness` **entra en la fórmula de Confianza** con peso 0.25 (FRESH = 100, STALE = 50), y `[A8]`
 * dice que un score sin frescura válida **no es válido**. Un `FRESH` obsoleto no adorna: sostiene un
 * número que se presenta como medido.
 *
 * ## Lo que hizo falta para que fuera comprobable
 *
 * `ESTADO_ACTUAL.md` no decía **desde qué commit** se medía. Sin ese ancla, «commits_since_audit = 0»
 * no se puede contradecir: no hay contra qué contar. Ahora declara `audit_commit:` con el SHA de la
 * emisión, y eso es lo que convierte la frase en una afirmación falsable.
 *
 * ## El contrato, y su asimetría deliberada
 *
 * `FRESH` ⟹ ningún fichero de `auditable_patterns` cambió desde `audit_commit`.
 * `STALE` ⟹ no se exige nada.
 *
 * Es la misma asimetría que `RULE-38` con «sin verificar»: **se permite declarar que no se sabe; no se
 * permite afirmar que se sabe sin haberlo mirado.**
 */
const RAIZ = raizDelMonorepo();
const ESTADO = join(RAIZ, 'PTSA', 'ESTADO_ACTUAL.md');
const ALCANCE = join(RAIZ, 'PTSA', 'audit-scope.yaml');

const leer = (p: string) => readFileSync(p, 'utf-8');

/** Los items de una lista YAML de primer nivel, con comillas o sin ellas. */
export function listaYaml(yaml: string, clave: string): string[] {
  const salida: string[] = [];
  let dentro = false;

  for (const linea of yaml.split('\n')) {
    if (new RegExp(`^${clave}:\\s*$`).test(linea)) {
      dentro = true;
      continue;
    }
    if (!dentro) continue;
    if (/^\S/.test(linea)) break;

    const m = /^\s*-\s*["']?([^"'#\s]+)["']?/.exec(linea);
    if (m) salida.push(m[1]);
  }

  return salida;
}

/**
 * ¿Casa una ruta con un patrón del alcance?
 *
 * Se traduce **segmento a segmento**, no con reemplazos encadenados sobre la cadena entera. La primera
 * versión usaba centinelas y el orden de los `replace` era crítico: si `*` se sustituye antes que `**`,
 * queda `[^/]*[^/]*`, que **no cruza directorios** — `src/api/src/**` dejaría de casar con un fichero
 * anidado, la guarda filtraría de más y no acusaría jamás. Un fallo así no se ve: la prueba pasa.
 *
 * Por segmentos no hay orden que respetar, y `AC-02` lo comprueba en los dos sentidos.
 */
export function casa(fichero: string, patron: string): boolean {
  if (fichero === patron) return true;

  const segmentos = patron.split('/');
  let rx = '';

  segmentos.forEach((seg, i) => {
    const ultimo = i === segmentos.length - 1;

    if (seg === '**') {
      // Al final, `**` es «todo lo que quede»; en medio, «cero o más directorios».
      rx += ultimo ? '.*' : '(?:[^/]+/)*';

      return;
    }

    rx += seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + (ultimo ? '' : '/');
  });

  return new RegExp(`^${rx}$`).test(fichero);
}

/** Lo que `ESTADO_ACTUAL.md` afirma de sí mismo. `null` si no lo dice — y entonces el caso falla. */
export function frescuraDeclarada(doc: string): { estado: string | null; commit: string | null } {
  const e = /^Freshness:\s+(FRESH|STALE|UNKNOWN)\b/m.exec(doc);
  const c = /^audit_commit:\s+([0-9a-f]{7,40})\b/m.exec(doc);

  return { estado: e ? e[1] : null, commit: c ? c[1] : null };
}

describe('La frescura que PTSA declara es la que git puede sostener — PT-202', () => {
  const estado = leer(ESTADO);
  const yaml = leer(ALCANCE);
  const declarada = frescuraDeclarada(estado);

  const auditables = listaYaml(yaml, 'auditable_patterns');
  const ignorados = listaYaml(yaml, 'ignore_patterns');

  /** Ficheros del alcance auditable tocados desde un commit. */
  function derivaDesde(commit: string): string[] {
    const salida = execSync(`git diff --name-only ${commit}..HEAD`, {
      cwd: RAIZ,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return salida
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean)
      .filter((f) => !ignorados.some((p) => casa(f, p)))
      .filter((f) => auditables.some((p) => casa(f, p)));
  }

  it('C1: ESTADO_ACTUAL declara su frescura Y el commit desde el que se mide', () => {
    // Sin el commit, «commits_since_audit = 0» no se puede contradecir: no hay contra qué contar.
    expect(declarada.estado).not.toBeNull();
    expect(declarada.commit).not.toBeNull();
  });

  it('C2: si declara FRESH, ningun patron auditable cambio desde entonces', () => {
    if (declarada.estado !== 'FRESH') {
      // Declarar que el score caducó siempre está permitido — lo que no lo está es afirmar que sigue
      // vigente sin haberlo mirado.
      expect(declarada.estado).toMatch(/STALE|UNKNOWN/);

      return;
    }

    expect(derivaDesde(declarada.commit as string)).toEqual([]);
  });

  it('C3: el commit declarado EXISTE en el repositorio', () => {
    // Un SHA inventado haría fallar a `git diff` y, según cómo se capturase, que el caso pasara en
    // vacío. Se comprueba aparte para que el fallo diga cuál de las dos cosas está mal.
    const tipo = execSync(`git cat-file -t ${declarada.commit}`, {
      cwd: RAIZ,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    expect(tipo).toBe('commit');
  });

  describe('casos de control', () => {
    it('AC-01: el alcance se leyo — sin esto C2 no filtraria nada y pasaria siempre', () => {
      expect(auditables.length).toBeGreaterThan(20);
      expect(ignorados.length).toBeGreaterThan(5);
    });

    it('AC-02: casa() cruza directorios donde debe y NO donde no debe', () => {
      expect(casa('src/api/src/modules/wallet/wallet.service.ts', 'src/api/src/**/*.ts')).toBe(
        true,
      );
      expect(casa('src/api/src/main.ts', 'src/api/src/**/*.ts')).toBe(true);
      expect(casa('docker-compose.yml', 'docker-compose.yml')).toBe(true);
      expect(casa('src/api/test/unit/x.spec.ts', '**/*.spec.ts')).toBe(true);
      expect(casa('src/api/Dockerfile', '**/Dockerfile')).toBe(true);
      expect(casa('graphify-out/graph.json', 'graphify-out/**')).toBe(true);

      // Y lo que NO debe casar. Sin estos, un patrón que casara con todo dejaría `C2` sin poder acusar.
      expect(casa('src/api/src/README.md', 'src/api/src/**/*.ts')).toBe(false);
      expect(casa('otro/docker-compose.yml', 'docker-compose.yml')).toBe(false);
      expect(casa('src/admin/src/x.ts', 'src/api/src/**/*.ts')).toBe(false);
    });

    it('AC-03: el lector distingue FRESH de STALE y detecta la ausencia', () => {
      expect(frescuraDeclarada('Freshness:      FRESH   algo\naudit_commit: abc1234')).toEqual({
        estado: 'FRESH',
        commit: 'abc1234',
      });
      expect(frescuraDeclarada('Freshness:      STALE   algo').commit).toBeNull();
      expect(frescuraDeclarada('nada que declarar').estado).toBeNull();
    });

    it('AC-04: la deteccion de deriva SABE acusar — el propio historial lo demuestra', () => {
      // Contra `S-010` (commit `c53d7aa`) tiene que salir deriva: es el caso real que PT-197 encontró
      // leyendo. Si esto diera vacío, `C2` estaría filtrando de más y no acusaría nunca.
      expect(derivaDesde('c53d7aa').length).toBeGreaterThan(0);
    });
  });
});
