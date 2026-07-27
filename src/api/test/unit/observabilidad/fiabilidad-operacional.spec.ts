import { clasificarExito, clasificarReintento } from '../../../scripts/reliability-check';

/**
 * PT-122 (metricas D5) — Los umbrales de F-1 §6, y sus bordes.
 *
 * Un semaforo mal puesto en un borde es peor que no tenerlo: convierte «85% justo» en verde o en
 * rojo segun quien lo escribiera, y entonces dos auditorias sobre el mismo sistema no comparan.
 */
describe('Los umbrales de fiabilidad operacional (PT-122)', () => {
  describe('Success Rate — verde >=95, ambar 85-95, rojo <85', () => {
    it('FO-01: 100% es verde', () => {
      expect(clasificarExito(100)).toBe('VERDE');
    });

    it('FO-02: exactamente 95 es VERDE (el umbral es inclusivo)', () => {
      expect(clasificarExito(95)).toBe('VERDE');
    });

    it('FO-03: 94 cae a ambar', () => {
      expect(clasificarExito(94)).toBe('AMBAR');
    });

    it('FO-04: exactamente 85 sigue siendo AMBAR', () => {
      expect(clasificarExito(85)).toBe('AMBAR');
    });

    it('FO-05: 84 es rojo', () => {
      expect(clasificarExito(84)).toBe('ROJO');
    });
  });

  describe('Retry Rate — verde <=10, ambar 10-25, rojo >25', () => {
    it('FO-06: 0% es verde', () => {
      expect(clasificarReintento(0)).toBe('VERDE');
    });

    it('FO-07: exactamente 10 es VERDE', () => {
      expect(clasificarReintento(10)).toBe('VERDE');
    });

    it('FO-08: exactamente 25 sigue siendo AMBAR', () => {
      expect(clasificarReintento(25)).toBe('AMBAR');
    });

    it('FO-09: 26 es rojo', () => {
      expect(clasificarReintento(26)).toBe('ROJO');
    });
  });

  it('FO-10: sin datos NO es verde', () => {
    // El caso que importa. En CI la base nace vacia; si `null` se clasificara como verde,
    // el checkpoint diria «todo bien» sobre un sistema que nunca ha ejecutado nada.
    expect(clasificarExito(null)).toBe('SIN_DATOS');
    expect(clasificarReintento(null)).toBe('SIN_DATOS');
  });
});
