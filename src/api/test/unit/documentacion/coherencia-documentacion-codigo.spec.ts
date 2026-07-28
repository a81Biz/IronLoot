import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * PT-130 (PTSA H-016) — La documentacion no puede mentir en silencio.
 *
 * `03-TRD.md` tiene una tabla de stack con **columna de fuente**: cada fila cita `fichero:linea`.
 * Esa columna es lo que convierte la tabla en verificable. Al comprobarla, en S-002:
 *
 *     5 de 5 citas apuntan a la LINEA EQUIVOCADA
 *     1 de 5 versiones era FALSA
 *
 *     Node.js     citaba :137  ->  la linea real es :152
 *     npm         citaba :138  ->  :153
 *     NestJS      citaba :36   ->  :47      y declaraba ^10.3.0 cuando el codigo dice ^11.0.0
 *     Prisma      citaba :50   ->  :58      (la version SI coincidia: ^5.8.0)
 *     TypeScript  citaba :101  ->  :110     (la version SI coincidia: ^5.3.3)
 *
 * La revision S-002-R2 de H-016 dijo «3 de 5 versiones falsas». **Era una.** Lo instalado (Prisma
 * 5.22.0, TypeScript 5.9.3) difiere de lo declarado por deriva normal de semver dentro del rango
 * `^`, y eso NO es un error documental. El dato quedo corregido en la ficha del hallazgo.
 *
 * Lo que se sostiene entero es el fondo: **ninguna de las cinco citas resolvia**.
 *
 * Las lineas se desplazaron segun crecia `package.json` y nadie las siguio. Es peor que un dato
 * viejo: es una tabla que **aparenta ser verificable** y en la que no se puede verificar nada. Un
 * documento sin citas se lee con desconfianza; uno con citas rotas se lee con confianza y es falso.
 *
 * Es la **tercera vez** que este repositorio se encuentra con documentacion que miente: PT-090,
 * PT-103 (F-33), y ahora H-016. Las dos anteriores se corrigieron a mano y volvio. PT-103 dejo
 * escrita la conclusion, y vale entera aqui:
 *
 *   «La conclusion no es "hay que tener mas cuidado": es que la disciplina sin mecanismo caduca.»
 *
 * Dos decisiones que conviene conocer antes de tocar esto:
 *
 * 1. **Solo afirmaciones contrastables.** Versiones citadas y rutas de salud. Prosa, descripciones
 *    y decisiones de diseño quedan fuera. Es la decision 1 de `coherencia-deuda-tecnica.spec.ts`:
 *    un falso negativo deja pasar una incoherencia; un falso positivo hace que alguien borre la
 *    guarda, y entonces se pierde tambien lo que si protegia.
 * 2. **Se comprueban DOS cosas por fila**: que la linea citada contiene el paquete que dice, y que
 *    la version coincide. Mirar solo la version habria dejado pasar que ninguna cita resuelve.
 *
 * Corolario, dicho porque es una limitacion real: **una afirmacion sin cita no es verificable y
 * esta guarda no la mira.** Quien quiera que un dato quede protegido, tiene que citarlo.
 */
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');

export interface FilaDeStack {
  paquete: string;
  versionDeclarada: string;
  fichero: string;
  linea: number;
}

