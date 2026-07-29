import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-152 (RULE-31) — La evidencia que un documento cita esta EN EL REPOSITORIO.
 *
 * ## El defecto
 *
 * `.gitignore` seguia solo los `.md` de `evidence/`, bajo el criterio «los .md son razonamiento, el
 * resto son volcados». Suena razonable y esta al reves: **la evidencia ES el volcado**. FDGE lo dice
 * sin rodeos — *«el codigo no es evidencia; la ejecucion es evidencia»*—, asi que la salida de la
 * suite, la captura del antes y el después y el JSON de verificacion no son subproductos: son la
 * prueba.
 *
 * Medido el 2026-07-29: **81 de 189 ficheros sin seguir**. Cuando se registro F-136-A eran 79 de
 * 162 — la proporcion empeoraba con cada PT. Y `PENDING_TASKS` llego a mandar leer un
 * `regresion.txt` que no esta en git.
 *
 * ## Por que importa mas de lo que parece
 *
 * Un documento que cita evidencia inexistente **se lee con confianza y es falso**. Es H-016 exacto,
 * aplicado a lo que sostiene cada cierre de PT: quien clone el repositorio y siga la cita no
 * encuentra nada, y no tiene forma de distinguir «no se subio» de «nunca existio».
 *
 * ## Lo que esta guarda comprueba, y lo que NO
 *
 * Comprueba que lo **citado** este seguido por git. No exige que se cite todo lo que existe: hay
 * evidencia legitima que ningun documento nombra —capturas de apoyo, volcados intermedios— y
 * obligar a citarla produciria documentos escritos para el linter.
 *
 * Tampoco exige que todo lo que existe este seguido: los respaldos `.sql` quedan fuera a proposito,
 * declarado en `.gitignore`. Son la copia previa a ejecutar algo, no su resultado.
 */
const RAIZ = raizDelMonorepo();

const EVIDENCIA = join(RAIZ, 'docs/implementation/evidence');

/** Donde se buscan citas a evidencia. */
const DOCUMENTOS = ['docs/implementation', 'PTSA', 'changes'];

/** Las rutas de `evidence/` que un texto cita. */
export function evidenciaCitada(texto: string): string[] {
  return [
    ...new Set(
      [
        ...texto.matchAll(/evidence\/(PT-[0-9]+[A-Za-z0-9_/.-]*\.(?:md|txt|png|json|log|sql))/g),
      ].map((m) => `docs/implementation/evidence/${m[1]}`),
    ),
  ];
}

function ficherosMd(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const salida: string[] = [];

  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) salida.push(...ficherosMd(p));
    else if (/\.(md|log)$/.test(e.name)) salida.push(p);
  }

  return salida;
}

/** Lo que git sigue bajo `evidence/`. */
function seguidos(): Set<string> {
  try {
    const salida = execSync('git ls-files docs/implementation/evidence', {
      cwd: RAIZ,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
    return new Set(salida.split('\n').filter(Boolean));
  } catch {
    return new Set();
  }
}

describe('La evidencia citada esta en git — RULE-31 (PT-152)', () => {
  const enGit = seguidos();

  const citadas = new Map<string, string>();
  for (const raiz of DOCUMENTOS) {
    for (const f of ficherosMd(join(RAIZ, raiz))) {
      for (const c of evidenciaCitada(readFileSync(f, 'utf8'))) {
        if (!citadas.has(c)) citadas.set(c, f.replace(RAIZ, '').replace(/\\/g, '/'));
      }
    }
  }

  it('git responde y hay evidencia seguida — si no, la guarda no compara nada', () => {
    // Sin esto, un `git ls-files` que fallara dejaria C1 acusando TODO o —peor, segun como se
    // escriba— pasando en vacio.
    expect(enGit.size).toBeGreaterThan(50);
  });

  it('C1: toda evidencia citada esta seguida por git', () => {
    const huerfanas = [...citadas.entries()]
      .filter(([c]) => !enGit.has(c))
      .map(([c, donde]) => `${c} — citada en ${donde}`);

    expect(huerfanas).toEqual([]);
  });

  it('C2: toda evidencia citada existe en disco', () => {
    // La otra mitad. Una cita puede estar seguida y aun asi apuntar a nada si alguien la borro.
    const inexistentes = [...citadas.entries()]
      .filter(([c]) => !existsSync(join(RAIZ, c)))
      .map(([c, donde]) => `${c} — citada en ${donde}, no existe`);

    expect(inexistentes).toEqual([]);
  });

  it('C3: se han encontrado citas — si no, C1 y C2 pasan en vacio', () => {
    expect(citadas.size).toBeGreaterThan(0);
  });

  describe('casos de control', () => {
    it('AC-01: una cita a evidencia se reconoce', () => {
      const texto = 'Ver `docs/implementation/evidence/PT-141/medicion.md` para el detalle.';

      expect(evidenciaCitada(texto)).toEqual(['docs/implementation/evidence/PT-141/medicion.md']);
    });

    it('AC-02: una carpeta sin fichero no es una cita comprobable', () => {
      // `Evidence: docs/implementation/evidence/PT-141/` es como HISTORY.log cierra cada entrada.
      // Apunta a un directorio, no a un fichero: exigirle existencia de fichero seria inventar una
      // cita que nadie escribio.
      expect(evidenciaCitada('Evidence: docs/implementation/evidence/PT-141/')).toEqual([]);
    });

    it('AC-03: se reconocen los formatos de volcado, no solo `.md`', () => {
      // El defecto era precisamente creer que solo los `.md` cuentan.
      const texto = ['evidence/PT-131/medicion-5.txt', 'evidence/PT-058/dashboard.png'].join(' ');

      expect(evidenciaCitada(texto).length).toBe(2);
    });

    it('AC-04: el directorio de evidencia existe y tiene contenido', () => {
      expect(existsSync(EVIDENCIA)).toBe(true);
      expect(readdirSync(EVIDENCIA).length).toBeGreaterThan(10);
    });
  });
});
