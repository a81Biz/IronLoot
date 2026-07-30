import { readFileSync, readdirSync, statSync } from 'fs';
import { join, sep } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-185 (H-035) — **Ninguna variable de conexión se lee con reserva.**
 *
 * Esta es la mitad de **RULE-17** que la regla llama, en negrita, su afirmación central:
 *
 * > *The fallback was the problem, not the variable.*
 *
 * Y era la mitad **sin vigilar**. `variables-de-entorno-declaradas.spec.ts` comprueba que toda variable que el
 * código lee esté declarada en un `.env.example` — bien, y funciona. Pero nadie comprobaba que no tuviera
 * reserva, que es lo que causó el incidente del que nació la regla: cinco contenedores caídos porque lo que
 * hacía funcionar el sistema era un `REDIS_HOST=redis` dentro de un fichero que no está en git.
 *
 * Por eso `distributed-lock.service.ts` conservó su `process.env.REDIS_URL || 'redis://localhost:6379'` a través
 * de PT-137, de PT-147 y de todas las corridas de la suite: **había una guarda con el nombre correcto mirando
 * otra cosa.** Es la familia de H-031, donde la guarda del holdback miraba el servicio y el agujero estaba en el
 * compose.
 *
 * **Se vigilan las tres formas de escribir una reserva** —`||`, `??` y el segundo argumento de `config.get`—
 * porque vigilar sólo una enseña a usar las otras.
 *
 * ## PT-186 — y se vigilan los CUATRO servicios, no sólo el API
 *
 * La primera versión miraba `src/api/src` y nada más. Al cerrar H-035 se **declaró** que ADMIN, BASE y CLIENT
 * quedaban fuera «como pendiente»… sin medirlos. Medidos: ADMIN **0**, y **BASE y CLIENT 2 cada uno** —
 * `API_URL`, `CLIENT_URL`, `BASE_URL`, todas con reserva a `localhost`, y una de ellas en **el proxy del BFF**.
 *
 * Así que el hallazgo estaba cerrado afirmando algo que cubría la mitad. La lección es de método y es la misma
 * que este repositorio ya tiene escrita: **declarar un alcance no es medirlo**. Si una guarda deja fuera tres
 * servicios, lo que hay que hacer es mirarlos, no anotarlos.
 */
const RAIZ = raizDelMonorepo();

/**
 * Los cuatro servicios. Se recorren **todos** en una sola guarda en vez de copiarla tres veces: un mecanismo,
 * una lista. Es la lección de RULE-32 — lo que se duplica se desincroniza.
 */
export const SERVICIOS: Array<{ nombre: string; dir: string }> = [
  { nombre: 'API', dir: join(RAIZ, 'src', 'api', 'src') },
  { nombre: 'ADMIN', dir: join(RAIZ, 'src', 'admin', 'src') },
  { nombre: 'BASE', dir: join(RAIZ, 'src', 'apps', 'base', 'src') },
  { nombre: 'CLIENT', dir: join(RAIZ, 'src', 'apps', 'client', 'src') },
];

/**
 * Variables cuyo valor **es una conexión**: si están mal, el proceso habla con quien no debe o con nadie. No
 * incluye ajustes de negocio ni banderas — para esas, un valor por defecto puede ser legítimo (aunque tiene su
 * propia regla: el corolario de RULE-17, que exige que sea el valor **protegido**).
 *
 * `API_URL`, `BASE_URL` y `CLIENT_URL` entran por PT-186: en un SSR, **a dónde llamar es una conexión**. Con
 * reserva a `localhost`, un despliegue que las olvide manda las peticiones a su propio contenedor, donde no
 * escucha nadie — y en el caso de `API_URL` eso es el proxy del BFF, o sea el sitio entero.
 */
export const VARIABLES_DE_CONEXION = [
  'DATABASE_URL',
  'REDIS_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'MAIL_HOST',
  'MAIL_PORT',
  'API_URL',
  'BASE_URL',
  'CLIENT_URL',
];

/** Ficheros `.ts` de un servicio, sin pruebas. */
function fuentes(dir: string): string[] {
  const salida: string[] = [];

  for (const entrada of readdirSync(dir)) {
    const p = join(dir, entrada);
    if (statSync(p).isDirectory()) salida.push(...fuentes(p));
    else if (entrada.endsWith('.ts') && !entrada.endsWith('.spec.ts')) salida.push(p);
  }

  return salida;
}

/**
 * Busca reservas en las tres formas. Devuelve `fichero:linea — fragmento`.
 *
 * El texto se limpia de comentarios antes de mirar: si no, esta guarda se acusaría a sí misma leyendo los
 * ejemplos que las convenciones y los propios ficheros escriben para explicar el defecto. Le pasó a la guarda de
 * RULE-17 la primera vez que corrió, y está anotado en la propia regla.
 */
