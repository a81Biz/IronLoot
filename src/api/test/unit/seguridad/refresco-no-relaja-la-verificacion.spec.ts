import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-194 (`TD-025`) — **Añadir una vía a la sesión no puede relajar la verificación.**
 *
 * ## Por qué esta guarda existe además de las pruebas del CLIENT
 *
 * `guard-refresca-una-vez.spec.ts` prueba el **comportamiento de hoy**: un token falsificado va al
 * login sin refrescar. Esta guarda protege la **forma**, y la protege desde el API, que es donde vive
 * el resto del contrato de seguridad del repositorio.
 *
 * La diferencia importa: una prueba de comportamiento se puede satisfacer con una implementación que
 * *hoy* acierta y mañana no —por ejemplo, capturando el error genérico y decidiendo por el mensaje—.
 * Lo que hay que impedir es que alguien reescriba el `catch` de forma que **cualquier** fallo de
 * `jwt.verify` acabe refrescando.
 *
 * ## Lo que se impide, en una frase
 *
 * Que presentar un `access_token` basura junto a una cookie de refresco válida sirva para obtener un
 * token nuevo. Eso convertiría el refresco en **una vía para saltarse la verificación de firma**.
 *
 * ## Y lo segundo: un refresco fallido cierra la sesión entera
 *
 * Si se borrara sólo `access_token`, la cookie de refresco quedaría en el navegador como una llave
 * muerta — y la siguiente navegación volvería a intentarlo. Es el bucle que `CA-4` prohíbe.
 */
const RAIZ = raizDelMonorepo();
const GUARD = join(
  RAIZ,
  'src',
  'apps',
  'client',
  'src',
  'common',
  'guards',
  'client-auth.guard.ts',
);
const REFRESCO = join(
  RAIZ,
  'src',
  'apps',
  'client',
  'src',
  'common',
  'auth',
  'refrescar-sesion.ts',
);

/** Lo ejecutable: el comentario que explica el defecto tiene que poder nombrarlo. */
const ejecutable = (p: string) =>
  readFileSync(p, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

describe('El refresco no relaja la verificacion — PT-194 (TD-025)', () => {
  it('C1: solo se refresca ante `TokenExpiredError`', () => {
    // La comprobación del tipo de error tiene que estar **antes** de cualquier llamada al refresco.
    // Si no, el orden permitiría refrescar primero y comprobar después.
    const src = ejecutable(GUARD);

    const iComprobacion = src.indexOf('TokenExpiredError');
    const iRefresco = src.indexOf('refrescarYSeguir');

    expect(iComprobacion).toBeGreaterThan(-1);
    expect(iRefresco).toBeGreaterThan(iComprobacion);
  });

  it('C2: un refresco fallido borra LAS DOS cookies', () => {
    // Dejar la de refresco sería dejar una llave muerta, y la siguiente navegación reintentaría.
    const src = ejecutable(GUARD);
    const i = src.indexOf('private cerrarSesion(');
    expect(i).toBeGreaterThan(-1);

    const cuerpo = src.slice(i, src.indexOf('\n  private ', i + 1));
    expect(cuerpo).toMatch(/clearCookie\(\s*["']access_token["']/);
    expect(cuerpo).toMatch(/clearCookie\(\s*["']refresh_token["']/);
  });

  it('C3: el refresco declara su tope de espera', () => {
    // El API es un tercero para el CLIENT (PT-183/PT-184). Un refresco colgado colgaría la página.
    const src = ejecutable(REFRESCO);

    expect(src).toMatch(/AbortController/);
    expect(src).toMatch(/signal:\s*\w+\.signal/);
  });

  it('C4: 401 y 403 dan `null`; el resto LANZA', () => {
    // «La sesión ya no vale» y «no pude preguntarlo» llevan al mismo sitio y **no son lo mismo**.
    // Colapsarlos haría indistinguible «los usuarios se salen» de «el API está caído».
    const src = ejecutable(REFRESCO);

    expect(src).toMatch(/status === 401 \|\| .*status === 403/);
    expect(src).toMatch(/if \(!res\.ok\)[\s\S]{0,120}throw new Error/);
  });

  describe('casos de control', () => {
    it('AC-01: los ficheros vigilados existen y tienen contenido', () => {
      // Sin esto, un renombrado dejaría la guarda leyendo cadenas vacías y **pasando en vacío** — el
      // modo exacto en que una guarda se vuelve inútil sin dejar de existir. Ya ocurrió con RULE-32.
      expect(ejecutable(GUARD).length).toBeGreaterThan(500);
      expect(ejecutable(REFRESCO).length).toBeGreaterThan(500);
    });

    it('AC-02: la deteccion reconoce la forma peligrosa', () => {
      // Un `catch` que refresca sin mirar el tipo de error. Si la guarda no lo distinguiera de la
      // forma correcta, C1 no estaría midiendo nada.
      const peligrosa = 'catch { return this.refrescarYSeguir(req, res); }';
      const correcta =
        'catch (e) { if (!(e instanceof jwt.TokenExpiredError)) return this.cerrarSesion(res); return this.refrescarYSeguir(req, res); }';

      const ordenOk = (s: string) =>
        s.indexOf('TokenExpiredError') > -1 &&
        s.indexOf('refrescarYSeguir') > s.indexOf('TokenExpiredError');

      expect(ordenOk(peligrosa)).toBe(false);
      expect(ordenOk(correcta)).toBe(true);
    });
  });
});
