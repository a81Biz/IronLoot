import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-192 (AUD-035) — **Una cookie de sesión no dura más que el token que transporta.**
 *
 * ## Cuatro relojes, ninguno hablando con otro
 *
 * | Qué | Duraba | De dónde salía |
 * |---|---|---|
 * | cookie `access_token` | **7 días** | literal en `main.ts` |
 * | token de acceso | **15 minutos** | `JWT_ACCESS_EXPIRY` |
 * | cookie `refresh_token` | **30 días** | literal en `main.ts` |
 * | token de refresco | **7 días** | `JWT_REFRESH_EXPIRY` |
 *
 * Las cookies **sobrevivían a su propio contenido** —la de acceso 672 veces—, así que durante ese
 * sobrante el navegador mandaba una credencial muerta y el sitio *parecía* tener sesión. No es un
 * agujero: lo que se verifica es el token. Es un **estado que miente**, que es lo mismo que esta jornada
 * lleva corrigiendo en los registros, sólo que en el navegador.
 *
 * ## Y al medirlo salió algo mayor que el hallazgo
 *
 * **La sesión efectiva dura 15 minutos.** El API expone `POST /auth/refresh`, BASE guarda el token de
 * refresco con su cookie de 30 días… y **no hay un solo llamante** en BASE ni en CLIENT. El mecanismo
 * que existe para que la sesión dure siete días está escrito y **no está cableado** → `TD-025`.
 *
 * Cablearlo es trabajo de funcionalidad sobre el camino de autenticación, así que no se hace aquí. Lo
 * que sí se hace es **dejar de prometer** lo que no se cumple.
 *
 * ## Qué vigila esta guarda
 *
 * Que las vidas de cookie **se deriven** de las de token en vez de escribirse. Un literal vuelve a
 * divergir el día que alguien cambie `JWT_ACCESS_EXPIRY` — es la lección de PT-088 (una sola fuente para
 * las URL) aplicada al tiempo.
 */
const RAIZ = raizDelMonorepo();
const MAIN = join(RAIZ, 'src', 'apps', 'base', 'src', 'main.ts');
const VIDA = join(RAIZ, 'src', 'apps', 'base', 'src', 'common', 'config', 'vida-de-sesion.ts');

const ejecutable = (p: string) =>
  readFileSync(p, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

describe('La cookie no vive mas que su token — AUD-035 (PT-192)', () => {
  it('C1: ningun `maxAge` de sesion se escribe como literal de dias', () => {
    // La forma exacta que había: `7 * 24 * 60 * 60 * 1000`. Se mide sobre lo ejecutable — el comentario
    // que explica el defecto tiene que poder citarlo.
    const src = ejecutable(MAIN);

    expect(src).not.toMatch(/maxAge:\s*\d+\s*\*\s*24\s*\*\s*60/);
  });

  it('C2: las dos cookies derivan de la vida del token correspondiente', () => {
    const src = ejecutable(MAIN);

    expect(src).toMatch(/maxAge:\s*VIDA_ACCESO_MS/);
    expect(src).toMatch(/maxAge:\s*VIDA_REFRESCO_MS/);
  });

  it('C3: y esas vidas salen de las MISMAS variables con las que el API firma', () => {
    // Si BASE leyera una variable distinta, la cookie volvería a mentir por otro camino.
    const src = ejecutable(VIDA);

    expect(src).toMatch(/JWT_ACCESS_EXPIRY/);
    expect(src).toMatch(/JWT_REFRESH_EXPIRY/);
  });

  describe('la conversion de duraciones', () => {
    // Se reimplementa el parser aquí a propósito **no**: se importa el real. Una copia en la prueba
    // mediría la copia.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { duracionAMs } = require(VIDA) as { duracionAMs: (v: string) => number };

    it('C4: interpreta los formatos que usa `jsonwebtoken`', () => {
      expect(duracionAMs('15m')).toBe(15 * 60_000);
      expect(duracionAMs('7d')).toBe(7 * 86_400_000);
      expect(duracionAMs('2h')).toBe(2 * 3_600_000);
      // Sin sufijo, `jsonwebtoken` cuenta segundos. Interpretarlo como milisegundos daría una cookie
      // de 900 ms para un token de 15 minutos.
      expect(duracionAMs('900')).toBe(900_000);
    });

    it('AC-01 (control): una duracion mal escrita ABORTA en vez de inventarse una', () => {
      // Devolver un valor por defecto aquí reproduciría el defecto: una cookie con una vida que nadie
      // pidió. Es RULE-17 aplicada a una duración.
      expect(() => duracionAMs('quince minutos')).toThrow(/no reconocida/i);
      expect(() => duracionAMs('')).toThrow();
    });
  });

  describe('casos de control', () => {
    it('AC-02: la deteccion reconoce la forma literal que habia', () => {
      const forma = '  maxAge: 7 * 24 * 60 * 60 * 1000,';

      expect(/maxAge:\s*\d+\s*\*\s*24\s*\*\s*60/.test(forma)).toBe(true);
    });

    it('AC-03: las cookies siguen teniendo vida — no se han vuelto de sesion', () => {
      // La forma perezosa de pasar C1 es quitar `maxAge`, que convierte la cookie en una de sesión y
      // cierra sesión al cerrar el navegador. Eso es un cambio de producto, no una corrección.
      const src = ejecutable(MAIN);

      expect((src.match(/maxAge:/g) ?? []).length).toBeGreaterThanOrEqual(2);
    });
  });
});
