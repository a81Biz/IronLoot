import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-192 (AUD-026) — **Quien verifica un token exige su secreto al arrancar, no al primer intento.**
 *
 * ## Lo que había
 *
 * `ClientAuthGuard` verificaba las sesiones con:
 *
 * ```ts
 * const JWT_SECRET = process.env.JWT_SECRET || "";
 * ```
 *
 * El comentario de al lado —de `PT-040`, que cerró la primera mitad de este hallazgo— decía *«no weak
 * fallback secret… the guard fails closed»*. Y es cierto que falla cerrado. **Falla cerrado en la
 * petición, no en el arranque**, y esa diferencia es el hallazgo entero:
 *
 * - Sin `JWT_SECRET`, el CLIENT arranca **`healthy`**.
 * - El usuario inicia sesión en BASE, obtiene una cookie válida…
 * - …y el portal privado lo **rebota al login, siempre**, sin un error en ningún log.
 *
 * Es exactamente el modo de fallo de **H-035**: *arranca sano y no funciona*. Y aquí es peor que con una
 * variable de conexión, porque el síntoma —«inicio sesión y me devuelve al login»— manda a mirar la
 * cookie, el dominio, el `SameSite`… a cualquier sitio menos a una variable que nadie declaró.
 *
 * ## La asimetría que lo delata
 *
 * En **el mismo fichero, una línea antes**, `BASE_URL` usa `variableObligatoria()` (PT-186). El API va
 * más lejos: `jwtSecret()` **aborta el arranque** y además exige **32 caracteres**, porque un secreto
 * corto firma igual de bien. El CLIENT es el **único otro servicio que verifica tokens** y era el único
 * que no comprobaba nada.
 *
 * Y hay un segundo modo, peor de diagnosticar: si el `JWT_SECRET` del CLIENT **difiere** del del API
 * —una errata, o ponerlo sólo en un `.env`—, el CLIENT rechaza tokens perfectamente válidos. Mismo
 * síntoma, causa invisible.
 *
 * ## Por qué no basta con `conexiones-sin-reserva.spec.ts`
 *
 * Aquella guarda (PT-185/PT-186) cubre **variables de conexión** — a dónde llamar. `JWT_SECRET` no lo
 * es: es con qué comprobar quién eres. Quedaba fuera de su alcance por definición, y por eso hace falta
 * ésta. → corolario de **RULE-17**.
 */
const RAIZ = raizDelMonorepo();

/** Todo sitio que **verifica** un token y por tanto necesita el secreto. */
const VERIFICADORES = [
  {
    servicio: 'API',
    fichero: 'src/api/src/common/config/jwt-secret.ts',
    // El API lo resuelve por `ConfigService`, no por `process.env`.
    exigeAlArrancar: /throw new Error\(/,
  },
  {
    servicio: 'CLIENT',
    fichero: 'src/apps/client/src/common/guards/client-auth.guard.ts',
    exigeAlArrancar: /variableObligatoria\(\s*["']JWT_SECRET["']/,
  },
];

const leer = (p: string) => readFileSync(join(RAIZ, p), 'utf-8');

describe('El secreto de sesion es obligatorio donde se verifica — AUD-026 (PT-192)', () => {
  for (const { servicio, fichero, exigeAlArrancar } of VERIFICADORES) {
    it(`C1 · ${servicio}: exige \`JWT_SECRET\` al arrancar, no al primer token`, () => {
      expect(existsSync(join(RAIZ, fichero))).toBe(true);
      expect(leer(fichero)).toMatch(exigeAlArrancar);
    });
  }

  it('C2: nadie lee `JWT_SECRET` con reserva', () => {
    // `|| ""` y `?? ""` son la forma exacta que convertía «mal configurado» en «configurado hacia
    // ninguna parte». Se busca en los cuatro servicios, no sólo en los dos que verifican hoy: lo que
    // hay que impedir es que aparezca un tercero.
    const acusaciones: string[] = [];

    for (const raiz of [
      'src/api/src',
      'src/admin/src',
      'src/apps/base/src',
      'src/apps/client/src',
    ]) {
      const recorrer = (dir: string) => {
        for (const e of readdirSync(dir)) {
          if (e === 'node_modules' || e === 'dist') continue;
          const p = join(dir, e);
          if (statSync(p).isDirectory()) recorrer(p);
          else if (e.endsWith('.ts') && !e.endsWith('.spec.ts')) {
            // **Sin comentarios.** Se mide lo que se ejecuta, no lo que se explica: el comentario que
            // documenta este mismo defecto tiene que citar la forma que había, y acusaba al fichero
            // corregido. Es la tercera guarda de esta jornada que se acusa a sí misma leyendo su
            // propia explicación — el patrón ya tiene nombre: **una guarda que nombra lo que vigila
            // forma parte del corpus que vigila.**
            const src = readFileSync(p, 'utf-8')
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .split('\n')
              .map((l) => l.replace(/\/\/.*$/, ''))
              .join('\n');
            if (/process\.env\.JWT_SECRET\s*(?:\|\||\?\?)/.test(src)) {
              acusaciones.push(p.replace(RAIZ, '').replace(/\\/g, '/'));
            }
          }
        }
      };
      recorrer(join(RAIZ, raiz));
    }

    expect(acusaciones).toEqual([]);
  });

  it('C3: la longitud minima se exige donde se verifica, no solo en produccion', () => {
    // Un secreto de 4 caracteres firma igual de bien. El API ya lo rechazaba (PT-126); el CLIENT no
    // comprobaba nada.
    expect(leer('src/api/src/common/config/jwt-secret.ts')).toMatch(/LONGITUD_MINIMA/);
    expect(leer('src/apps/client/src/common/guards/client-auth.guard.ts')).toMatch(
      /LONGITUD_MINIMA|32/,
    );
  });

  describe('casos de control', () => {
    it('AC-01: `variableObligatoria` sigue abortando de verdad, y nombrando la variable', () => {
      // Si algún día devolviera `""` en vez de lanzar, C1 seguiría verde y la protección no existiría.
      const src = leer('src/apps/client/src/common/config/variable-obligatoria.ts');

      expect(src).toMatch(/throw new Error\(/);
      expect(src).toMatch(/\$\{nombre\}|nombre/);
    });

    it('AC-02: la deteccion de reserva reconoce la forma que habia', () => {
      const forma = 'const JWT_SECRET = process.env.JWT_SECRET || "";';

      expect(/process\.env\.JWT_SECRET\s*(?:\|\||\?\?)/.test(forma)).toBe(true);
    });

    it('AC-03: y NO acusa a una lectura legitima sin reserva', () => {
      // El API lee por `ConfigService`; BASE no verifica tokens. Acusar cualquier mención dejaría la
      // guarda inservible y empujaría a rodearla.
      const legitima = "const valor = config.get<string>('JWT_SECRET');";

      expect(/process\.env\.JWT_SECRET\s*(?:\|\||\?\?)/.test(legitima)).toBe(false);
    });
  });
});
