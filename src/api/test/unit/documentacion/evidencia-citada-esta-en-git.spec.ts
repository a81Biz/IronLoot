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

/**
 * PT-170 — Las **carpetas** de `evidence/` que un texto cita.
 *
 * ## Por que se añade, y por que AC-02 cambia de sentido
 *
 * Esta guarda declaraba, en su caso de control AC-02, que *«una carpeta sin fichero no es una cita
 * comprobable»*. Era **cierto para «esta seguida por git»** —git no sigue directorios— y **falso para
 * «existe»**: la existencia de un directorio se comprueba con `existsSync`.
 *
 * El coste de esa distincion se midio el 2026-07-29: **`H-023` citaba `evidence/PT-162/`, que no
 * existe** (la evidencia del grupo vive en `evidence/PT-160/`), y **`H-001` citaba `evidence/PT-026/`,
 * que nunca existio**. Los dos son hallazgos **cerrados**: quien siguiera la cita para comprobar el
 * cierre no encontraba nada. Es H-016 dentro de los propios hallazgos, y la guarda pasaba en verde con
 * las dos delante.
 *
 * AC-02 no se borra: se corrige y se explica. **Retirar un caso de control sin decir por que debilita
 * la guarda en silencio**, que es la clase de cosa que este fichero existe para impedir.
 *
 * ## Citar no es comentar
 *
 * Se descartan las lineas de **blockquote** (`>`). Un documento que explica que una cita esta rota
 * **tiene que poder escribir la ruta rota** —los avisos de PT-170 en `H-001` y `H-023` lo hacen— y
 * acusarlo obligaria a hablar de los defectos en circunloquios. La alternativa era detectar negaciones
 * en la prosa, y eso **enseña a escribir para el linter**, que es peor que el hueco.
 */
export function carpetasCitadas(texto: string): string[] {
  const sinComentarios = texto
    .split('\n')
    .filter((l) => !/^\s*>/.test(l))
    .join('\n');

  return [
    ...new Set(
      [...sinComentarios.matchAll(/evidence\/(PT-[0-9]+[A-Za-z0-9_-]*)\/(?![A-Za-z0-9_.-])/g)].map(
        (m) => `docs/implementation/evidence/${m[1]}`,
      ),
    ),
  ];
}

/**
 * Ficheros excluidos de la comprobacion de **carpetas**, por declaracion y con motivo.
 *
 * No es una puerta de escape: son los tres sitios donde escribir una ruta rota es el trabajo.
 */
