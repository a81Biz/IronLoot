import type { SignOptions } from 'jsonwebtoken';

/**
 * PT-126 — Punto único de lectura de las caducidades de token.
 *
 * Los tipos de `jsonwebtoken` 9 dejaron de aceptar un `string` suelto en `expiresIn`: esperan
 * `number | StringValue`, un tipo de plantilla que sólo admite lo que entiende `ms`. El valor viene
 * de una variable de entorno, así que llega como `string` a secas.
 *
 * Se podía callar al compilador con `as any`. Pero el tipo estaba señalando algo real:
 * **`JWT_ACCESS_EXPIRY=15min` no lanza al arrancar** — lanza la primera vez que alguien intenta
 * entrar, con un error de `jsonwebtoken` que no menciona la variable.
 *
 * Validar aquí convierte «se rompe cuando alguien entra» en «no arranca y dice por qué». Es el
 * mismo criterio que `jwt-secret.ts`, y por la misma razón: un fallo de configuración debe doler
 * pronto y en el sitio donde se puede arreglar.
 */

export type Expiracion = NonNullable<SignOptions['expiresIn']>;

/**
 * Se valida con `ms` —el mismo parser que usa `jsonwebtoken` por debajo— y no con una expresión
 * regular propia.
 *
 * El primer intento sí escribió la gramática a mano, y estaba mal: rechazaba `15min`, que `ms`
 * acepta sin problema. Reimplementar la gramática de otro sólo garantiza discrepar de él. Y lo que
 * de verdad hay que cazar no es un formato raro: es que **`ms('pronto')` devuelve `undefined` sin
 * lanzar**. Ese silencio es el que llega hasta el `sign`.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ms: (v: string) => number | undefined = require('ms');

export function expiracionJwt(valor: string, variable: string): Expiracion {
  const limpio = valor.trim();

  // Un número desnudo son segundos, y `jsonwebtoken` lo acepta como number.
  if (/^\d+$/.test(limpio)) return Number(limpio);

  if (!Number.isFinite(ms(limpio) as number)) {
    // El valor SÍ va en el mensaje: no es un secreto, y sin él no se sabe qué corregir.
    throw new Error(
      `${variable} vale "${limpio}", que no es una duracion valida. ` +
        'Usa el formato de `ms`: 15m, 1h, 7d, 30s — o un numero de segundos.',
    );
  }

  return limpio as Expiracion;
}
