import { ConfigService } from '@nestjs/config';
import { jwtSecret, LONGITUD_MINIMA } from '../../../src/common/config/jwt-secret';

/**
 * PT-126 — `JWT_SECRET` deja de poder faltar sin que nadie se entere.
 *
 * Lo destapo la migracion a NestJS 11: los tipos de `@nestjs/jwt` 11 y `passport-jwt` dejaron de
 * aceptar `string | undefined` donde va el secreto. Los seis puntos que lo leian hacian
 * `config.get<string>('JWT_SECRET')` y seguian adelante con `undefined`.
 *
 * `validate-startup-config.ts` ya lo exigia — **solo en produccion**. En desarrollo, un `.env` sin
 * la variable arrancaba la aplicacion entera y fallaba mas tarde, al firmar, con un error de
 * `jsonwebtoken` que no menciona la causa.
 *
 * La salida facil habria sido `secret: config.get('JWT_SECRET')!`. El `!` calla al compilador y
 * deja el sistema igual de roto: es la firma de que alguien tuvo la informacion delante y la tiro.
 */
describe('El secreto de firma no puede faltar (PT-126)', () => {
  const conValor = (v?: string) =>
    ({ get: jest.fn().mockReturnValue(v) }) as unknown as ConfigService;

  const SECRETO_VALIDO = 'x'.repeat(LONGITUD_MINIMA);

  it('SJ-01: devuelve el secreto cuando esta y es suficientemente largo', () => {
    expect(jwtSecret(conValor(SECRETO_VALIDO))).toBe(SECRETO_VALIDO);
  });

  it('SJ-02: si falta, lanza — y el mensaje dice que variable es', () => {
    expect(() => jwtSecret(conValor(undefined))).toThrow(/JWT_SECRET/);
  });

  it('SJ-03: la cadena vacia cuenta como que falta', () => {
    // `.env` con `JWT_SECRET=` es el caso mas comun de los dos, y el mas dificil de ver leyendo.
    expect(() => jwtSecret(conValor(''))).toThrow(/JWT_SECRET/);
  });

  it('SJ-04: uno demasiado corto tampoco pasa, y el mensaje dice cuanto falta', () => {
    // Un secreto de 8 caracteres firma perfectamente. Ese es justo el problema.
    expect(() => jwtSecret(conValor('corto'))).toThrow(new RegExp(String(LONGITUD_MINIMA)));
  });

  it('SJ-05: el minimo exacto se acepta — el umbral es inclusivo', () => {
    expect(() => jwtSecret(conValor('y'.repeat(LONGITUD_MINIMA)))).not.toThrow();
  });

  it('SJ-06: el error NUNCA incluye el valor leido', () => {
    // Un mensaje de arranque acaba en un log, y un log acaba en sitios que no controlamos.
    const casi = 'z'.repeat(LONGITUD_MINIMA - 1);

    try {
      jwtSecret(conValor(casi));
      throw new Error('deberia haber lanzado');
    } catch (e) {
      expect((e as Error).message).not.toContain(casi);
    }
  });
});
