/**
 * PT-204 (R-023 · H-UI-001, H-UI-002) — Normaliza las respuestas de lista del API a la forma que
 * esperan las plantillas.
 *
 * ## Lo que estaba roto
 *
 * `GET /api/v1/auctions` devuelve `{ data, total, page, limit }`. El catálogo público leía
 * `data?.items` —una clave que **no existe**— y la portada hacía `auctions.length` sobre el objeto
 * entero, que es `undefined`.
 *
 * Las dos superficies públicas del producto **no podían mostrar una sola subasta**, y ninguna daba
 * error: las dos caían en su `{% else %}` y pintaban «No hay subastas disponibles». Indistinguible de
 * un catálogo legítimamente vacío. El defecto no se ve, se lee como un dato.
 *
 * ## Por qué este fichero está duplicado y no compartido
 *
 * Es una copia deliberada de `src/apps/client/src/common/bff/list-view.ts`. BASE y CLIENT son paquetes
 * npm distintos sin dependencia entre sí, y meterlo en `@ironloot/core` obligaría a publicar y versionar
 * la librería de dominio para una función de presentación — `core` es dominio puro, sin HTTP.
 *
 * Es el mismo criterio que ya siguen `variable-obligatoria.ts` y `vida-de-sesion.ts`, duplicados en los
 * dos sitios por la misma razón. **Lo que impide que diverjan no es compartir el código, es la guarda**
 * `src/api/test/unit/web-views/forma-de-lista-ssr.spec.ts`, que comprueba la relación en los dos sitios.
 */
export interface ListView<T = unknown> {
  items: T[];
  total?: number;
  page?: number;
}

/**
 * Acepta las tres formas que el API emite hoy y devuelve siempre una:
 *
 *   - array plano            (`/notifications`, `/disputes`, `/watchlist`, `/bids/my-active`)
 *   - `{ items, total }`     (forma ya normalizada)
 *   - `{ data, total, page }` (`/auctions`)
 *
 * Ante `null` —que es lo que devuelve `fetchJson` cuando el API no responde— devuelve la lista vacía.
 * Eso es correcto para pintar, y **no** es lo mismo que «no hay subastas»: la distinción vive en el log
 * de `fetchJson`, no aquí.
 */
export function toItems<T = unknown>(raw: unknown): ListView<T> {
  if (Array.isArray(raw)) return { items: raw as T[], total: raw.length };

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    if (Array.isArray(obj.items))
      return {
        items: obj.items as T[],
        total: Number(obj.total ?? obj.items.length),
        page: obj.page as number | undefined,
      };

    if (Array.isArray(obj.data))
      return {
        items: obj.data as T[],
        total: Number(obj.total ?? obj.data.length),
        page: obj.page as number | undefined,
      };
  }

  return { items: [], total: 0 };
}
