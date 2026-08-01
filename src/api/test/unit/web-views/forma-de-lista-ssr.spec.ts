import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-213 (R-051) — **La otra mitad del contrato SSR↔API: la FORMA, no la ruta.**
 *
 * `rutas-que-los-ssr-invocan.spec.ts` (PT-132, ampliada en PT-148) compara **rutas literales**:
 * comprueba que el endpoint exista. Estaba en verde mientras **cuatro pantallas llevaban quién sabe
 * cuánto tiempo permanentemente vacías**:
 *
 *   - el catálogo público leía `data.items` y el API devuelve `{data,total,page,limit}`;
 *   - la portada hacía `auctions.length` sobre ese mismo objeto;
 *   - `/notifications` y `/disputes` iteraban `.items` sobre arrays planos.
 *
 * Ninguna daba error. Las cuatro pintaban su estado vacío —«No hay subastas disponibles»— que es
 * **indistinguible de un catálogo legítimamente vacío**. Es la forma más cara de fallar que tiene este
 * sistema: el producto no puede distinguir «no hay datos» de «el contrato está roto», y siempre elige
 * contarle al usuario lo primero.
 *
 * ## Por qué esta guarda y no otra
 *
 * S-013 §SIGUIENTE·3 dejó escrita la pregunta: *«¿qué otra `RULE-NN` tiene guarda para la parte fácil de
 * medir y no para la que causó su incidente?… buscar **guardas que miran al lado del agujero**»*. Ésta es
 * la respuesta para el contrato SSR↔API: que la ruta exista es la parte fácil; que la forma coincida es
 * la que produjo el fallo.
 *
 * ## La regla, en una frase
 *
 * **Un valor que sale de una llamada al API y que la plantilla recorre como lista tiene que pasar por
 * `toItems()` y leerse como `X.items`.**
 *
 * Dos mitades, y las dos hacen falta:
 *
 *   - *leerse como `X.items`* — porque `X.length` sobre un objeto paginado es `undefined`, y `undefined`
 *     no es un error: es un `{% else %}`.
 *   - *pasar por `toItems()`* — porque es el único punto del sistema que acepta las tres formas que el
 *     API emite hoy (array plano, `{items}`, `{data,total}`) y devuelve siempre una.
 *
 * ## Lo que NO se acusa, y por qué
 *
 * Una lista **construida en el propio controlador** (`providers`, que sale de un `.map()`) no viene del
 * API: su forma la decide quien la escribe, y exigirle `toItems` sería un falso positivo. La guarda
 * distingue las dos cosas mirando si la expresión —o la variable a la que se asigna— toca `apiGet(` o
 * `fetchJson(`.
 *
 * Un falso positivo acabaría con la guarda borrada, y con ella lo que sí protege. Es la lección de
 * PT-103, y por eso los casos de control de abajo prueban **las dos direcciones**.
 */
const RAIZ = raizDelMonorepo();

interface Sitio {
  nombre: string;
  ssr: string;
  vistas: string;
}

const SITIOS: Sitio[] = [
  {
    nombre: 'CLIENT',
    ssr: join(RAIZ, 'src/apps/client/src'),
    vistas: join(RAIZ, 'src/apps/client/views'),
  },
  {
    nombre: 'BASE',
    ssr: join(RAIZ, 'src/apps/base/src'),
    vistas: join(RAIZ, 'src/apps/base/views'),
  },
];

/** Los normalizadores admitidos: devuelven `{ items: [...] }` pase lo que pase. */
const NORMALIZADORES = ['toItems(', 'mapBidsList('];

/**
 * Lo que marca a una expresión como «viene del API».
 *
 * **Con el genérico opcional**, y no como subcadena literal. BASE escribe `fetchJson<any[]>(…)`, así que
 * buscar `'fetchJson('` **no lo encontraba**: la guarda daba BASE por limpio teniendo ahí los dos peores
 * casos —la portada y el catálogo público—. Segunda vez en el mismo fichero que la guarda mide otra cosa;
 * la primera la vio la cuenta de cruces, ésta la vio el resultado absurdo (CLIENT rojo, BASE verde).
 */
