import {
  clasificarExito,
  clasificarReintento,
  MUESTRA_MINIMA,
  semaforoConMuestra,
} from '../../../scripts/reliability-check';

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

/**
 * PT-180 (H-028) — **Una tasa sobre dos casos no es un veredicto.**
 *
 * S-005 midió D5 sobre dos ciclos de pago: `Success Rate 50% ROJO`, `health_unstable = true`, clase
 * capada a B. Y el sistema **no estaba inestable**: el ciclo que usó la vía garantizada la usó porque el
 * sandbox de PayPal no notificó, que es **exactamente lo que PT-087 diseñó**.
 *
 * El problema es aritmético. Con `n = 2` una tasa sólo puede valer **0 %, 50 % o 100 %**, y el umbral
 * verde es `>= 95`. **Por construcción, un solo fallback fuerza ROJO.**
 *
 * Y en la dirección contraria es peor: **un único ciclo resuelto sin fallback da 100 % VERDE**, y se lee
 * como fiabilidad demostrada. La primera medición de D5 de esta auditoría fue justo eso — `100 %` sobre
 * `1 de 1`.
 *
 * `reliability-check.ts:95` ya lleva escrita esta lección por PT-122, que corrigió **qué** ciclos entran
 * en el denominador. Nadie miró **cuántos**. Es la familia de H-025: lo que distingue un instrumento de
 * auditoría de un test es que declara la base de su afirmación.
 *
 * **El mínimo se deriva de los umbrales, no se elige.** Con `>= 95 %` para VERDE, un solo fallo entre `n`
 * casos cumple `(n−1)/n >= 0.95` sólo si `n >= 20`.
 */
describe('PT-180 — una tasa exige muestra minima para ser veredicto (H-028)', () => {
  it('C1: el minimo es el que los umbrales implican, no uno elegido', () => {
    // Con 19 casos, un solo fallo da 94.7% -> AMBAR. Con 20, da 95% -> VERDE.
    // El umbral verde de este fichero define el minimo; no se escoge por conveniencia.
    expect(clasificarExito(((19 - 1) / 19) * 100)).not.toBe('VERDE');
    expect(clasificarExito(((20 - 1) / 20) * 100)).toBe('VERDE');
    expect(MUESTRA_MINIMA).toBe(20);
  });

  it('C2: con muestra insuficiente el semaforo es SIN_DATOS, no ROJO', () => {
    // El caso de S-005: 1 de 2 ciclos. Un rojo que no significa nada enseña a ignorar los rojos.
    expect(semaforoConMuestra(clasificarExito(50), 2)).toBe('SIN_DATOS');
  });

  it('C3: y tampoco es VERDE — el falso verde es el peor de los dos', () => {
    // 1 de 1 resuelto sin fallback daba `100% VERDE` y se leia como fiabilidad demostrada.
    expect(semaforoConMuestra(clasificarExito(100), 1)).toBe('SIN_DATOS');
  });

  it('C4: con muestra suficiente, el semaforo manda como siempre', () => {
    expect(semaforoConMuestra(clasificarExito(50), 40)).toBe('ROJO');
    expect(semaforoConMuestra(clasificarExito(100), 40)).toBe('VERDE');
  });

  describe('casos de control', () => {
    it('AC-01: `SIN_DATOS` por muestra corta NO capa la clase — pero tampoco la sube', () => {
      // `health_unstable` se dispara con ROJO. Con SIN_DATOS no hay cap, y la falta de evidencia pesa
      // donde debe: en la cobertura declarada de D5, no en un veredicto inventado.
      expect(semaforoConMuestra(clasificarExito(50), 2)).not.toBe('ROJO');
      expect(semaforoConMuestra(clasificarExito(50), 2)).not.toBe('VERDE');
    });

    it('AC-02: en el borde exacto de la muestra, el veredicto ya cuenta', () => {
      expect(semaforoConMuestra(clasificarExito(100), MUESTRA_MINIMA)).toBe('VERDE');
      expect(semaforoConMuestra(clasificarExito(100), MUESTRA_MINIMA - 1)).toBe('SIN_DATOS');
    });

    it('AC-03: un `SIN_DATOS` de origen sigue siendo SIN_DATOS', () => {
      // Sin ciclos que evaluar, la muestra da igual: no habia nada que medir.
      expect(semaforoConMuestra('SIN_DATOS', 0)).toBe('SIN_DATOS');
    });
  });
});