export function reservasDeConexion(fuente: string, variables = VARIABLES_DE_CONEXION): string[] {
  const sinComentarios = fuente
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

  const hallados: string[] = [];

  for (const v of variables) {
    const patrones = [
      // process.env.X || '...'   ·   process.env.X ?? '...'
      new RegExp(`process\\.env\\.${v}\\s*(\\|\\||\\?\\?)\\s*['"\`]`, 'g'),
      new RegExp(`process\\.env\\[['"\`]${v}['"\`]\\]\\s*(\\|\\||\\?\\?)\\s*['"\`]`, 'g'),
      // config.get('X', 'default')  — el segundo argumento ES la reserva
      new RegExp(`get(<[^>]*>)?\\(\\s*['"\`]${v}['"\`]\\s*,\\s*['"\`]`, 'g'),
    ];

    for (const patron of patrones) {
      for (const m of sinComentarios.matchAll(patron)) {
        const linea = sinComentarios.slice(0, m.index).split('\n').length;
        hallados.push(`${v} (linea ${linea})`);
      }
    }
  }

  return hallados;
}

describe('Ninguna variable de conexion se lee con reserva — RULE-17, la otra mitad (PT-185/PT-186)', () => {
  /** Acusaciones de un servicio, con la ruta recortada desde `src/` para que se lea. */
  function acusacionesDe(dir: string): string[] {
    const acusados: string[] = [];

    for (const f of fuentes(dir)) {
      const reservas = reservasDeConexion(readFileSync(f, 'utf-8'));
      if (reservas.length) {
        acusados.push(`${f.slice(f.indexOf('src' + sep))}: ${reservas.join(', ')}`);
      }
    }

    return acusados;
  }

  // Un caso por servicio, y no un bucle con una sola aserción: así el nombre del caso que falla **dice cuál**.
  // Con un `expect` acumulado, el mensaje mezcla los cuatro y hay que leerlo dos veces.
  for (const { nombre, dir } of SERVICIOS) {
    it(`C1-${nombre}: ningun fichero da un valor por defecto a una conexion`, () => {
      expect(acusacionesDe(dir)).toEqual([]);
    });
  }

  it('C1-cobertura: la guarda mira los CUATRO servicios, no solo el API', () => {
    // PT-186. H-035 se cerro declarando que ADMIN, BASE y CLIENT quedaban fuera «como pendiente», sin medirlos —
    // y BASE y CLIENT tenian dos reservas cada uno. Este caso existe para que la lista no se estreche otra vez:
    // si alguien quita un servicio, falla aqui y no en silencio.
    expect(SERVICIOS.map((s) => s.nombre).sort()).toEqual(['ADMIN', 'API', 'BASE', 'CLIENT']);

    for (const { dir } of SERVICIOS) {
      expect(fuentes(dir).length).toBeGreaterThan(0);
    }
  });

  describe('casos de control', () => {
    it('C2: `||` se detecta', () => {
      expect(
        reservasDeConexion("const u = process.env.REDIS_URL || 'redis://localhost:6379';"),
      ).toHaveLength(1);
    });

    it('C3: `??` tambien — vigilar solo `||` ensena a usar el otro', () => {
      expect(
        reservasDeConexion("const u = process.env.DATABASE_URL ?? 'postgres://x';"),
      ).toHaveLength(1);
    });

    it('C4: el segundo argumento de `config.get` tambien es una reserva', () => {
      // Es la forma que produjo F-135-A: `config.get('REDIS_HOST', 'localhost')`.
      expect(
        reservasDeConexion("this.h = config.get<string>('REDIS_HOST', 'localhost');"),
      ).toHaveLength(1);
    });

    it('C5: leer la variable SIN reserva no se acusa', () => {
      expect(
        reservasDeConexion("const u = redisUrlObligatoria(config.get<string>('REDIS_URL'));"),
      ).toEqual([]);
    });

    it('C6: una reserva en un COMENTARIO no cuenta — la guarda no se acusa a si misma', () => {
      // Sin esto, esta prueba se delataria leyendo la explicacion del defecto que ella misma vigila. Le paso a
      // la guarda de RULE-17 la primera vez que corrio, y esta anotado en la propia regla.
      const texto = [
        "// Antes: process.env.REDIS_URL || 'redis://localhost:6379'",
        '/* config.get("REDIS_HOST", "localhost") era el defecto */',
        "const u = redisUrlObligatoria(config.get<string>('REDIS_URL'));",
      ].join('\n');

      expect(reservasDeConexion(texto)).toEqual([]);
    });

    it('C7: una variable que NO es de conexion no se acusa', () => {
      // `SETTLEMENT_HOLDBACK_HOURS` tiene reserva a proposito, y tiene que ser la **protegida** (corolario de
      // RULE-17, H-031). Esa es otra regla y otra guarda: aqui no se toca.
      expect(
        reservasDeConexion('const h = Number(process.env.SETTLEMENT_HOLDBACK_HOURS ?? 72);'),
      ).toEqual([]);
    });
  });
});
