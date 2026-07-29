import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-132 (PTSA H-020) — Toda ruta del API que el CLIENT invoca tiene que existir en el API.
 *
 * `app.controller.ts:88` pedia `/api/v1/users/settings`. Esa ruta **no existe**: `UsersController`
 * expone `me/settings`. La peticion caia en el comodin `@Get(':id')`, el `ParseUUIDPipe` rechazaba
 * la cadena `settings` como identificador, y devolvia **400 — uuid invalido**.
 *
 * La pagina «Configuracion» esta en el menu principal del portal privado. **No cargaba para
 * ningun usuario.**
 *
 * Lo que agrava el caso: un 404 habria dicho «esa ruta no existe». El 400 dice «el identificador
 * esta mal», y manda a quien lo investigue a mirar el identificador — que no es el problema. El
 * comodin convierte un error honesto en uno que enga�a.
 *
 * Nada vigilaba el contrato entre el SSR y el API. Esta guarda es ese mecanismo, y es estrecha a
 * proposito: compara **rutas literales**, no construidas dinamicamente. Un falso positivo haria
 * que alguien la borrara, y con ella lo que si protege (la leccion de PT-103).
 */
const RAIZ = raizDelMonorepo();
const MODULOS = join(RAIZ, 'src/api/src/modules');

/**
 * PT-148 — Los TRES sitios, no uno.
 *
 * Esta guarda nacio en PT-132 mirando solo el CLIENT, y asi se quedo. `PTSA/PENDIENTES.md` lo tenia
 * anotado desde S-002 como «ampliacion barata», y FPGE-003 lo saco primero de quince candidatos:
 * **maximo impacto evitado, coste minimo, y evidencia de que el defecto que previene ya ocurrio de
 * verdad**.
 *
 * Porque H-020 no fue teorico: la pagina «Configuracion» no cargaba para **ningun** usuario, y el
 * 400 del `ParseUUIDPipe` mandaba a quien lo investigara a mirar el identificador — que no era el
 * problema. Que eso no pueda repetirse en CLIENT pero si en BASE o en ADMIN es una guarda a medias.
 *
 * De cada sitio se miran **las dos mitades del contrato**: el SSR (que llama desde el servidor) y
 * el JavaScript de NAVEGADOR (que llama desde el cliente). La primera version de PT-132 solo miraba
 * el SSR y se habria dejado fuera media superficie — el deposito del portal llama a
 * `/api/v1/payments/initiate` desde el JS, no desde el controlador.
 */
interface Sitio {
  nombre: string;
  ssr: string;
  js: string;
}

const SITIOS: Sitio[] = [
  {
    nombre: 'CLIENT',
    ssr: join(RAIZ, 'src/apps/client/src'),
    js: join(RAIZ, 'src/apps/client/public/js'),
  },
  {
    nombre: 'BASE',
    ssr: join(RAIZ, 'src/apps/base/src'),
    js: join(RAIZ, 'src/apps/base/public/js'),
  },
  {
    nombre: 'ADMIN',
    ssr: join(RAIZ, 'src/admin/src'),
    js: join(RAIZ, 'src/admin/public/js'),
  },
];

/**
 * Las rutas del API que un fichero del SSR invoca, con los parametros normalizados.
 *
 * **Los comentarios se descartan.** Sin esto, el comentario que explica *cual era la ruta rota*
 * hace fallar la guarda que comprueba que ya no se usa. Paso de verdad al corregir H-020 — y le
 * paso lo mismo a la guarda del job de CI en PT-128. Es el patron: una guarda que lee prosa se
 * acusa a si misma.
 */