const ORIGEN_API = /\b(?:apiGet|fetchJson)\s*(?:<[^>]*>)?\s*\(/;

export interface UsoDeLista {
  /** Nombre de la variable tal y como la plantilla la nombra. */
  variable: string;
  /** `items` si se lee `X.items`; `crudo` si se recorre `X` o se mide `X.length`. */
  modo: 'items' | 'crudo';
}

/**
 * Las variables que una plantilla recorre como lista.
 *
 * Se miran las tres formas con las que Nunjucks recorre o mide una lista en este repositorio:
 * `{% for a in X %}`, `X.length` y `X.items` en cualquiera de las dos.
 */
export function usosDeLista(plantilla: string): UsoDeLista[] {
  const usos = new Map<string, UsoDeLista>();

  const anotar = (variable: string, modo: 'items' | 'crudo'): void => {
    // `items` gana sobre `crudo`: si en algún punto se lee `X.items`, el contrato es `{items}`.
    const previo = usos.get(variable);
    if (previo?.modo === 'items') return;
    usos.set(variable, { variable, modo });
  };

  // {% for x in NOMBRE %} · {% for x in NOMBRE.items %}
  for (const m of plantilla.matchAll(/\{%-?\s*for\s+\w+\s+in\s+([\w.]+)\s*%\}/g)) {
    const expr = m[1];
    if (expr.endsWith('.items')) anotar(expr.slice(0, -'.items'.length), 'items');
    else if (!expr.includes('.')) anotar(expr, 'crudo');
    // `x.y.items` o `a.b` con más de un punto no es una variable de primer nivel: no se juzga.
  }

  // NOMBRE.length · NOMBRE.items.length
  for (const m of plantilla.matchAll(/([\w.]+)\.length\b/g)) {
    const base = m[1];
    if (base.endsWith('.items')) anotar(base.slice(0, -'.items'.length), 'items');
    else if (!base.includes('.')) anotar(base, 'crudo');
  }

  // {% if NOMBRE and NOMBRE.items %}
  for (const m of plantilla.matchAll(/\b(\w+)\.items\b/g)) {
    anotar(m[1], 'items');
  }

  return [...usos.values()];
}

/**
 * Lo que un controlador devuelve a una plantilla: `plantilla -> { clave: expresión }`.
 *
 * Se leen los métodos anotados con `@Render("...")` y su `return { ... }`. Es deliberadamente estrecho:
 * un controlador que devolviera algo construido de otra forma quedaría fuera, y eso se ve en la
 * comprobación de cobertura de abajo (`se han leído devoluciones`), no en un silencio.
 */
export interface Devolucion {
  /** `clave -> expresión` del `return { … }` del método. */
  claves: Map<string, string>;
  /**
   * El cuerpo del método, para resolver variables **en su ámbito**.
   *
   * Sin esto, `estaNormalizado('auctions', …)` buscaba `const auctions =` en el fichero entero y
   * encontraba **la de otro método**: en BASE, la de `home()` (que usa `fetchJson`) en vez de la de
   * `auctionsList()` (que usa `toItems`). La guarda acusaba a código correcto por resolver un nombre
   * en el ámbito equivocado — que es la misma clase de error que persigue.
   */
  cuerpo: string;
}

export function devolucionesPorPlantilla(fuente: string): Map<string, Devolucion> {
  const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const porPlantilla = new Map<string, Devolucion>();

  // Cada `@Render("x")` abre un tramo que llega hasta el siguiente `@Render` o `@Get`.
  const tramos = sinComentarios.split(/(?=@Render\()/).slice(1);

  for (const tramo of tramos) {
    const render = tramo.match(/@Render\(\s*["'`]([^"'`]+)["'`]\s*\)/);
    if (!render) continue;
    const plantilla = render[1];

    // El primer `return {` del tramo, delimitado **contando llaves** y no con una expresión regular.
    //
    // La primera versión cerraba con `\n\s*\};`, y eso se dejaba fuera los `return { x };` de una sola
    // línea — que son la mitad de los de este repositorio. Los casos de control C1 y C4 lo dijeron antes
    // de que la guarda entrara en servicio: escritos para fallar, fallaron por el motivo equivocado.
    // El tramo YA está delimitado por el `split` de arriba: va de este `@Render` al siguiente. Volver a
    // cortarlo por `@Render(` lo dejaba en la cadena vacía, porque el tramo **empieza** por ahí.
    const interior = cuerpoDelReturn(tramo);
    if (interior === null) continue;

    const claves = new Map<string, string>();
    // `clave: expresión` a primer nivel de anidación. Las expresiones con objetos dentro se toman
    // enteras hasta la coma que cierra su nivel.
    let nivel = 0;
    let actual = '';
    for (const ch of interior) {
      if ('{(['.includes(ch)) nivel++;
      if ('})]'.includes(ch)) nivel--;
      if (ch === ',' && nivel === 0) {
        registrar(actual, claves);
        actual = '';
      } else actual += ch;
    }
    registrar(actual, claves);

    porPlantilla.set(plantilla, { claves, cuerpo: tramo });
  }

  return porPlantilla;
}

/**
 * El interior del primer `return { … }` de un cuerpo, delimitado contando llaves.
 *
 * Devuelve `null` si el tramo no tiene un `return` de objeto — un método que devuelva `{}` o nada no es
 * un fallo, es un método sin datos que juzgar.
 */
function cuerpoDelReturn(cuerpo: string): string | null {
  const inicio = cuerpo.search(/return\s*\{/);
  if (inicio === -1) return null;

  const abre = cuerpo.indexOf('{', inicio);
  let nivel = 0;
  for (let i = abre; i < cuerpo.length; i++) {
    if (cuerpo[i] === '{') nivel++;
    else if (cuerpo[i] === '}') {
      nivel--;
      if (nivel === 0) return cuerpo.slice(abre + 1, i);
    }
  }
  return null;
}

function registrar(fragmento: string, claves: Map<string, string>): void {
  const t = fragmento.trim();
  if (!t) return;
  const dosPuntos = t.indexOf(':');
  if (dosPuntos === -1) {
    // Forma abreviada: `{ profile }` — la clave es la propia variable.
    const nombre = t.replace(/[^\w]/g, '');
    if (nombre) claves.set(nombre, nombre);
    return;
  }
  const clave = t.slice(0, dosPuntos).trim().replace(/["']/g, '');
  const expr = t.slice(dosPuntos + 1).trim();
  if (/^\w+$/.test(clave)) claves.set(clave, expr);
}

/**
 * Resuelve una expresión hasta ver si toca el API.
 *
 * `notifications` se devuelve como `notifications` y **se asigna** con `await apiGet(...)`. Sin seguir la
 * asignación, la guarda no vería nada — que es justo cómo el defecto sobrevivió.
 *
 * Incluye la desestructuración de `Promise.all`, que es como el dashboard obtiene sus cuatro valores.
 */
export function vieneDelApi(expresion: string, fuente: string): boolean {
  if (ORIGEN_API.test(expresion)) return true;

  const nombre = expresion.match(/^[\w?.]+/)?.[0]?.split(/[?.]/)[0];
  if (!nombre) return false;

  // const X = await apiGet(...) / fetchJson(...)
  const asignacion = new RegExp(`(?:const|let|var)\\s+${nombre}\\s*=\\s*([^;]+);`, 's').exec(
    fuente,
  );
  if (asignacion && ORIGEN_API.test(asignacion[1])) return true;

  // const [a, b, X] = await Promise.all([ ... apiGet ... ])
  for (const m of fuente.matchAll(
    /(?:const|let|var)\s*\[([^\]]+)\]\s*=\s*await\s+Promise\.all\(([\s\S]*?)\]\);/g,
  )) {
    const nombres = m[1].split(',').map((n) => n.trim());
    if (nombres.includes(nombre) && ORIGEN_API.test(m[2])) return true;
  }

  return false;
}

/**
 * Si una expresión pasó por un normalizador, **siguiendo la asignación** cuando hace falta.
 *
 * `return { auctions }` en forma abreviada es idiomático y frecuente: la expresión es `auctions` y el
 * `toItems(` está una línea más arriba, en `const auctions = toItems(data)`. Sin seguirla, la guarda
 * acusaba a código correcto — y una guarda con falsos positivos acaba borrada, con todo lo que protegía
 * (PT-103). Es la misma resolución que ya hace `vieneDelApi`, en la otra dirección.
 */
export function estaNormalizado(expresion: string, fuente: string): boolean {
  if (NORMALIZADORES.some((n) => expresion.includes(n))) return true;

  const nombre = expresion.trim().match(/^\w+$/)?.[0];
  if (!nombre) return false;

  const asignacion = new RegExp(`(?:const|let|var)\\s+${nombre}\\s*=\\s*([^;]+);`, 's').exec(
    fuente,
  );

  return Boolean(asignacion && NORMALIZADORES.some((n) => asignacion[1].includes(n)));
}

function plantillasDe(dir: string): { nombre: string; contenido: string }[] {
  const out: { nombre: string; contenido: string }[] = [];
  const recorrer = (d: string, prefijo: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) recorrer(join(d, e.name), `${prefijo}${e.name}/`);
      else if (e.name.endsWith('.html'))
        out.push({
          nombre: `${prefijo}${e.name}`,
          contenido: readFileSync(join(d, e.name), 'utf8'),
        });
    }
  };
  recorrer(dir, '');
  return out;
}

function controladoresDe(dir: string): string {
  let fuente = '';
  const recorrer = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.controller.ts')) fuente += readFileSync(p, 'utf8') + '\n';
    }
  };
  recorrer(dir);
  return fuente;
}

describe('La FORMA de las listas SSR↔API — PT-213 (R-051)', () => {
  it.each(SITIOS.map((s) => [s.nombre, s] as const))(
    '%s: toda lista que viene del API pasa por toItems y se lee como X.items',
    (nombreSitio, sitio) => {
      const fuente = controladoresDe(sitio.ssr);
      const porPlantilla = devolucionesPorPlantilla(fuente);
      const plantillas = plantillasDe(sitio.vistas);

      // Sin estas dos, un renombrado de carpeta dejaría la guarda comparando el vacío: cero
      // plantillas, cero devoluciones, verde. Es como una guarda deja de proteger sin avisar.
      expect(plantillas.length).toBeGreaterThan(0);
      expect(porPlantilla.size).toBeGreaterThan(0);

      const fallos: string[] = [];
      let cruzadas = 0;

      for (const [plantilla, { claves, cuerpo }] of porPlantilla) {
        // El nombre YA viene con su carpeta desde `plantillasDe`, que recorre `views/` — y `views/`
        // contiene `pages/`. Anteponerle otro `pages/` producía `pages/pages/x.html`, que no casa con
        // nada: la guarda recorría las 27 plantillas, no cruzaba ninguna y **salía en verde**.
        //
        // Es el defecto que esta guarda existe para impedir, cometido por la guarda misma. Lo delató
        // leerla con desconfianza, no ejecutarla: por eso ahora hay una cuenta de cruces.
        const vista = plantillas.find((p) => p.nombre === plantilla);
        if (!vista) continue;
        cruzadas++;

        for (const uso of usosDeLista(vista.contenido)) {
          const expr = claves.get(uso.variable);
          if (expr === undefined) continue;
          if (!vieneDelApi(expr, cuerpo)) continue;

          if (uso.modo === 'crudo') {
            fallos.push(
              `${nombreSitio} ${plantilla}: «${uso.variable}» viene del API y la plantilla la recorre ` +
                `en crudo. Pasa por toItems() y lee ${uso.variable}.items.`,
            );
            continue;
          }

          if (!estaNormalizado(expr, cuerpo)) {
            fallos.push(
              `${nombreSitio} ${plantilla}: la plantilla lee «${uso.variable}.items» pero el ` +
                `controlador devuelve «${expr}» sin normalizar. El API no emite «items» en todas ` +
                `sus formas; toItems() sí.`,
            );
          }
        }
      }

      // **La comprobación que habría delatado el fallo de arriba.** Sin ella, una guarda que no cruza
      // ninguna plantilla con ningún controlador sale en verde y parece que protege.
      expect(cruzadas).toBeGreaterThan(5);

      expect(fallos).toEqual([]);
    },
  );

  describe('casos de control — la guarda tiene que fallar cuando toca', () => {
    it('C1: detecta `.items` sobre una devolución cruda del API', () => {
      const fuente = `
        @Get("/x")
        @Render("pages/x.html")
        async x(@Req() req: Request) {
          const cosas = await apiGet(getToken(req), "/api/v1/cosas");
          return { cosas };
        }
      `;
      const claves = devolucionesPorPlantilla(fuente).get('pages/x.html')?.claves;
      expect(claves?.get('cosas')).toBe('cosas');
      expect(vieneDelApi('cosas', fuente)).toBe(true);
      expect(NORMALIZADORES.some((n) => 'cosas'.includes(n))).toBe(false);
    });

    it('C2: detecta el recorrido en crudo de un objeto paginado', () => {
      expect(usosDeLista('{% for a in auctions %}{% endfor %}')).toEqual([
        { variable: 'auctions', modo: 'crudo' },
      ]);
      expect(usosDeLista('{% if auctions and auctions.length > 0 %}')).toEqual([
        { variable: 'auctions', modo: 'crudo' },
      ]);
    });

    it('C3: NO acusa a una lista construida en el propio controlador', () => {
      const fuente = `
        @Get("/d")
        @Render("pages/d.html")
        async d(@Req() req: Request) {
          const res = await apiGet(getToken(req), "/api/v1/payments/providers");
          const providers = (res?.providers ?? []).map((k) => ({ k }));
          return { providers };
        }
      `;
      // `providers` no se asigna desde apiGet: se construye. Su forma la decide quien la escribe.
      expect(vieneDelApi('providers', fuente)).toBe(false);
    });

    it('C4: `X.items` normalizado pasa', () => {
      const fuente = `
        @Get("/o")
        @Render("pages/o.html")
        async o(@Req() req: Request) {
          const orders = await apiGet(getToken(req), "/api/v1/orders");
          return { orders: toItems(orders) };
        }
      `;
      const expr = devolucionesPorPlantilla(fuente).get('pages/o.html')?.claves.get('orders');
      expect(expr).toContain('toItems(');
    });

    it('C6: reconoce la forma abreviada `return { x }` con el toItems una línea antes', () => {
      const fuente = `
        const auctions = toItems(data);
        return { auctions, total: auctions.total };
      `;
      expect(estaNormalizado('auctions', fuente)).toBe(true);
      // Y NO da por normalizado lo que no lo está, que es la otra mitad del caso de control.
      expect(estaNormalizado('otras', 'const otras = await apiGet(x);')).toBe(false);
    });

    it('C5: `items` gana sobre `crudo` cuando la plantilla usa las dos formas', () => {
      expect(usosDeLista('{% if o.items %}{% for x in o.items %}{% endfor %}{% endif %}')).toEqual([
        { variable: 'o', modo: 'items' },
      ]);
    });
  });
});
