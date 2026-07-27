import { toItems } from "../src/common/bff/list-view";

/**
 * PT-067 / PT-068 — `toItems` unifica las respuestas del API (array | {data} | {items}) a `{ items }`,
 * que es lo que iteran las plantillas del portal.
 */
describe("toItems (PT-067/PT-068)", () => {
  it("array plano → {items}", () => {
    expect(toItems([{ id: 1 }, { id: 2 }])).toEqual({
      items: [{ id: 1 }, { id: 2 }],
      total: 2,
    });
  });

  it("objeto paginado {data,total} → {items}", () => {
    const out = toItems({ data: [{ id: 1 }], total: 1, page: 1 });
    expect(out.items).toEqual([{ id: 1 }]);
    expect(out.total).toBe(1);
  });

  it("objeto {items} se conserva", () => {
    expect(toItems({ items: [{ id: 9 }] }).items).toEqual([{ id: 9 }]);
  });

  it("null/undefined/otro → {items:[]}", () => {
    expect(toItems(null)).toEqual({ items: [] });
    expect(toItems(undefined)).toEqual({ items: [] });
    expect(toItems("x")).toEqual({ items: [] });
  });
});
