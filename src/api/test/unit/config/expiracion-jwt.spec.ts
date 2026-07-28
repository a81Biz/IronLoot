import { expiracionJwt } from '../../../src/common/config/jwt-expiry';

/**
 * PT-126 — `JWT_ACCESS_EXPIRY` deja de poder estar mal escrita sin que se note al arrancar.
 *
 * Los tipos de `jsonwebtoken` 9 dejaron de aceptar un `string` suelto en `expiresIn`: esperan
 * `number | StringValue`, un tipo de plantilla que solo admite lo que entiende `ms` («15m», «7d»).
 * El valor viene de una variable de entorno, asi que es `string` a secas.
 *
 * Se podia callar con `as any`. Pero el tipo estaba señalando algo real: **`JWT_ACCESS_EXPIRY=15min`
 * no lanza al arrancar** — lanza la primera vez que alguien intenta entrar, con un error de
 * `jsonwebtoken` que no menciona la variable. Peor: `expiresIn` invalido puede acabar en un token
 * sin caducidad util.
 *
 * Validar aqui convierte «se rompe cuando alguien entra» en «no arranca y dice por que».
 */
describe('El formato de caducidad de los tokens (PT-126)', () => {
  describe('Lo que ms entiende', () => {
    it.each(['15m', '7d', '1h', '30s', '2w', '100ms', '1y'])('EX-01: acepta %s', (v) => {
      expect(expiracionJwt(v, 'JWT_ACCESS_EXPIRY')).toBe(v);
    });

    it('EX-02: acepta un numero de segundos en crudo', () => {
      expect(expiracionJwt('3600', 'JWT_ACCESS_EXPIRY')).toBe(3600);
    });

    it('EX-03: acepta las formas largas', () => {
      expect(expiracionJwt('2 days', 'JWT_REFRESH_EXPIRY')).toBe('2 days');
    });
  });

  describe('Lo que no', () => {
    it('EX-04: "pronto" NO lanza en ms — devuelve undefined, y eso llega hasta el sign', () => {
      // El caso peligroso de verdad. `ms('pronto')` no protesta: devuelve undefined en silencio.
      // Esta funcion existe para convertir ese silencio en un fallo de arranque.
      expect(() => expiracionJwt('pronto', 'JWT_ACCESS_EXPIRY')).toThrow(/JWT_ACCESS_EXPIRY/);
    });

    it('EX-04b: "15min" SI es valido — `ms` lo acepta', () => {
      // Estaba en la lista de invalidos por suposicion mia. `ms('15min')` es 900000.
      // Reimplementar la gramatica de otro solo garantiza discrepar de el.
      expect(expiracionJwt('15min', 'JWT_ACCESS_EXPIRY')).toBe('15min');
    });

    it('EX-05: una cadena vacia no pasa', () => {
      expect(() => expiracionJwt('', 'JWT_ACCESS_EXPIRY')).toThrow();
    });

    it('EX-06: texto sin numero no pasa', () => {
      expect(() => expiracionJwt('cuando toque', 'JWT_REFRESH_EXPIRY')).toThrow(
        /JWT_REFRESH_EXPIRY/,
      );
    });

    it('EX-07: el mensaje nombra la variable Y da un ejemplo valido', () => {
      // Un error de arranque que no dice como arreglarlo obliga a leer el codigo.
      expect(() => expiracionJwt('mal', 'JWT_ACCESS_EXPIRY')).toThrow(/15m/);
    });
  });
});
