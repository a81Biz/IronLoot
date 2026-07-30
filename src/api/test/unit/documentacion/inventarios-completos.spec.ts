import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-197 — **Un inventario que dice «todos» los nombra todos.**
 *
 * ## De dónde sale
 *
 * De medir los seis inventarios, que era una de las clases que `PT-189` dejó declaradas **sin guarda**.
 * Dos afirmaban completitud y no la tenían:
 *
 * | Inventario | Decía | Nombraba |
 * |---|---|---|
 * | `entities.md` | *«All Prisma models and enums»* | **52 de 56** — faltaban cuatro enums |
 * | `services.md` | *«All injectable NestJS services across services»* | **39 de 48** |
 *
 * ## Por qué esto no es «una lista un poco corta»
 *
 * **Ninguno de los dos afirmaba nada falso**: no nombraban entidades inexistentes. Y aun así engañan,
 * porque **se leen como completos**. Quien busque `PaymentCycleStatus` en el inventario de entidades y
 * no lo encuentre concluye que no existe — y actúa en consecuencia.
 *
 * Es la forma silenciosa de H-016: un documento sin citas se lee con desconfianza; uno que dice
 * «todos» y le faltan cuatro se lee con confianza y es incompleto.
 *
 * `services.md` tenía además una contradicción interna: el título prometía *«across services»* y su
 * línea de origen declaraba sólo `src/api/src/modules/**` y **un** fichero de ADMIN. Las dos frases no
 * podían ser ciertas a la vez.
 *
 * ## Qué se mide, y qué no
 *
 * **Se mide la cobertura, no el contenido de cada fila.** Que un enum esté nombrado no garantiza que
 * sus valores estén al día; eso exigiría comparar celda a celda y produciría falsos positivos con
 * cualquier reformateo. Lo que esta guarda impide es lo que ocurrió: que un modelo nuevo entre al
 * esquema y **nadie lo añada**.
 *
 * `routes.md`, `components.md` e `integrations.md` **siguen sin guarda**, y eso queda escrito en
 * `HANDOFF.md`: sus fuentes no son mecánicamente enumerables como un esquema Prisma o un patrón de
 * fichero.
 */
const RAIZ = raizDelMonorepo();
const INV = join(RAIZ, 'docs', 'enterprise-documentation', 'inventory');

const leer = (p: string) => readFileSync(p, 'utf-8');

/** Ficheros que casan un sufijo bajo un árbol, sin `node_modules`, `dist` ni specs. */
function ficheros(raiz: string, sufijo: string): string[] {
  const salida: string[] = [];
  const recorrer = (dir: string) => {
    let entradas: string[];
    try {
      entradas = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entradas) {
      if (e === 'node_modules' || e === 'dist' || e === 'coverage') continue;
      const p = join(dir, e);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (e.endsWith(sufijo) && !e.endsWith('.spec.ts')) salida.push(p);
    }
  };
  recorrer(raiz);
  return salida;
}

describe('Los inventarios que dicen «todos» los nombran todos — PT-197', () => {
  describe('entities.md — modelos y enums de Prisma', () => {
    const esquema = leer(join(RAIZ, 'src', 'api', 'prisma', 'schema.prisma'));
    const enElEsquema = new Set([
      ...[...esquema.matchAll(/^model (\w+)/gm)].map((m) => m[1]),
      ...[...esquema.matchAll(/^enum (\w+)/gm)].map((m) => m[1]),
    ]);
    const enElDoc = new Set(
      [...leer(join(INV, 'entities.md')).matchAll(/^\| `(\w+)`/gm)].map((m) => m[1]),
    );

    it('C1: ningun modelo ni enum del esquema falta en el inventario', () => {
      const faltan = [...enElEsquema].filter((e) => !enElDoc.has(e)).sort();

      expect(faltan).toEqual([]);
    });

    it('C2: y el inventario no nombra nada que el esquema no tenga', () => {
      // El otro sentido: nombrar lo que no existe es peor que omitirlo, porque manda a buscar.
      const sobran = [...enElDoc].filter((e) => !enElEsquema.has(e)).sort();

      expect(sobran).toEqual([]);
    });

    it('AC-01 (control): se leyeron los dos lados', () => {
      // Sin esto, una ruta mal construida daria dos conjuntos vacios y **C1 y C2 pasarian en vacio**.
      expect(enElEsquema.size).toBeGreaterThan(30);
      expect(enElDoc.size).toBeGreaterThan(30);
    });
  });

  describe('services.md — servicios inyectables', () => {
    const RAICES = [
      join(RAIZ, 'src', 'api', 'src'),
      join(RAIZ, 'src', 'admin', 'src'),
      join(RAIZ, 'src', 'apps', 'base', 'src'),
      join(RAIZ, 'src', 'apps', 'client', 'src'),
    ];
    const reales = new Set<string>();
    for (const r of RAICES) {
      for (const f of ficheros(r, '.service.ts')) {
        for (const m of leer(f).matchAll(/export class (\w+)/g)) reales.add(m[1]);
      }
    }
    const enElDoc = new Set(
      [...leer(join(INV, 'services.md')).matchAll(/`(\w+(?:Service|Client|Logger))`/g)].map(
        (m) => m[1],
      ),
    );

    it('C3: ninguna clase de un `*.service.ts` falta en el inventario', () => {
      const faltan = [...reales].filter((s) => !enElDoc.has(s)).sort();

      expect(faltan).toEqual([]);
    });

    it('AC-02 (control): se leyeron los dos lados', () => {
      expect(reales.size).toBeGreaterThan(40);
      expect(enElDoc.size).toBeGreaterThan(40);
    });

    it('AC-03: el alcance declarado incluye los cuatro servicios, no solo el API', () => {
      // La contradiccion que habia: el titulo prometia «across services» y el origen declaraba solo
      // `src/api/src/modules/**`. Un documento no puede prometer mas de lo que su fuente alcanza.
      const cabecera = leer(join(INV, 'services.md')).slice(0, 600);

      expect(cabecera).toMatch(/src\/admin\/src/);
      expect(cabecera).toMatch(/apps/);
    });
  });

  describe('lo que NO se vigila, declarado', () => {
    it('AC-04: los otros tres inventarios existen, aunque no tengan guarda', () => {
      // `routes.md`, `components.md` e `integrations.md` no se comprueban: sus fuentes no son
      // mecanicamente enumerables como un esquema Prisma o un patron de fichero. Se declara aqui en
      // vez de dejar creer que los seis estan cubiertos.
      for (const f of ['routes.md', 'components.md', 'integrations.md']) {
        expect(leer(join(INV, f)).length).toBeGreaterThan(200);
      }
    });
  });
});
