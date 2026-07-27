import { buscarCatchMudos, comparar } from '../../../scripts/observability-check';

/**
 * PT-121 (checkpoint D3) — `silent_failure_count`.
 *
 * En una sola sesion aparecieron **cinco** fallos silenciosos —F-34, F-39, H-010, H-011, H-012— y
 * ninguno lo encontro un test. El que mas duele: un `catch` rotulado *«live feed is optional»*
 * mantuvo la puja en vivo apagada varios dias con la suite entera en verde.
 *
 * Lo que estos tests fijan es el detector. Y sobre todo uno: **un comentario no cuenta como
 * rastro**. El catch de F-34 tenia comentario. Un comentario dice que alguien penso en ello, no
 * que siga siendo cierto.
 */
describe('El detector de catch mudos (PT-121)', () => {
  const buscar = (codigo: string) => buscarCatchMudos(codigo, 'x.ts');

  it('CM-01: un catch vacio es mudo', () => {
    expect(buscar('try { a() } catch (e) {}')).toHaveLength(1);
  });

  it('CM-02: un catch que registra NO es mudo', () => {
    expect(buscar('try { a() } catch (e) { console.error(e) }')).toHaveLength(0);
    expect(buscar('try { a() } catch (e) { this.logger.warn(e) }')).toHaveLength(0);
  });

  it('CM-03: un catch que relanza NO es mudo', () => {
    expect(buscar('try { a() } catch (e) { throw new Error("x") }')).toHaveLength(0);
  });

  it('CM-04: un catch cuyo unico contenido es un COMENTARIO sigue siendo mudo', () => {
    // Este es el caso de F-34, literal. Tenia comentario y estuvo dias apagando el producto.
    const f34 = 'try { io("/auctions") } catch (e) { /* live feed is optional */ }';

    expect(buscar(f34)).toHaveLength(1);
  });

  it('CM-05: un catch que hace algo pero no lo cuenta sigue siendo mudo', () => {
    expect(buscar('try { a() } catch (e) { return null }')).toHaveLength(1);
  });

  it('CM-06: reporta la linea, para poder ir a mirarlo', () => {
    const codigo = 'linea1\nlinea2\ntry { a() } catch {}';

    expect(buscar(codigo)[0].linea).toBe(3);
  });

  // ── La comparacion contra la linea base ────────────────────────────────
  it('CM-07: lo que esta en la base NO rompe: es una decision declarada', () => {
    const r = comparar([{ fichero: 'a.ts', linea: 10 }], ['a.ts:10']);

    expect(r.falla).toBe(false);
  });

  it('CM-08: uno nuevo SI rompe, y se nombra', () => {
    const r = comparar(
      [
        { fichero: 'a.ts', linea: 10 },
        { fichero: 'b.ts', linea: 4 },
      ],
      ['a.ts:10'],
    );

    expect(r.falla).toBe(true);
    expect(r.nuevos).toEqual([{ fichero: 'b.ts', linea: 4 }]);
  });

  it('CM-09: sin linea base, todo es nuevo', () => {
    // Deliberado: si la ausencia de base dejara pasar, bastaria con borrar el fichero.
    const r = comparar([{ fichero: 'a.ts', linea: 1 }], []);

    expect(r.falla).toBe(true);
  });
});
