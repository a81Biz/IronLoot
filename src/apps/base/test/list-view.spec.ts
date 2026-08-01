import { toItems } from "../src/common/bff/list-view";

/**
 * PT-204 (R-023 · H-UI-001, H-UI-002) — El normalizador, contra la forma REAL del API.
 *
 * El primer caso no es inventado: es la respuesta **literal** que devolvió
 * `GET http://localhost:3000/api/v1/auctions?status=ACTIVE&limit=6` el 2026-07-31 durante la auditoría.
 * Se captura aquí para que la prueba mida el contrato de verdad y no el que yo recuerde.
 */
describe("toItems — BASE (PT-204)", () => {
  it("normaliza la forma real de /auctions: {data,total,page,limit}", () => {
    const respuestaReal = { data: [], total: 0, page: 1, limit: 6 };
    expect(toItems(respuestaReal)).toEqual({ items: [], total: 0, page: 1 });
  });

  it("con subastas, las entrega en `items` y conserva el total", () => {
    const respuestaReal = {
      data: [{ id: "a" }, { id: "b" }],
      total: 47,
      page: 2,
      limit: 10,
    };
    expect(toItems(respuestaReal)).toEqual({
      items: [{ id: "a" }, { id: "b" }],
      total: 47,
      page: 2,
    });
  });

  /**
   * **El caso que reproduce el defecto.** Antes de PT-204 el controlador leía `data?.items` sobre este
   * mismo objeto: `undefined`, que el `?? []` convertía en lista vacía. El catálogo público no podía
   * mostrar una subasta ni habiendo cuarenta y siete.
   */
  it("leer `.items` sobre la respuesta cruda del API da undefined — el defecto de H-UI-001", () => {
    const respuestaReal: Record<string, unknown> = {
      data: [{ id: "a" }],
      total: 1,
    };
    expect(respuestaReal.items).toBeUndefined();
    expect(toItems(respuestaReal).items).toHaveLength(1);
  });

  /**
   * **El otro defecto, el de la portada.** `auctions.length` sobre el objeto es `undefined`, y en
   * Nunjucks `undefined > 0` es falso: se pintaba el `{% else %}` sin que nada fallara.
   */
  it("medir `.length` sobre la respuesta cruda da undefined — el defecto de H-UI-002", () => {
    const respuestaReal: unknown = { data: [{ id: "a" }], total: 1 };
    expect((respuestaReal as { length?: number }).length).toBeUndefined();
    expect(toItems(respuestaReal).items.length).toBe(1);
  });

  it("acepta el array plano que devuelven /notifications, /disputes y /watchlist", () => {
    expect(toItems([{ id: "n1" }])).toEqual({
      items: [{ id: "n1" }],
      total: 1,
    });
  });

  it("acepta la forma ya normalizada {items,total}", () => {
    expect(toItems({ items: [{ id: "x" }], total: 9 })).toEqual({
      items: [{ id: "x" }],
      total: 9,
      page: undefined,
    });
  });

  /**
   * `fetchJson` devuelve `null` cuando el API no responde. Pintar vacío es correcto; **decir que no hay
   * subastas no lo es**, y por eso esa distinción vive en el log de `fetchJson`, no aquí.
   */
  it("ante null devuelve lista vacía, no revienta", () => {
    expect(toItems(null)).toEqual({ items: [], total: 0 });
    expect(toItems(undefined)).toEqual({ items: [], total: 0 });
  });
});