export function rutasInvocadas(fuente: string): string[] {
  const sinComentarios = fuente.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  // PT-148 — Las constantes de base se resuelven antes de mirar.
  //
  // ADMIN escribe `const API = '/api/v1/admin'` y luego `fetch(\`${API}/reconciliation?…\`)`. Sin
  // esto pasaban las DOS cosas malas a la vez: la guarda acusaba `/api/v1/admin` —que es un prefijo,
  // no una ruta— y **no veia ninguna de las llamadas reales**, porque empiezan por `${`.
  //
  // Resolverlas no es silenciar un falso positivo: es lo que hace que ADMIN quede de verdad
  // cubierto. Un falso positivo silenciado deja el fichero sin vigilar; resolverlo lo vigila.
  const bases = new Map<string, string>();
  for (const m of sinComentarios.matchAll(
    /(?:const|let|var)\s+(\w+)\s*=\s*["'`](\/api\/v1[^"'`]*)["'`]/g,
  )) {
    bases.set(m[1], m[2]);
  }

  let resuelto = sinComentarios;
  for (const [nombre, valor] of bases) {
    resuelto = resuelto.split('${' + nombre + '}').join(valor);
  }

  // La declaracion de la base en si misma no es una invocacion. Se retira despues de sustituir.
  for (const nombre of bases.keys()) {
    resuelto = resuelto.replace(
      new RegExp(`(?:const|let|var)\\s+${nombre}\\s*=\\s*["'\`]/api/v1[^"'\`]*["'\`]`, 'g'),
      '',
    );
  }

  return [
    ...new Set(
      [...resuelto.matchAll(/["'`](\/api\/v1\/[^"'`]+)["'`]/g)]
        .map((m) => m[1])
        .map((r) => r.replace(/\$\{[^}]*\}/g, ':param'))
        .map((r) => r.split('?')[0])
        // Un literal que termina en `/` es un PREFIJO que el codigo concatena:
        //     fetch('/api/v1/payments/status/' + encodeURIComponent(ref))
        // Tratarlo como ruta completa daria un falso positivo — y una guarda con falsos positivos
        // acaba borrada, con todo lo que protegia (la leccion de PT-103).
        .map((r) => (r.endsWith('/') ? r + ':param' : r)),
    ),
  ];
}

/** Los segmentos de ruta que declara un controlador: `@Controller('x')` + cada `@Get('y')`. */
function rutasDeclaradas(dir: string): Set<string> {
  const rutas = new Set<string>();

  const recorrer = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.controller.ts')) {
        const src = readFileSync(p, 'utf8');

        // PT-148 — Un fichero puede declarar MAS DE UN `@Controller`, y hay uno que lo hace:
        // `bids.controller.ts` declara `auctions/:auctionId/bids` y `bids`. Con `src.match()` solo
        // se leia el primero, asi que `@Get('my-active')` quedaba registrado como
        // `/auctions/:auctionId/bids/my-active` — y la guarda acusaba al CLIENT de invocar una ruta
        // inexistente **que si existe**.
        //
        // Casi «corrijo» codigo sano por creerle a la guarda. Se trocea por `@Controller` y cada
        // verbo se asocia a la base que le precede.
        const trozos = src.split(/(?=@Controller\()/);
        for (const trozo of trozos) {
          const base = trozo.match(/@Controller\(\s*['"]([^'"]*)['"]/)?.[1] ?? '';
          if (!/@Controller\(/.test(trozo)) continue;
          for (const m of trozo.matchAll(
            /@(?:Get|Post|Patch|Put|Delete)\(\s*(?:['"]([^'"]*)['"])?/g,
          )) {
            const sub = m[1] ?? '';
            const completa = [base, sub].filter(Boolean).join('/');
            rutas.add('/' + completa.replace(/^\/+/, ''));
          }
        }
      }
    }
  };

  recorrer(dir);
  return rutas;
}

/**
 * ¿La ruta pedida casa con alguna declarada?
 *
 * **Una ruta pedida SIN parámetros exige un destino literal.** Es la regla que hace útil esta
 * guarda, y viene directamente de H-020: `/users/settings` «casaba» con `@Get(':id')`, y por eso
 * el defecto era invisible — a nivel de enrutado hay coincidencia, pero el `ParseUUIDPipe` de ese
 * comodín rechaza la cadena y devuelve 400.
 *
 * Si el CLIENT pide una ruta toda literal y lo único que la acepta es un comodín, **eso es el
 * defecto**, no una coincidencia. Un comodín solo vale para satisfacer un `:param` del llamante.
 */
export function existe(pedida: string, declaradas: Set<string>): boolean {
  const partes = pedida
    .replace(/^\/api\/v1/, '')
    .split('/')
    .filter(Boolean);

  for (const d of declaradas) {
    const dp = d.split('/').filter(Boolean);
    if (dp.length !== partes.length) continue;

    const casan = dp.every((seg, i) => {
      if (seg === partes[i]) return true;
      // El comodín del controlador solo cubre un parámetro del llamante, nunca un literal.
      return seg.startsWith(':') && partes[i].startsWith(':');
    });

    if (casan) return true;
  }
  return false;
}

/** Todos los ficheros de un sitio que pueden invocar el API: el SSR en `.ts` y el navegador en `.js`. */
export function ficherosDelSitio(sitio: Sitio): { nombre: string; ruta: string }[] {
  const ficheros: { nombre: string; ruta: string }[] = [];

  const recorrer = (d: string, ext: string): void => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) recorrer(p, ext);
      else if (e.name.endsWith(ext)) ficheros.push({ nombre: e.name, ruta: p });
    }
  };

  recorrer(sitio.ssr, '.ts');
  recorrer(sitio.js, '.js');
  return ficheros;
}

describe('Toda ruta del API que un SSR invoca existe — PT-132, ampliada en PT-148', () => {
  const declaradas = rutasDeclaradas(MODULOS);

  it('se han leido rutas del API — si no, la guarda no compara nada', () => {
    expect(declaradas.size).toBeGreaterThan(50);
  });

  it.each(SITIOS.map((s) => [s.nombre, s] as const))(
    '%s no invoca ninguna ruta inexistente',
    (nombreSitio, sitio) => {
      const ficheros = ficherosDelSitio(sitio);

      // Sin esto, un sitio cuya ruta cambiara de sitio pasaria en VACIO: cero ficheros leidos, cero
      // rutas rotas, verde. Es la forma en que una guarda deja de proteger sin que nadie lo note.
      expect(ficheros.length).toBeGreaterThan(0);

      const rotas: string[] = [];
      for (const { nombre, ruta } of ficheros) {
        for (const pedida of rutasInvocadas(readFileSync(ruta, 'utf8'))) {
          if (!existe(pedida, declaradas)) rotas.push(`${nombreSitio}/${nombre}: ${pedida}`);
        }
      }

      expect(rotas).toEqual([]);
    },
  );

  describe('casos de control', () => {
    it('C1: detecta una ruta que no existe', () => {
      expect(existe('/api/v1/users/settings', new Set(['/users/me/settings']))).toBe(false);
    });

    it('C2: acepta la ruta correcta', () => {
      expect(existe('/api/v1/users/me/settings', new Set(['/users/me/settings']))).toBe(true);
    });

    it('C3: un parametro casa con el comodin del controlador', () => {
      expect(existe('/api/v1/auctions/:param', new Set(['/auctions/:id']))).toBe(true);
    });

    it('C4: no casa una ruta con distinto numero de segmentos', () => {
      expect(existe('/api/v1/users/me/settings/extra', new Set(['/users/me/settings']))).toBe(
        false,
      );
    });

    it('C5b: un comentario que cita una ruta vieja no cuenta como invocacion', () => {
      const fuente = [
        '// Era `/api/v1/users/settings`, que ya no existe.',
        '/* tampoco cuenta "/api/v1/loquesea" en bloque */',
        'apiGet(t, "/api/v1/users/me/settings");',
      ].join('\n');

      expect(rutasInvocadas(fuente)).toEqual(['/api/v1/users/me/settings']);
    });

    it('C5c: un literal que acaba en `/` es un prefijo, no una ruta', () => {
      const fuente = "fetch('/api/v1/payments/status/' + encodeURIComponent(ref))";

      expect(rutasInvocadas(fuente)).toEqual(['/api/v1/payments/status/:param']);
    });

    it('C6: una constante de base se resuelve, y su declaracion no cuenta como ruta', () => {
      // El caso de ADMIN. Antes producia lo peor de los dos mundos: acusaba el prefijo y no veia
      // ninguna de las llamadas reales.
      const fuente = [
        "const API = '/api/v1/admin';",
        'fetch(`${API}/reconciliation?provider=${p}`);',
        'a.href = `${API}/reconciliation/export`;',
      ].join('\n');

      expect(rutasInvocadas(fuente).sort()).toEqual([
        '/api/v1/admin/reconciliation',
        '/api/v1/admin/reconciliation/export',
      ]);
    });

    it('C7: un fichero con DOS @Controller registra las rutas de los dos', () => {
      // `bids.controller.ts`. Con el analizador viejo, `my-active` quedaba bajo la base del primer
      // controlador y la guarda acusaba al CLIENT de invocar algo que si existe.
      const anidada = existe(
        '/api/v1/auctions/:param/bids',
        new Set(['/auctions/:auctionId/bids']),
      );
      const propia = existe('/api/v1/bids/my-active', new Set(['/bids/my-active']));

      expect([anidada, propia]).toEqual([true, true]);
    });

    it('C5: extrae las rutas de un fuente y normaliza los parametros', () => {
      const fuente = 'await apiGet(t, `/api/v1/auctions/${id}`); apiGet(t, "/api/v1/users/me");';

      expect(rutasInvocadas(fuente).sort()).toEqual([
        '/api/v1/auctions/:param',
        '/api/v1/users/me',
      ]);
    });
  });
});
