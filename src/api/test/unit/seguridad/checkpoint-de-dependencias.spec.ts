import { comparar, type Baseline, type Aviso } from '../../../scripts/audit-check';

/**
 * PT-118 (PTSA H-008) — El checkpoint D2 de dependencias.
 *
 * `audit-scope.yaml` lo declara desde el 23-jun. `ci.yml` corre lint, typecheck y tests, y de
 * vulnerabilidades **nada**. La consecuencia se midio: H-008 llego con **34 dias de retraso**, con
 * 71 avisos en produccion y uno alcanzable sin autenticar contra la puja en vivo.
 *
 * Un checkpoint previsto y no ejecutado es peor que no tenerlo: da por cubierta un area que nadie
 * vigila, y por eso la auditoria emitio D2 = 99 durante cinco semanas.
 *
 * Se compara contra una **linea base** y no contra un umbral. `--audit-level=high` fallaria desde
 * el primer dia por las 27 ya triadas, el CI quedaria rojo permanente, y alguien lo desactivaria.
 * Asi es como muere un control: no se borra, se ignora hasta que estorba.
 */
describe('El checkpoint de dependencias compara contra la linea base (PT-118)', () => {
  const base: Baseline = {
    generado: '2026-07-27',
    motivo: 'TD-015',
    avisos: { tar: 'critical', glob: 'high', qs: 'moderate' },
  };

  const avisos = (m: Record<string, string>): Aviso[] =>
    Object.entries(m).map(([nombre, severidad]) => ({ nombre, severidad, via: 'x' }));

  it('AC-01: todo lo observado esta en la base -> pasa', () => {
    const r = comparar(avisos({ tar: 'critical', glob: 'high', qs: 'moderate' }), base);

    expect(r.falla).toBe(false);
    expect(r.nuevos).toEqual([]);
  });

  it('AC-02: un paquete que NO esta en la base -> falla, y lo nombra', () => {
    const r = comparar(avisos({ tar: 'critical', lodash: 'high' }), base);

    expect(r.falla).toBe(true);
    expect(r.nuevos.map((n) => n.nombre)).toEqual(['lodash']);
  });

  it('AC-03: un paquete de la base que SUBE de severidad -> falla', () => {
    // El caso silencioso: mismo paquete, misma cuenta, decision distinta.
    const r = comparar(avisos({ qs: 'critical' }), base);

    expect(r.falla).toBe(true);
    expect(r.agravados.map((a) => a.nombre)).toEqual(['qs']);
  });

  it('AC-04: un paquete de la base que BAJA de severidad -> pasa', () => {
    const r = comparar(avisos({ tar: 'moderate' }), base);

    expect(r.falla).toBe(false);
  });

  it('AC-05: un paquete de la base que ya no tiene aviso -> pasa, y lo sugiere quitar', () => {
    const r = comparar(avisos({ tar: 'critical' }), base);

    expect(r.falla).toBe(false);
    expect(r.sobrantes).toEqual(expect.arrayContaining(['glob', 'qs']));
  });

  it('AC-06: sin avisos en absoluto -> pasa', () => {
    const r = comparar([], base);

    expect(r.falla).toBe(false);
  });

  it('AC-07: sin linea base -> falla, no pasa en silencio', () => {
    // Si la ausencia de base dejara pasar, bastaria con borrar el fichero para desactivar el
    // control. Es la misma leccion que los `catch` mudos de F-34.
    const r = comparar(avisos({ tar: 'critical' }), null);

    expect(r.falla).toBe(true);
    expect(r.motivo).toMatch(/linea base|baseline/i);
  });
});
