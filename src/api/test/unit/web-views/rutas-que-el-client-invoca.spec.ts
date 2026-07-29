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
const CLIENT = join(RAIZ, 'src/apps/client/src');
// El JavaScript de NAVEGADOR invoca el API directamente, y ahi vive la otra mitad del contrato:
// el deposito del portal llama a `/api/v1/payments/initiate` desde aqui, no desde el SSR. La
// primera version de esta guarda solo miraba el SSR y se habria dejado fuera media superficie.
const CLIENT_JS = join(RAIZ, 'src/apps/client/public/js');
const MODULOS = join(RAIZ, 'src/api/src/modules');

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

  return [
    ...new Set(
      [...sinComentarios.matchAll(/["'`](\/api\/v1\/[^"'`]+)["'`]/g)]
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
        const base = src.match(/@Controller\(\s*['"]([^'"]*)['"]/)?.[1] ?? '';
        for (const m of src.matchAll(/@(?:Get|Post|Patch|Put|Delete)\(\s*(?:['"]([^'"]*)['"])?/g)) {
          const sub = m[1] ?? '';
          const completa = [base, sub].filter(Boolean).join('/');
          rutas.add('/' + completa.replace(/^\/+/, ''));
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

describe('Toda ruta del API que el CLIENT invoca existe (PT-132)', () => {
  const declaradas = rutasDeclaradas(MODULOS);

  it('se han leido rutas del API — si no, la guarda no compara nada', () => {
    expect(declaradas.size).toBeGreaterThan(50);
  });

  it('el CLIENT no invoca ninguna ruta inexistente', () => {
    const rotas: string[] = [];

    const ficheros: { nombre: string; ruta: string }[] = [];

    for (const f of readdirSync(CLIENT).filter((n) => n.endsWith('.ts'))) {
      ficheros.push({ nombre: f, ruta: join(CLIENT, f) });
    }

    const recorrerJs = (d: string): void => {
      if (!existsSync(d)) return;
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) recorrerJs(join(d, e.name));
        else if (e.name.endsWith('.js')) ficheros.push({ nombre: e.name, ruta: join(d, e.name) });
      }
    };
    recorrerJs(CLIENT_JS);

    for (const { nombre, ruta } of ficheros) {
      for (const pedida of rutasInvocadas(readFileSync(ruta, 'utf8'))) {
        if (!existe(pedida, declaradas)) rotas.push(`${nombre}: ${pedida}`);
      }
    }

    expect(rotas).toEqual([]);
  });

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

    it('C5: extrae las rutas de un fuente y normaliza los parametros', () => {
      const fuente = 'await apiGet(t, `/api/v1/auctions/${id}`); apiGet(t, "/api/v1/users/me");';

      expect(rutasInvocadas(fuente).sort()).toEqual([
        '/api/v1/auctions/:param',
        '/api/v1/users/me',
      ]);
    });
  });
});
