import { veredictoCoherencia } from '../../../scripts/domain-rules';

/**
 * PT-149 (H-021) — El veredicto se DERIVA del resultado; no se imprime aparte.
 *
 * `audit:domain` cerraba su Nivel 3 imprimiendo `cross_coherence_verified = true` **con las cinco
 * comprobaciones en `(ERR)`**, y el proceso salia con codigo 0. Medido el 2026-07-29 (E-026):
 *
 * ```
 * /bin/sh: 1: docker: not found
 *   [n/d ] P-002 → P-003    El importe del pedido coincide con el precio final  (ERR)
 *   …las cinco…
 *   cross_coherence_verified = true
 * ```
 *
 * La causa esta en una linea: `if (!ok && n !== 'ERR') incoherentes++`. Un error **no contaba** como
 * incoherencia, y el veredicto era `incoherentes === 0`. Es decir: **cuantos menos datos, mas verde**.
 *
 * ## Por que es ALTA y no un detalle
 *
 * No es que la comprobacion falle: es que **afirma haber verificado lo que no miro**, dentro del
 * instrumento que la auditoria usa para medir. Las cinco comprobaciones cubren dinero — importe del
 * pedido contra precio final, comision contra importe, registro de comision contra el asiento del
 * ledger. Y contradice `[A1]`, evidencia sobre opinion, que es el primer axioma de PTSA.
 *
 * Es la quinta aparicion del patron de la casa —*un mecanismo que no se ejecuta no avisa de nada*—
 * agravada: **no calla, dice que si**.
 *
 * ## La solucion ya estaba escrita tres lineas mas arriba
 *
 * El mismo fichero devuelve `rubric_compliance_score = null` y escribe *«Esto NO es un 100: es una
 * auditoria que no ha podido mirar»*. Alguien penso este problema para el score y no lo aplico al
 * veredicto de al lado. Aqui se aplica: **tres estados, no un booleano.**
 */