/** Las filas de una tabla de stack que citan `fichero:linea`. */
export function filasCitadas(markdown: string): FilaDeStack[] {
  const re = /^\|\s*([A-Za-z][\w.@/-]*)\s*\|\s*(\^?[\d][\w.\-^~]*)\s*\|\s*`([^`:]+):(\d+)`\s*\|/gm;
  return [...markdown.matchAll(re)].map((m) => ({
    paquete: m[1],
    versionDeclarada: m[2],
    fichero: m[3],
    linea: Number(m[4]),
  }));
}

/** El nombre npm del paquete al que se refiere una fila del TRD. */
const NOMBRE_NPM: Record<string, string> = {
  NestJS: '@nestjs/core',
  Prisma: '@prisma/client',
  TypeScript: 'typescript',
};

/** La linea `n` de un fichero (1-indexada), o null si esta fuera de rango. */
export function lineaDe(ruta: string, n: number): string | null {
  if (!existsSync(ruta)) return null;
  const lineas = readFileSync(ruta, 'utf8').split('\n');
  return n >= 1 && n <= lineas.length ? lineas[n - 1] : null;
}

const TRD = join(RAIZ, 'docs/enterprise-documentation/03-TRD.md');
const CLAUDE = join(RAIZ, 'CLAUDE.md');

describe('La documentacion coincide con el codigo que cita (PT-130)', () => {
  it('los documentos del alcance existen — sin clausula de escape', () => {
    // `coherencia-deuda-tecnica.spec.ts` se salta a si misma cuando faltan los documentos, porque
    // `docs/` estaba en `.gitignore`. **Esa premisa ya no se cumple**: H-009 se corrigio y los
    // cinco estan seguidos por git. Asi que aqui se exigen: si falta uno, esto FALLA.
    expect(existsSync(TRD)).toBe(true);
    expect(existsSync(CLAUDE)).toBe(true);
  });

  describe('la tabla de stack del TRD', () => {
    const filas = existsSync(TRD) ? filasCitadas(readFileSync(TRD, 'utf8')) : [];

    it('tiene filas con cita — si no, no habria nada que comprobar', () => {
      expect(filas.length).toBeGreaterThan(0);
    });

    it('cada cita apunta a una linea que contiene el paquete que dice', () => {
      const rotas: string[] = [];

      for (const f of filas) {
        const npm = NOMBRE_NPM[f.paquete];
        if (!npm) continue; // solo se comprueban las filas cuyo nombre npm se conoce

        const contenido = lineaDe(join(RAIZ, f.fichero), f.linea);
        if (contenido === null || !contenido.includes(npm)) {
          rotas.push(
            `${f.paquete}: ${f.fichero}:${f.linea} -> ${contenido?.trim() ?? '(fuera de rango)'}`,
          );
        }
      }

      expect(rotas).toEqual([]);
    });

    it('cada version declarada coincide con la que dice el package.json citado', () => {
      const desviadas: string[] = [];

      for (const f of filas) {
        const npm = NOMBRE_NPM[f.paquete];
        if (!npm) continue;

        const ruta = join(RAIZ, f.fichero);
        if (!existsSync(ruta)) continue;

        const pkg = JSON.parse(readFileSync(ruta, 'utf8')) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const real = pkg.dependencies?.[npm] ?? pkg.devDependencies?.[npm];

        if (real && real !== f.versionDeclarada) {
          desviadas.push(`${f.paquete}: el TRD dice ${f.versionDeclarada}, el codigo dice ${real}`);
        }
      }

      expect(desviadas).toEqual([]);
    });
  });

  /**
   * PT-135 — Las citas de la PROSA, que la tabla dejaba fuera.
   *
   * PT-130 corrigio las cinco filas de la tabla de stack y las dejo vigiladas. La prosa del mismo
   * documento se quedo sin cubrir, y se podrio: al tocar `src/api/package.json` en PT-135 aparecieron
   * **tres citas que llevaban tiempo apuntando a otro sitio**, y ninguna por desplazamiento de una
   * linea:
   *
   *     «Socket.io v4 (package.json:65)»  ->  la 65 dice `"handlebars": "^4.7.8",`  (socket.io: 78)
   *     «BullMQ v5 (package.json:38)»     ->  la 38 dice `},`                        (bullmq: 62)
   *     «Source: package.json:42»         ->  la 42 dice `"dependencies": {`
   *
   * Es H-016 otra vez: una cita precisa se lee con confianza, y por eso una cita falsa es peor que
   * ninguna. Y es la demostracion del corolario del propio repositorio: **lo que no se cita, no se
   * protege** — aqui, lo que la guarda no cubria.
   *
   * QUE COMPRUEBA Y QUE NO, declarado: no puede saber a que paquete se refiere una frase en prosa.
   * Si comprueba el modo de fallo dominante —el que produjo H-016 y estos tres—: que la linea citada
   * sea una **entrada real** `"clave": "valor"` y no una llave estructural ni una cabecera de
   * seccion. Una cita que aterriza en `},` esta rota por definicion, diga lo que diga la frase.
   */
  describe('las citas de la prosa del TRD', () => {
    const CITA_A_PACKAGE_JSON = /`([^`:]*package\.json):(\d+)`/g;
    /** Lineas que no pueden ser el destino legitimo de una cita: no declaran nada. */
    const ES_ESTRUCTURAL = /^\s*[{}[\],]*\s*$|^\s*"[\w-]+"\s*:\s*[{[]\s*$/;

    const citas = existsSync(TRD)
      ? [...readFileSync(TRD, 'utf8').matchAll(CITA_A_PACKAGE_JSON)].map((m) => ({
          fichero: m[1],
          linea: Number(m[2]),
        }))
      : [];

    it('hay citas que mirar — si no, esta guarda no vigila nada', () => {
      expect(citas.length).toBeGreaterThan(0);
    });

    it('ninguna aterriza en una llave o en una cabecera de seccion', () => {
      const rotas = citas
        .map((c) => ({ ...c, contenido: lineaDe(join(RAIZ, c.fichero), c.linea) }))
        .filter((c) => c.contenido === null || ES_ESTRUCTURAL.test(c.contenido))
        .map((c) => `${c.fichero}:${c.linea} -> ${c.contenido?.trim() ?? '(fuera de rango)'}`);

      expect(rotas).toEqual([]);
    });
  });

  describe('las rutas de salud documentadas', () => {
    const claude = existsSync(CLAUDE) ? readFileSync(CLAUDE, 'utf8') : '';

    it('no documenta `/health` sin el prefijo global', () => {
      // `main.ts` fija `setGlobalPrefix('api')` mas versionado. `/health` a secas devuelve 404.
      // Medido en vivo: /health -> 404 · /api/v1/health -> 200.
      expect(claude).not.toMatch(/`\/health`/);
      expect(claude).not.toMatch(/`\/health\/detailed`/);
    });
  });

  describe('casos de control', () => {
    it('C1: reconoce una fila con cita', () => {
      const md = '| NestJS | ^11.0.0 | `src/api/package.json:50` |';
      expect(filasCitadas(md)).toEqual([
        {
          paquete: 'NestJS',
          versionDeclarada: '^11.0.0',
          fichero: 'src/api/package.json',
          linea: 50,
        },
      ]);
    });

    it('C2: una fila SIN cita no se mira — no se inventa cobertura', () => {
      // Limitacion declarada: lo que no se cita, no se protege.
      expect(filasCitadas('| NestJS | ^11.0.0 | lo dijo alguien |')).toEqual([]);
    });

    it('C3: una linea fuera de rango se detecta, no se ignora', () => {
      expect(lineaDe(join(RAIZ, 'src/api/package.json'), 999999)).toBeNull();
    });

    it('C4: no acusa a la prosa', () => {
      const prosa = 'El sistema usa NestJS 11 y esta muy bien documentado.';
      expect(filasCitadas(prosa)).toEqual([]);
    });

    it('C5: una cita que aterriza en una llave se detecta — el estado real de PT-135', () => {
      // Las tres citas de prosa del TRD apuntaban a `},`, a `"dependencies": {` y a `"handlebars"`.
      // Las dos primeras son el modo de fallo que esta guarda existe para cazar.
      const estructural = /^\s*[{}[\],]*\s*$|^\s*"[\w-]+"\s*:\s*[{[]\s*$/;

      expect(estructural.test('    },')).toBe(true);
      expect(estructural.test('  "dependencies": {')).toBe(true);
      expect(estructural.test('  }')).toBe(true);
    });

    it('C6: una entrada real NO se acusa — un falso positivo tambien mata un control', () => {
      const estructural = /^\s*[{}[\],]*\s*$|^\s*"[\w-]+"\s*:\s*[{[]\s*$/;

      expect(estructural.test('    "@nestjs/core": "^11.0.0",')).toBe(false);
      expect(estructural.test('    "node": ">=20.0.0",')).toBe(false);
    });
  });
});
