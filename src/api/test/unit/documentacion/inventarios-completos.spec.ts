import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
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
 * **PT-198 — y la limitación que declaré era falsa.** `PT-197` dejó escrito que `routes.md`,
 * `components.md` e `integrations.md` *«no son mecánicamente enumerables»*. Medido, **los tres lo
 * son**: rutas por decorador, módulos por `export class`, y las fuentes de integraciones por
 * `existsSync`. Los tres se vigilan aquí desde entonces.
 *
 * Declarar una limitación sin medirla es la misma familia que todo lo que estas guardas persiguen —
 * sólo que esa afirmación la hice yo, y sobrevivió un commit entero antes de que la comprobara.
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

  describe('routes.md — rutas SSR declaradas por decorador', () => {
    // PT-198 — **Este bloque existe porque la afirmacion anterior era falsa.** PT-197 dejo escrito que
    // estos tres inventarios «no son mecanicamente enumerables». Medido, los tres lo son: rutas por
    // decorador, modulos por `export class`, y las fuentes de integraciones por `existsSync`.
    // Declarar una limitacion sin medirla es la misma familia que todo lo que estas guardas vigilan,
    // solo que la afirmacion la hice yo.
    const VERBOS = /@(?:Get|Post|Put|Patch|Delete)\(\s*["']([^"']*)["']/g;
    const reales: string[] = [];
    for (const base of [
      join(RAIZ, 'src', 'apps', 'base', 'src'),
      join(RAIZ, 'src', 'apps', 'client', 'src'),
      join(RAIZ, 'src', 'admin', 'src'),
    ]) {
      for (const f of ficheros(base, '.controller.ts')) {
        for (const m of leer(f).matchAll(VERBOS)) reales.push(m[1] || '/');
      }
    }
    const doc = leer(join(INV, 'routes.md'));

    it('C4: toda ruta SSR declarada por decorador esta nombrada', () => {
      const faltan = [...new Set(reales)].filter((r) => !doc.includes(r)).sort();

      expect(faltan).toEqual([]);
    });

    it('AC-05 (control): se leyeron rutas de verdad', () => {
      expect(reales.length).toBeGreaterThan(80);
    });
  });

  describe('components.md — modulos NestJS', () => {
    const locales = new Set<string>();
    for (const base of [
      join(RAIZ, 'src', 'api', 'src'),
      join(RAIZ, 'src', 'admin', 'src'),
      join(RAIZ, 'src', 'apps', 'base', 'src'),
      join(RAIZ, 'src', 'apps', 'client', 'src'),
    ]) {
      for (const f of ficheros(base, '.module.ts')) {
        for (const m of leer(f).matchAll(/export class (\w+)/g)) locales.add(m[1]);
      }
    }
    // **Solo filas de tabla, no la prosa.** La primera version leia el documento entero y **no cazo su
    // propio sabotaje**: la nota que explica el arreglo nombra `ThrottlerRedisModule` para que se
    // entienda que faltaba, asi que la guarda lo encontraba ahi y seguia verde. Quinta vez en la
    // jornada — **una guarda que nombra lo que vigila forma parte del corpus que vigila**, y aqui el
    // corpus era el propio documento inventariado.
    const doc = new Set(
      leer(join(INV, 'components.md'))
        .split('\n')
        .filter((l) => l.startsWith('| '))
        .flatMap((l) => [...l.matchAll(/`(\w+(?:Module|Service))`/g)].map((m) => m[1])),
    );

    it('C5: ningun modulo PROPIO falta en el inventario', () => {
      // **Solo los propios.** El documento nombra ademas modulos de terceros —`ConfigModule`,
      // `BullModule`, `ThrottlerModule`— y eso es deliberado: un inventario que solo liste lo propio
      // no dice de que depende el arranque. Exigir que existan como `export class` local los acusaria
      // en falso, que es como esta guarda se volveria un estorbo del que la gente aprende a escapar.
      const faltan = [...locales].filter((m) => !doc.has(m)).sort();

      expect(faltan).toEqual([]);
    });

    it('AC-06 (control): se leyeron los dos lados', () => {
      expect(locales.size).toBeGreaterThan(30);
      expect(doc.size).toBeGreaterThan(30);
    });
  });

  describe('integrations.md — su fuente declarada', () => {
    it('C6: toda ruta que declara como origen EXISTE', () => {
      // Citaba `src/packages/core/src/integrations/`, que **PT-193 retiro**. La cita sobrevivio a la
      // retirada y mandaba a un sitio inexistente: la familia de H-016, dentro del documento que
      // deberia decir de que depende el sistema.
      // **Solo la linea `**Source:**`, no la nota que la explica.** La primera version leia los
      // primeros 800 caracteres y acusaba a la propia nota, que **tiene que** nombrar el directorio
      // retirado para que se entienda por que se corrigio. Cuarta vez en la jornada que una guarda caza
      // el texto que la describe: **una guarda que nombra lo que vigila forma parte del corpus que
      // vigila.**
      const doc = leer(join(INV, 'integrations.md'));
      const linea = /^\*\*Source:\*\*([\s\S]*?)(?:\n\n|\n>)/m.exec(doc);
      expect(linea).not.toBeNull();

      const rutas = [...(linea?.[1] ?? '').matchAll(/`([\w./{},*-]+)`/g)]
        .map((m) => m[1])
        .filter((r) => r.includes('/') && !r.includes('{') && !r.includes('*'));

      const rotas = rutas.filter((r) => !existsSync(join(RAIZ, r)));

      expect(rotas).toEqual([]);
    });

    it('AC-07 (control): se leyo alguna ruta', () => {
      const cabecera = leer(join(INV, 'integrations.md')).slice(0, 800);
      expect(cabecera).toMatch(/\*\*Source:\*\*/);
    });
  });
});
