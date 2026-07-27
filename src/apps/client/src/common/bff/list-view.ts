/**
 * PT-067 / PT-068 — Normaliza respuestas de lista del API al modelo que esperan las plantillas.
 *
 * Las plantillas del portal iteran `x.items` (`{% for o in orders.items %}`), pero el API devuelve
 * distintas formas según el endpoint: un array plano (`/orders`) o un objeto paginado (`/auctions` → `{data,total}`).
 * `toItems` unifica todo a `{ items: [...] }`.
 */
export interface ListView<T = unknown> {
  items: T[];
  total?: number;
  page?: number;
}

export function toItems<T = unknown>(raw: unknown): ListView<T> {
  if (Array.isArray(raw)) return { items: raw as T[], total: raw.length };
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items))
      return {
        items: obj.items as T[],
        total: Number(obj.total ?? obj.items.length),
        page: obj.page as number,
      };
    if (Array.isArray(obj.data))
      return {
        items: obj.data as T[],
        total: Number(obj.total ?? obj.data.length),
        page: obj.page as number,
      };
  }
  return { items: [] };
}
