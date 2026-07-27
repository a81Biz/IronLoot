import { depositReturnUrl, clientOrigin } from '../../../src/modules/payments/return-urls';

/**
 * PT-088 — Las URLs de retorno salen de una sola fuente.
 *
 * Cada adaptador se inventaba la suya, con tres fallbacks distintos (`5173`, `5175`) y rutas
 * incoherentes entre pasarelas: Mercado Pago volvía a `/wallet/success`, PayPal a
 * `/wallet/deposit-success` y HeyBanco a `/wallet/deposit-cancel`. **Ninguna de esas rutas
 * existía** en CLIENT, así que un pago real terminaba en 404.
 *
 * El origen público es configuración, no una constante escondida en un adaptador: es lo que
 * permite que la misma imagen sirva en local, en staging y en producción.
 */
describe('URLs de retorno del depósito (PT-088)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('clientOrigin', () => {
    it('U-01: usa CLIENT_URL tal cual se configuró', () => {
      process.env.CLIENT_URL = 'https://client.ironloot.com';
      expect(clientOrigin()).toBe('https://client.ironloot.com');
    });

    it('U-02: respeta un origen con puerto no estándar', () => {
      // Un CI o un entorno con el 80 ocupado son casos legítimos; la configuración manda.
      process.env.CLIENT_URL = 'http://client.localhost:8080';
      expect(clientOrigin()).toBe('http://client.localhost:8080');
    });

    it('U-03: descarta la barra final para no generar rutas con doble barra', () => {
      process.env.CLIENT_URL = 'https://client.ironloot.com/';
      expect(clientOrigin()).toBe('https://client.ironloot.com');
    });

    it('U-04: sin configurar, cae en el subdominio local — nunca en un puerto suelto', () => {
      delete process.env.CLIENT_URL;
      expect(clientOrigin()).toBe('http://client.ironloot.local');
    });
  });

  describe('depositReturnUrl', () => {
    beforeEach(() => {
      process.env.CLIENT_URL = 'https://client.ironloot.com';
    });

    it('U-05: una sola ruta canónica para todas las pasarelas', () => {
      expect(depositReturnUrl('DEP-u1-1', 'success')).toBe(
        'https://client.ironloot.com/wallet/deposit/return?ref=DEP-u1-1&status=success',
      );
    });

    it('U-06: el estado viaja como parámetro, no como ruta distinta', () => {
      for (const estado of ['success', 'failure', 'pending', 'cancel'] as const) {
        expect(depositReturnUrl('DEP-u1-1', estado)).toContain(`status=${estado}`);
        expect(depositReturnUrl('DEP-u1-1', estado)).toContain('/wallet/deposit/return');
      }
    });

    it('U-07: la referencia se codifica para la URL', () => {
      expect(depositReturnUrl('DEP-a b-1', 'success')).toContain('ref=DEP-a%20b-1');
    });

    it('U-08: en producción la URL es https y sin puerto', () => {
      const url = depositReturnUrl('DEP-u1-1', 'success');
      expect(url.startsWith('https://')).toBe(true);
      expect(url).not.toMatch(/:\d+/);
    });
  });
});
