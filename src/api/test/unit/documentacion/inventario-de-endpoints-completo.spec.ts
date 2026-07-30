import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';
import { rutasDeclaradas } from '../../../scripts/rutas-declaradas';

/**
 * PT-188 — **El inventario de endpoints no omite rutas ni documenta rutas que no existen.**
 *
 * ## Por qué las dos direcciones
 *
 * Medido el 2026-07-29, `inventory/endpoints.md` fallaba en ambas:
 *
 * - **73 de 159 rutas montadas no estaban documentadas** — todo el espacio de ADMIN, diagnóstico, KYC, el
 *   planificador y los `/users/me/*`.
 * - **6 rutas documentadas no existen**, y dos de ellas son `/users/settings` y `PATCH /users/settings`: **la
 *   ruta fantasma de H-020**. El código se corrigió; el documento que un agente lee para saber a dónde llamar
 *   siguió diciendo la ruta equivocada.
 *
 * Esa segunda mitad es la que importa. H-020 costó que la página «Configuración» no cargara para nadie, con un
 * error —«uuid inválido»— que mandaba a mirar el identificador. Un inventario con una ruta fantasma **es cómo
 * eso vuelve a pasar**: es la familia de H-016, un documento en el que se confía porque parece preciso.
 *
 * ## Lo que NO comprueba, y por qué
 *
 * **La columna de autorización no se verifica automáticamente.** Se intentó y se retiró: `@Public()` aparece
 * encima del verbo, debajo, y a nivel de clase; y `admin.controller.ts` declara `@UseGuards(AdminDualAuthGuard)`
 * **junto a** `@Public()`, que significa «no pases por el JWT global, pasa por el dual» — no «esto es público».
 * Cada heurística acertaba en unos ficheros y fallaba en otros, y una llegó a dar por **públicos los ochenta
 * endpoints de administración**.
 *
 * Un inventario que se lee para saber qué está protegido no puede apoyarse en eso, así que esa columna se cura a
 * mano mirando el guard de cada controlador —19 ficheros— y aquí se comprueba **lo que se puede medir sin
 * ambigüedad**. Prometer menos y cumplirlo es mejor que una guarda que a veces miente.
 */
const RAIZ = raizDelMonorepo();
const INVENTARIO = join(RAIZ, 'docs', 'enterprise-documentation', 'inventory', 'endpoints.md');
const MODULOS = join(RAIZ, 'src', 'api', 'src', 'modules');

/** `METODO /ruta` tal como el inventario los escribe en sus tablas. */
function documentadas(texto: string): Set<string> {
  const salida = new Set<string>();

  for (const m of texto.matchAll(/^\|\s*(GET|POST|PATCH|PUT|DELETE)\s*\|\s*`([^`]+)`/gm)) {
    salida.add(`${m[1]} ${m[2]}`);
  }

  return salida;
}

describe('El inventario de endpoints esta completo y no inventa rutas — PT-188', () => {
  const texto = readFileSync(INVENTARIO, 'utf-8');
  const enDoc = documentadas(texto);
  const enCodigo = rutasDeclaradas(MODULOS);
  const clavesCodigo = new Set(enCodigo.map((r) => `${r.metodo} ${r.ruta}`));

  it('C1: ninguna ruta montada falta en el inventario', () => {
    const ausentes = [...clavesCodigo].filter((k) => !enDoc.has(k)).sort();

    expect(ausentes).toEqual([]);
  });

  it('C2: ninguna ruta documentada deja de existir — la mitad de H-020', () => {
    // Las tablas de la cabecera («Límite de peticiones») citan rutas con su método; también tienen que existir,
    // porque una excepción de límite sobre una ruta fantasma es una excepción que no protege nada.
    const inexistentes = [...enDoc].filter((k) => !clavesCodigo.has(k)).sort();

    expect(inexistentes).toEqual([]);
  });

  it('C3: el recuento que el inventario anuncia es el real', () => {
    // Un número redondo en la cabecera se lee y se cree. Si alguien añade una ruta y actualiza la tabla pero no
    // el total, el documento queda diciendo una cifra falsa con toda la apariencia de estar medida.
    const anunciado = /\*\*(\d+) rutas\*\*/.exec(texto)?.[1];

    expect(anunciado).toBeDefined();
    expect(Number(anunciado)).toBe(enCodigo.length);
  });

  it('C4: las rutas que solo existen en desarrollo estan marcadas como tales', () => {
    // `diagnostics` y `scheduler` no existen en produccion. Documentarlas sin decirlo invita a construir sobre
    // ellas: el disparador de liquidacion de QA parece una via de operación y **no lo es**.
    const devOnly = enCodigo.filter((r) => r.soloDesarrollo);

    expect(devOnly.length).toBeGreaterThan(0);

    for (const r of devOnly) {
      const fila = texto
        .split('\n')
        .find((l) => l.includes(`\`${r.ruta}\``) && l.includes(`| ${r.metodo} `));

      expect(fila).toBeDefined();
      expect(fila).toMatch(/DevOnly|solo desarrollo|DevelopmentOnly/i);
    }
  });

  describe('casos de control', () => {
    it('AC-01: el extractor lee las rutas de un controlador con DOS `@Controller`', () => {
      // `bids.controller.ts` declara `auctions/:auctionId/bids` y `bids`. Es el caso que hizo fallar a la guarda
      // de los SSR en PT-148, y el extractor es ahora compartido: si se rompe, se rompen las dos.
      const bids = enCodigo.filter((r) => r.fichero.endsWith('bids.controller.ts'));

      expect(bids.some((r) => r.ruta.startsWith('/auctions/'))).toBe(true);
      expect(bids.some((r) => r.ruta === '/bids/my-active' || r.ruta.startsWith('/bids'))).toBe(
        true,
      );
    });

    it('AC-02: `documentadas` no confunde una fila de tabla con prosa que cite una ruta', () => {
      const falso = [
        'La ruta `POST /esto/no/es/una/fila` se menciona en prosa.',
        '| GET | `/si/es/una/fila` | JWT | — |',
      ].join('\n');

      expect([...documentadas(falso)]).toEqual(['GET /si/es/una/fila']);
    });

    it('AC-03: el inventario no esta vacio — una guarda sobre un fichero vacio pasa sin comprobar nada', () => {
      expect(enDoc.size).toBeGreaterThan(100);
      expect(clavesCodigo.size).toBeGreaterThan(100);
    });
  });
});