const FUERA_DE_CARPETAS: { patron: RegExp; motivo: string }[] = [
  {
    patron: /HISTORY\.log$/,
    motivo:
      'append-only. Cita `evidence/PT-026/`, `PT-046/` y `PT-145/`, que no existen; corregirlo exigiria reescribir el log, y reescribirlo es falsificar el registro que la regla existe para hacer fiable. El hueco esta declarado en evidence-baseline.json.',
  },
  {
    patron: /(DISCOVERY|PLAN_ACTUAL)\.md$/,
    motivo:
      'el registro de defectos y el plan que los ataca. Su contenido es, literalmente, citar lo que esta roto.',
  },
  {
    patron: /[/\\]archive[/\\]/,
    motivo:
      'copias congeladas. Archivar un plan o un enrichment guarda el documento TAL COMO ERA; corregir una cita dentro seria falsificar el snapshot, por el mismo motivo que no se reescribe HISTORY.log. Lo descubrio esta guarda al archivarse PLAN_ACTUAL-PT-168-172.md, que dejo de casar con el patron de arriba y arrastraba la cita a evidence/PT-162/ que PT-170 documento como rota.',
  },
  {
    patron: /self-review\.md$/,
    motivo: 'la autorrevision de un PT enumera lo que encontro roto, con su ruta.',
  },
];

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

  describe('C4 (PT-170): una cita a CARPETA tambien existe', () => {
    const carpetas = new Map<string, string>();
    for (const raiz of DOCUMENTOS) {
      for (const f of ficherosMd(join(RAIZ, raiz))) {
        const relativo = f.replace(RAIZ, '').replace(/\\/g, '/');
        if (FUERA_DE_CARPETAS.some(({ patron }) => patron.test(relativo))) continue;

        for (const c of carpetasCitadas(readFileSync(f, 'utf8'))) {
          if (!carpetas.has(c)) carpetas.set(c, relativo);
        }
      }
    }

    it('se han encontrado citas a carpeta — si no, C4 pasa en vacio', () => {
      // `Evidence: docs/implementation/evidence/PT-XXX/` es la forma en que cierra cada PT: si esto
      // baja a cero, alguien cambio la convencion y C4 dejo de vigilar sin avisar.
      expect(carpetas.size).toBeGreaterThan(10);
    });

    it('C4: ninguna cita a carpeta apunta a un directorio inexistente', () => {
      const rotas = [...carpetas.entries()]
        .filter(([c]) => !existsSync(join(RAIZ, c)))
        .map(([c, donde]) => `${c} — citada en ${donde}, no existe`);

      expect(rotas).toEqual([]);
    });

    it('C5: cada exclusion declara su motivo — una exclusion sin motivo es una puerta de escape', () => {
      for (const { motivo } of FUERA_DE_CARPETAS) {
        expect(motivo.length).toBeGreaterThan(40);
      }
    });
  });

  describe('casos de control', () => {
    it('AC-01: una cita a evidencia se reconoce', () => {
      const texto = 'Ver `docs/implementation/evidence/PT-141/medicion.md` para el detalle.';

      expect(evidenciaCitada(texto)).toEqual(['docs/implementation/evidence/PT-141/medicion.md']);
    });

    it('AC-02: una carpeta no es una cita a FICHERO — pero si es una cita (PT-170)', () => {
      // Enunciado corregido, no retirado. Decia «una carpeta sin fichero no es una cita comprobable»,
      // y era cierto para «esta en git» —git no sigue directorios— y **falso para «existe»**. Ese
      // matiz dejo pasar dos citas rotas dentro de hallazgos cerrados (H-001, H-023).
      const texto = 'Evidence: docs/implementation/evidence/PT-141/';

      // Sigue sin ser una cita a fichero: exigirle un fichero seria inventar una cita que nadie escribio.
      expect(evidenciaCitada(texto)).toEqual([]);
      // Pero SI es una cita a carpeta, y esa se comprueba.
      expect(carpetasCitadas(texto)).toEqual(['docs/implementation/evidence/PT-141']);
    });

    it('AC-05 (PT-170): una cita a fichero no se cuenta ademas como cita a carpeta', () => {
      // Sin el `(?![A-Za-z0-9_.-])`, `evidence/PT-141/medicion.md` produciria tambien `PT-141` y C4
      // duplicaria el trabajo de C2 — y acusaria carpetas que la cita nunca nombro.
      expect(carpetasCitadas('ver evidence/PT-141/medicion.md')).toEqual([]);
    });

    it('AC-06 (PT-170): una ruta rota dentro de un blockquote NO se acusa', () => {
      // Los avisos de PT-170 en `H-001` y `H-023` escriben la ruta rota para explicarla. Acusarlo
      // obligaria a hablar de los defectos en circunloquios.
      const texto = '> Esto citaba `evidence/PT-026/`, que no existe.';

      expect(carpetasCitadas(texto)).toEqual([]);
    });

    it('AC-08 (PT-173): un documento archivado esta fuera, y un vivo dentro', () => {
      // El caso real: al archivar el plan como `PLAN_ACTUAL-PT-168-172.md` dejo de casar con
      // `PLAN_ACTUAL\.md$` y la guarda acuso una cita que PT-170 ya habia documentado como rota.
      // Un snapshot no se corrige: se conserva.
      const fuera = (ruta: string) => FUERA_DE_CARPETAS.some(({ patron }) => patron.test(ruta));

      expect(fuera('/docs/implementation/archive/PLAN_ACTUAL-PT-168-172.md')).toBe(true);
      expect(fuera('/docs/implementation/archive/ENRICHMENT-PT-156.md')).toBe(true);
      // Y lo vivo sigue vigilado: si esto pasara a `true`, la guarda dejaria de mirar lo que importa.
      expect(fuera('/PTSA/Hallazgos/H-023.md')).toBe(false);
      expect(fuera('/docs/implementation/PENDING_TASKS.md')).toBe(false);
    });

    it('AC-07 (PT-170): la misma ruta FUERA del blockquote si se acusa', () => {
      // Un falso negativo por exceso de indulgencia tambien mata la guarda.
      expect(carpetasCitadas('Evidencia en `evidence/PT-026/`.')).toEqual([
        'docs/implementation/evidence/PT-026',
      ]);
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
