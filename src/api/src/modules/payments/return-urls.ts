import { clientOrigin as origenCliente } from '../../common/config/public-origins';

/**
 * PT-088 — De dónde salen las URLs a las que la pasarela devuelve al usuario.
 *
 * Antes cada adaptador se inventaba la suya: tres valores por defecto distintos (`5173`,
 * `5175`, y otro para Stripe) y una ruta diferente por pasarela — Mercado Pago volvía a
 * `/wallet/success`, PayPal a `/wallet/deposit-success`, HeyBanco a `/wallet/deposit-cancel`.
 * **Ninguna de esas rutas existía** en CLIENT, de modo que un pago real acababa en 404.
 *
 * Aquí hay una sola fuente y una sola ruta. El origen público es **configuración**, que es lo
 * que permite que la misma imagen sirva en local, en staging y en producción sin recompilar:
 * `http://client.localhost` en desarrollo, `https://client.ironloot.com` en producción.
 *
 * El estado viaja como parámetro y no como ruta distinta, porque **quien lo escribe es el
 * navegador**: es un dato del que se desconfía. La página de retorno lo usa para decidir qué
 * enseñar primero, pero la verdad la pide a `GET /payments/status/:reference`.
 */

export type DepositReturnStatus = 'success' | 'failure' | 'pending' | 'cancel';

/** Ruta canónica de retorno, la misma para todas las pasarelas. */
export const DEPOSIT_RETURN_PATH = '/wallet/deposit/return';

/**
 * Origen público de CLIENT, sin barra final.
 *
 * Se respeta tal cual: si lleva puerto —un CI, o una máquina con el 80 ocupado— es porque
 * quien configuró el entorno lo necesita. Esta función no decide por él.
 */
export function clientOrigin(): string {
  // PT-089 — Delega en la fuente comun a todos los origenes publicos, para que no vuelva a
  // haber dos definiciones de «donde vive CLIENT».
  return origenCliente();
}

/**
 * URL a la que la pasarela devuelve al usuario tras un depósito.
 *
 * @param reference referencia del ciclo (`DEP-<userId>-<ts>`)
 * @param status    lo que la pasarela dice que pasó — orientativo, no vinculante
 */
export function depositReturnUrl(reference: string, status: DepositReturnStatus): string {
  const ref = encodeURIComponent(reference);
  return `${clientOrigin()}${DEPOSIT_RETURN_PATH}?ref=${ref}&status=${status}`;
}
