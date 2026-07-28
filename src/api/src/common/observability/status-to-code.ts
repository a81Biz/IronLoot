import { ErrorCode } from './constants';

/**
 * F-41 (PT-124) — Traduce un estado HTTP al código con el que se registra el error.
 *
 * Estaba dentro de `exception.filter.ts` como un método privado con un mapa de seis entradas y
 * `|| ErrorCode.INTERNAL_ERROR` al final. El 413 que introdujo PT-124 —un límite de subida
 * funcionando correctamente— se registraba como error interno del servidor.
 *
 * El defecto no era que faltara el 413: era que **enumerar es la estrategia equivocada para un
 * defecto**. Cualquier estado que alguien no hubiera pensado en listar volvería a caer del lado
 * malo, y el siguiente en encontrarlo tendría que volver a añadir una línea.
 *
 * `severity` en el mismo filtro ya lo hacía bien (`status >= 500`). Eran dos clasificaciones del
 * mismo suceso que no coincidían, y la que se ve en un panel agrupado por código era la mala.
 *
 * Sale a su propio fichero para poder probarlo sin montar un filtro de excepciones entero.
 */

/** Los casos con nombre propio. El resto se decide por el lado del 500. */
const CODIGOS_CON_NOMBRE: Record<number, string> = {
  400: ErrorCode.VALIDATION_ERROR,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.RATE_LIMIT_EXCEEDED,
};

export function httpStatusToCode(status: number): string {
  const conNombre = CODIGOS_CON_NOMBRE[status];
  if (conNombre) return conNombre;

  // Cualquier otro 4xx es culpa de la petición: 413, 415, 422, 405… No hace falta preverlos.
  if (status >= 400 && status < 500) return ErrorCode.VALIDATION_ERROR;

  return ErrorCode.INTERNAL_ERROR;
}
