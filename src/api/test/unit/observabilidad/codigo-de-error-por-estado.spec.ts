import { ErrorCode } from '../../../src/common/observability/constants';
import { httpStatusToCode } from '../../../src/common/observability/status-to-code';

/**
 * F-41 (PT-124) — Un error del cliente no es un fallo del servidor.
 *
 * El mapa enumeraba seis estados y todo lo demas caia en `INTERNAL_ERROR`. Se vio con el 413 que
 * introdujo PT-124: el limite de subida funcionaba, devolvia el estado correcto, y se registraba
 * como error interno. Un panel agrupado por `errorCode` habria contado cada subida grande de un
 * usuario como un fallo del sistema.
 *
 * `severity` ya distinguia bien (`status >= 500`). El `code` no. Dos clasificaciones del mismo
 * suceso que no coincidian — y la que se ve en el panel era la mala.
 *
 * La correccion no es añadir el 413 a la lista: es que **la lista no puede ser la unica fuente**.
 * Enumerar estados garantiza que el siguiente que no este enumerado repita el defecto. Lo unico
 * que hace falta saber por defecto es de que lado del 500 cae.
 */
describe('httpStatusToCode — el defecto conoce el lado del 500 (F-41)', () => {
  describe('Los que estaban enumerados siguen igual', () => {
    it.each([
      [400, ErrorCode.VALIDATION_ERROR],
      [401, ErrorCode.UNAUTHORIZED],
      [403, ErrorCode.FORBIDDEN],
      [404, ErrorCode.NOT_FOUND],
      [409, ErrorCode.CONFLICT],
      [429, ErrorCode.RATE_LIMIT_EXCEEDED],
    ])('EC-%s: %s', (status, code) => {
      expect(httpStatusToCode(status as number)).toBe(code);
    });
  });

  describe('Los 4xx que NO estaban', () => {
    it('EC-07: 413 es error del cliente, no INTERNAL_ERROR — el caso que lo destapo', () => {
      expect(httpStatusToCode(413)).toBe(ErrorCode.VALIDATION_ERROR);
      expect(httpStatusToCode(413)).not.toBe(ErrorCode.INTERNAL_ERROR);
    });

    it.each([405, 410, 415, 422, 451])('EC-08: %s tampoco es INTERNAL_ERROR', (status) => {
      expect(httpStatusToCode(status)).not.toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  describe('Los 5xx siguen siendo del servidor', () => {
    it.each([500, 502, 503, 504])('EC-09: %s es INTERNAL_ERROR', (status) => {
      expect(httpStatusToCode(status)).toBe(ErrorCode.INTERNAL_ERROR);
    });
  });

  it('EC-10: un estado raro por debajo de 400 no se disfraza de exito', () => {
    // No deberia llegar aqui nunca; si llega, que no se pierda entre los errores de cliente.
    expect(httpStatusToCode(302)).toBe(ErrorCode.INTERNAL_ERROR);
  });
});
