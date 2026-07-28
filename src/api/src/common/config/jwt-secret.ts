import { ConfigService } from '@nestjs/config';

/**
 * PT-126 — Punto único de lectura de `JWT_SECRET`.
 *
 * Lo destapó la migración a NestJS 11: los tipos de `@nestjs/jwt` 11 y `passport-jwt` dejaron de
 * aceptar `string | undefined` donde va el secreto de firma. Los seis puntos que lo leían hacían
 * `config.get<string>('JWT_SECRET')` y seguían adelante con `undefined`.
 *
 * `validate-startup-config.ts` ya lo exigía, pero **sólo en producción**. En desarrollo, un `.env`
 * sin la variable arrancaba la aplicación entera y fallaba después, al firmar, con un error de
 * `jsonwebtoken` que no menciona la causa. Ese hueco es donde se pierden las horas.
 *
 * La salida fácil era `config.get('JWT_SECRET')!`. El `!` calla al compilador y deja el sistema
 * igual de roto: es la firma de que alguien tuvo la información delante y la tiró.
 */

/** Lo que ya exigía `validate-startup-config.ts` en producción. Ahora vale en todas partes. */
export const LONGITUD_MINIMA = 32;

export function jwtSecret(config: ConfigService): string {
  const valor = config.get<string>('JWT_SECRET');

  if (!valor) {
    throw new Error(
      'JWT_SECRET no esta definida. Sin ella no se pueden firmar ni verificar sesiones. ' +
        'Ponla en el .env del API con al menos ' +
        LONGITUD_MINIMA +
        ' caracteres.',
    );
  }

  if (valor.length < LONGITUD_MINIMA) {
    // Un secreto corto firma igual de bien. Por eso hay que rechazarlo aqui y no esperar a que
    // «funcione». El valor NO se incluye en el mensaje: esto acaba en un log.
    throw new Error(
      `JWT_SECRET tiene ${valor.length} caracteres y hacen falta al menos ${LONGITUD_MINIMA}.`,
    );
  }

  return valor;
}
