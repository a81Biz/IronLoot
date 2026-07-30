/**
 * PT-188 — Las rutas que los controladores del API declaran, leídas del código.
 *
 * ## Por qué vive aquí y no dentro de una guarda
 *
 * Este troceo estaba dentro de `rutas-que-los-ssr-invocan.spec.ts`, y ahora lo necesitan **dos** guardas: ésa y
 * la del inventario de endpoints. Dos copias del mismo criterio acaban discrepando —lección que este repositorio
 * se llevó cuatro veces en una sola jornada—, así que hay una.
 *
 * ## Lo que este troceo aprendió a golpes (PT-148)
 *
 * **Un fichero puede declarar más de un `@Controller`**, y hay uno que lo hace: `bids.controller.ts` declara
 * `auctions/:auctionId/bids` y `bids`. Con un `src.match()` sólo se leía el primero, así que `@Get('my-active')`
 * quedaba registrado como `/auctions/:auctionId/bids/my-active` y la guarda acusaba al CLIENT de invocar una ruta
 * inexistente **que sí existe**. Se trocea por `@Controller` y cada verbo se asocia a la base que le precede.
 *
 * ## Lo que este fichero deliberadamente NO hace: deducir el nivel de autorización
 *
 * Lo intenté y lo retiré. `@Public()` aparece en tres sitios distintos según el controlador —encima del verbo,
 * **debajo** del verbo, y a nivel de **clase** (`AdminAuthController`)—, porque a NestJS le da igual el orden. Cada
 * versión de la heurística acertaba en unos y fallaba en otros: una dio `JWT` a `POST /auth/register` teniendo
 * `@Public()`, y la siguiente dio `Public` a los ochenta endpoints de ADMIN, que van por `AdminDualAuthGuard`.
 *
 * **Un inventario que se lee para saber qué está protegido no puede apoyarse en eso.** La columna de
 * autorización se mantiene a mano, mirando el guard de cada controlador —son 24 ficheros, no 159 rutas—, y lo que
 * se automatiza es la parte que se puede medir sin ambigüedad: **qué rutas existen**. Es lo que impide que vuelva
 * H-020, y es todo lo que se promete aquí.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export type RutaDeclarada = {
  metodo: string;
  /** Ruta con su prefijo de controlador, empezando por `/`. Sin el `/api/v1`. */
  ruta: string;
  /** `true` si el CONTROLADOR está detrás de `DevelopmentOnlyGuard` — eso sí es inequívoco a nivel de clase. */
  soloDesarrollo: boolean;
  fichero: string;
};

const VERBOS = /@(Get|Post|Patch|Put|Delete)\(\s*(?:['"]([^'"]*)['"])?/g;

/** Recorre `dir` y devuelve todas las rutas declaradas por ficheros `*.controller.ts`. */
export function rutasDeclaradas(dir: string): RutaDeclarada[] {
  const salida: RutaDeclarada[] = [];

  const recorrer = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (e.name.endsWith('.controller.ts')) salida.push(...deUnFichero(p));
    }
  };

  recorrer(dir);
  return salida;
}

function deUnFichero(p: string): RutaDeclarada[] {
  const src = readFileSync(p, 'utf8');
  const salida: RutaDeclarada[] = [];

  // `DevelopmentOnlyGuard` se comprueba **en todo el fichero**: si aparece, ese controlador no existe en
  // producción. Es una comprobación de presencia, no de posición — por eso sí es fiable.
  const soloDesarrollo = /DevelopmentOnlyGuard/.test(src);

  for (const trozo of src.split(/(?=@Controller\()/)) {
    if (!/@Controller\(/.test(trozo)) continue;

    const base = trozo.match(/@Controller\(\s*['"]([^'"]*)['"]/)?.[1] ?? '';

    for (const m of trozo.matchAll(VERBOS)) {
      const sub = m[2] ?? '';
      salida.push({
        metodo: m[1].toUpperCase(),
        ruta: '/' + [base, sub].filter(Boolean).join('/').replace(/^\/+/, ''),
        soloDesarrollo,
        fichero: p.replace(/\\/g, '/'),
      });
    }
  }

  return salida;
}

/**
 * ¿La ruta pedida casa con alguna declarada?
 *
 * **Una ruta pedida SIN parámetros exige un destino literal.** Es la regla que hace útil esta comparación, y
 * viene de H-020: `/users/settings` «casaba» con `@Get(':id')` y por eso el defecto era invisible — a nivel de
 * enrutado hay coincidencia, pero el `ParseUUIDPipe` de ese comodín rechaza la cadena y devuelve 400.
 */
export function casa(pedida: string, declaradas: Iterable<string>): boolean {
  const partes = pedida
    .replace(/^\/api\/v1/, '')
    .replace(/^\/api/, '')
    .split('/')
    .filter(Boolean);

  for (const d of declaradas) {
    const dp = d.split('/').filter(Boolean);
    if (dp.length !== partes.length) continue;

    let ok = true;
    for (let i = 0; i < dp.length; i++) {
      const esComodin = dp[i].startsWith(':');
      const pideParam = partes[i].startsWith(':');

      if (esComodin) {
        // Un comodín sólo vale para satisfacer un `:param` del llamante. Si la petición es literal y lo único
        // que la acepta es un comodín, **eso es el defecto** — H-020.
        if (!pideParam) {
          ok = false;
          break;
        }
      } else if (dp[i] !== partes[i]) {
        ok = false;
        break;
      }
    }

    if (ok) return true;
  }

  return false;
}