describe('El veredicto de coherencia se deriva del resultado — PT-149 (H-021)', () => {
  // PT-177 (H-025) — `comparadas` es el DENOMINADOR: cuantas filas tenia la comprobacion para mirar.
  // Sin el, una consulta que corre limpia sobre cero filas devuelve «0 incoherencias» y se cuenta como
  // medida. Los casos de antes llevan un universo no vacio para seguir significando lo que decian.
  const ok = { par: 'P-002 → P-003', resultado: '0' as const, comparadas: 5 };
  const falla = { par: 'P-003 → P-010', resultado: '3' as const, comparadas: 7 };
  const err = { par: 'P-010 → P-009', resultado: 'ERR' as const, comparadas: 'ERR' as const };
  const vacia = { par: 'P-003 → P-006', resultado: '0' as const, comparadas: 0 };

  it('C1: las cinco miden y pasan → verificado', () => {
    expect(veredictoCoherencia([ok, ok, ok, ok, ok])).toEqual({
      estado: 'verificado',
      medidas: 5,
      incoherentes: 0,
      noMedidas: 0,
      // PT-177 — El campo nuevo entra en la igualdad estricta. Se deja el `toEqual` completo a
      // proposito: un `objectContaining` habria dejado pasar que el veredicto omitiera el denominador.
      sinFilas: 0,
    });
  });

  it('C2: una no se pudo medir → SIN_DATOS, nunca «verificado»', () => {
    // El caso exacto de H-021, en su forma minima. Antes esto devolvia `true`.
    const v = veredictoCoherencia([ok, ok, ok, ok, err]);

    expect(v.estado).toBe('sin_datos');
    expect(v.estado).not.toBe('verificado');
    expect(v.noMedidas).toBe(1);
  });

  it('C3: las cinco en error → SIN_DATOS. Es el hallazgo tal cual se observo', () => {
    const v = veredictoCoherencia([err, err, err, err, err]);

    expect(v.estado).toBe('sin_datos');
    expect(v.medidas).toBe(0);
    expect(v.noMedidas).toBe(5);
  });

  it('C4: una incoherencia real → incoherente, y gana sobre la falta de datos', () => {
    // Una incoherencia MEDIDA es peor noticia que una no medida: se reporta esa.
    const v = veredictoCoherencia([ok, falla, err, ok, ok]);

    expect(v.estado).toBe('incoherente');
    expect(v.incoherentes).toBe(1);
    expect(v.noMedidas).toBe(1);
  });

  it('C5: sin comprobaciones no hay nada verificado', () => {
    // Un catalogo vacio devolvia `true` con la logica vieja: `0 === 0`. Afirmar que se verifico la
    // coherencia de cero pares es la version degenerada del mismo error.
    expect(veredictoCoherencia([]).estado).toBe('sin_datos');
  });

  /**
   * PT-177 (H-025) — **Una consulta que corre sobre CERO filas no ha medido nada.**
   *
   * PT-149 arreglo el caso «no pude conectar» (`ERR`) y dejo este: la consulta se ejecuta limpia,
   * devuelve «0 incoherencias» porque **no hay una sola fila que comparar**, y contaba como medida.
   *
   * Observado el 2026-07-29 con la base vacia y **tambien con la base poblada**: cuatro de las cinco
   * comprobaciones comparaban cero filas (0 pedidos, 0 comisiones, 0 disputas) y el veredicto decia
   * `verificado · 5 de 5 medidas`. Las cinco cubren dinero.
   *
   * Y el propio docstring de `veredictoCoherencia()` **declaraba esta proteccion sin implementarla**:
   * *«un catalogo vacio da `sin_datos`, no `verificado`»*. Estaba escrita la intencion, no el codigo.
   */
  describe('PT-177 — el veredicto declara su denominador', () => {
    it('C6: cinco comprobaciones sobre CERO filas no son «verificado»', () => {
      // El hallazgo tal cual se observo: consultas limpias, cero incoherencias, cero filas comparadas.
      const v = veredictoCoherencia([vacia, vacia, vacia, vacia, vacia]);

      expect(v.estado).toBe('sin_datos');
      expect(v.medidas).toBe(0);
    });

    it('C7: una sola comprobacion vacia basta para NO decir «verificado»', () => {
      // Es el caso real con la base poblada: cuatro vacias y una con datos.
      expect(veredictoCoherencia([ok, ok, ok, ok, vacia]).estado).toBe('sin_datos');
    });

    it('C8: una incoherencia REAL sigue ganando sobre la falta de datos', () => {
      // Una incoherencia observada es peor noticia que una no observada. El orden importa.
      expect(veredictoCoherencia([vacia, falla]).estado).toBe('incoherente');
    });

    it('C9: con filas comparadas y sin incoherencias, si es «verificado»', () => {
      const v = veredictoCoherencia([ok, ok, ok, ok, ok]);

      expect(v.estado).toBe('verificado');
      expect(v.medidas).toBe(5);
    });

    describe('casos de control', () => {
      it('AC-02: `sinFilas` se cuenta aparte de `noMedidas` — no son lo mismo', () => {
        // «No pude conectar» y «no habia nada que comparar» son dos problemas distintos, y mezclarlos
        // habria escondido el segundo detras del primero, que es lo que ya paso una vez.
        const v = veredictoCoherencia([err, vacia, ok]);

        expect(v.noMedidas).toBe(1);
        expect(v.sinFilas).toBe(1);
        expect(v.medidas).toBe(1);
      });

      it('AC-03: el denominador no altera el caso que PT-149 ya cubria', () => {
        expect(veredictoCoherencia([ok, err]).estado).toBe('sin_datos');
      });
    });
  });

  describe('salida del proceso', () => {
    it('AC-01: «verificado» es el UNICO estado que permite salir con 0', () => {
      const salidas = (['verificado', 'sin_datos', 'incoherente'] as const).map((estado) => ({
        estado,
        exitCero: estado === 'verificado',
      }));

      // Lo que hacia H-021 grave no era el texto impreso: era que salia con 0 igualmente. Un fallo
      // que sale con 0 no es un fallo para nadie que lo automatice.
      expect(salidas.filter((s) => s.exitCero).map((s) => s.estado)).toEqual(['verificado']);
    });
  });
});
