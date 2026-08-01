/**
 * PT-058 (BUG-QA-N01) — Lectura del saldo del wallet en el portal CLIENT.
 *
 * La API expone `GET /api/v1/wallet/balance` que devuelve `WalletBalanceDto`
 * `{ available, held, currency, isActive }`. Las plantillas del portal esperan
 * `wallet.balance` y `wallet.held_funds`, por lo que se mapea aquí (helper puro y testeable).
 *
 * Antes se llamaba `GET /api/v1/wallet` (inexistente → 404 → saldo mostrado como 0.00).
 */

export const WALLET_BALANCE_PATH = "/api/v1/wallet/balance";

export interface WalletBalanceRaw {
  available: number;
  held: number;
  /**
   * PT-206 (H-UI-011) — El holdback: el neto de las ventas sin liquidar (`RN-64`).
   *
   * El API lo devuelve desde PT-071 y **esta interfaz no lo declaraba**, así que el mapeador de abajo lo
   * descartaba antes de llegar a ninguna plantilla. Opcional en el tipo porque un API anterior podría no
   * enviarlo; el mapeador lo resuelve a 0, nunca a `undefined`.
   */
  pending?: number;
  currency: string;
  isActive: boolean;
}

export interface WalletView {
  balance: number;
  held_funds: number;
  /** Ventas cobradas cuyo neto aún no se ha liberado. NO es retirable todavía. */
  pending_balance: number;
  currency: string;
  isActive: boolean;
}

/**
 * Mapea la respuesta de `/wallet/balance` al modelo que consumen las plantillas.
 * Devuelve `null` si la respuesta es falsy (p. ej. `apiGet` devolvió `null` ante un error),
 * lo que las plantillas manejan con `default('0.00')`.
 */
export function mapWalletBalance(
  raw: WalletBalanceRaw | null | undefined,
): WalletView | null {
  if (!raw) return null;
  return {
    balance: raw.available,
    held_funds: raw.held,
    // PT-206 — `?? 0` y no `raw.pending` a secas: un `undefined` acabaría en la plantilla como saldo
    // vacío, que es la misma clase de silencio que este PT corrige.
    pending_balance: raw.pending ?? 0,
    currency: raw.currency,
    isActive: raw.isActive,
  };
}
