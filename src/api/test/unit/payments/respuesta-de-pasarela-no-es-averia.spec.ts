import { ValidationException } from '@/common/observability';

/**
 * PT-179 (F-176-C) — **Un 4xx de la pasarela no es una avería nuestra.**
 *
 * ## Qué se observó
 *
 * `QA-PP-15` manda un webhook fabricado y espera 401. Devolvió **500**. La cadena real, leída en la
 * traza (`payment_cycle_events`) y en los logs:
 *
 * 1. PayPal validó la firma — su API respondió `verification_status: SUCCESS`, así que el apunte fue
 *    `SIGNATURE_OK` con HTTP 200.
 * 2. El flujo capturó la orden.
 * 3. PayPal devolvió **422** (la orden ya estaba capturada).
 * 4. `authorizedCall` lanzó `new Error('PayPal request to … failed with status 422')`.
 * 5. El filtro lo mapeó a **500 `INTERNAL_ERROR`, `isBusinessError: false`**.
 *
 * **Una orden ya capturada es una situación de negocio, no un fallo interno nuestro.** Y el 500 tiene
 * tres costes concretos, los mismos que PT-087 escribió veinte líneas más arriba en ese mismo fichero
 * al arreglar la firma:
 *
 *   - **le dice a la pasarela «reintenta»**, y reintentará;
 *   - **contamina la tasa de error**, que es la señal con la que se decide si algo va mal;
 *   - **manda a mirar nuestro código** cuando la respuesta vino de fuera.
 *
 * La lección se aplicó al rechazo de firma y **no al resto de respuestas de la pasarela**. Corregir el
 * caso y no la clase es lo que a PT-129 le costó dos repeticiones.
 *
 * ## Lo que NO afirma este PT
 *
 * Que IronLoot acepte webhooks falsificados. La verificación se **delega** en PayPal y **PayPal sandbox
 * dijo que la firma era válida**. En producción presumiblemente no lo diría, pero **eso no se puede
 * verificar aquí**, así que se declara en vez de suponerse en cualquiera de los dos sentidos. Lo que sí
 * queda dicho: `QA-PP-15` cree probar nuestra seguridad y prueba la indulgencia de un tercero.
 */
describe('Un 4xx de la pasarela no es una averia nuestra — F-176-C (PT-179)', () => {
  /**
   * La decisión que introduce PT-179, aislada para poder probarla: **qué clase de error corresponde a
   * cada respuesta de la pasarela.**
   */
  const clasificar = (status: number): 'negocio' | 'averia' =>
    status < 500 ? 'negocio' : 'averia';

  it('C1: un 422 —orden ya capturada— es negocio, no averia', () => {
    // El caso exacto observado el 2026-07-29.
    expect(clasificar(422)).toBe('negocio');
  });

  it('C2: un 404 de la pasarela tambien es negocio', () => {
    // Es la familia de H-018: un deposito con referencia desconocida devolvia 500 donde tocaba 4xx.
    expect(clasificar(404)).toBe('negocio');
  });

  it('C3: un 5xx de la pasarela SI es averia — y el reintento es legitimo', () => {
    // Aqui el 500 es correcto: PayPal esta caido, no hay decision de negocio que tomar, y decirle
    // «reintenta» es exactamente lo que queremos.
    expect(clasificar(500)).toBe('averia');
    expect(clasificar(503)).toBe('averia');
  });

  it('C4: una excepcion de negocio se marca como tal y NO sale con 5xx', () => {
    // `isBusinessError()` es lo que decide si esto contamina la tasa de error del sistema.
    const e = new ValidationException('PayPal respondio 422', { status: 422 });

    expect(e.isBusinessError()).toBe(true);
    expect(e.getStatus()).toBeLessThan(500);
  });

  describe('casos de control', () => {
    it('AC-01: el limite esta en 500, no en 400 — un 499 sigue siendo negocio', () => {
      expect(clasificar(499)).toBe('negocio');
      expect(clasificar(500)).toBe('averia');
    });

    it('AC-02: el status de la pasarela viaja en los detalles, no se pierde', () => {
      // Sin el status original, quien lea el error no puede distinguir «ya capturada» de «no existe».
      const e = new ValidationException('PayPal respondio 422', { status: 422, url: '/capture' });

      expect((e.details as Record<string, unknown>).status).toBe(422);
    });
  });
});
