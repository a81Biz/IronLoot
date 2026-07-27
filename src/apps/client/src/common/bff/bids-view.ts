/**
 * PT-059 (BUG-QA-N02) — Lectura de las pujas del usuario en el portal CLIENT.
 *
 * La API expone `GET /api/v1/bids/my-active` (subastas activas en las que pujó) y
 * `GET /api/v1/bids/my-history` (historial completo). Ambas devuelven `Bid[]` con la
 * relación `auction` incluida. La plantilla `bids/my.html` espera `bids.items[]` y un
 * flag `bid.isWinning` que la API no provee.
 *
 * Antes se llamaba `GET /api/v1/bids/my` (inexistente → 404 → tabla vacía).
 */

export const MY_ACTIVE_BIDS_PATH = "/api/v1/bids/my-active";
export const MY_BIDS_HISTORY_PATH = "/api/v1/bids/my-history";

export interface BidAuctionRef {
  id?: string;
  title?: string;
  slug?: string;
  currentPrice?: number;
  endsAt?: string;
  images?: unknown;
  status?: string;
}

export interface BidRaw {
  id?: string;
  amount: number;
  auctionId?: string;
  createdAt?: string;
  auction?: BidAuctionRef;
}

export interface BidView extends BidRaw {
  isWinning: boolean;
}

/**
 * Envuelve la lista de pujas en `{ items }` (lo que espera la plantilla) y deriva
 * `isWinning` comparando el monto de la puja con el precio actual de la subasta.
 * Devuelve `{ items: [] }` ante entrada nula (p. ej. `apiGet` devolvió `null`).
 */
export function mapBidsList(raw: BidRaw[] | null | undefined): {
  items: BidView[];
} {
  if (!raw || !Array.isArray(raw)) return { items: [] };
  return {
    items: raw.map((bid) => ({
      ...bid,
      isWinning: Number(bid.amount) === Number(bid.auction?.currentPrice),
    })),
  };
}
