// La excepcion del proyecto, no la de Nest.
import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';

/**
 * PT-092 — El cobro de verificación de una cuenta de PayPal.
 *
 * Se cobra un importe pequeño **con el código de verificación visible para el titular** y se
 * devuelve de inmediato. El cargo prueba las tres cosas a la vez: que la cuenta existe, que
 * opera, y que **es suya** —porque solo el titular puede aprobarlo e iniciar sesión en PayPal—.
 *
 * A diferencia de la CLABE, aquí el dinero **sí vuelve**: el vendedor pagó de su bolsillo y no
 * hay motivo para quedárselo.
 */
describe('PaypalProvider — cobro de verificación (PT-092)', () => {
  const ORIGINAL_ENV = { ...process.env };
  let fetchMock: jest.SpyInstance;
  let record: jest.Mock;
  let provider: PaypalProvider;

  const responder = (...respuestas: Array<{ ok?: boolean; status?: number; body: unknown }>) => {
    const cola = [...respuestas];
    fetchMock.mockImplementation(async () => {
      const r = cola.shift() ?? { ok: true, status: 200, body: {} };
      return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.body } as never;
    });
  };

  const token = { body: { access_token: 'TOKEN-SECRETO', expires_in: 3600 } };

  beforeEach(() => {
    process.env.PAYPAL_CLIENT_ID = 'cid';
    process.env.PAYPAL_CLIENT_SECRET = 'sec';
    process.env.PAYPAL_WEBHOOK_ID = 'wh';
    process.env.PAYPAL_MODE = 'sandbox';
    record = jest.fn().mockResolvedValue(undefined);
    fetchMock = jest.spyOn(global, 'fetch');
    provider = new PaypalProvider({ record } as never);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('X-01: el cobro lleva el código donde el titular puede leerlo', async () => {
    responder(token, {
      status: 201,
      body: {
        id: 'ORD-1',
        status: 'PAYER_ACTION_REQUIRED',
        links: [
          { rel: 'payer-action', href: 'https://sandbox.paypal.com/checkoutnow?token=ORD-1' },
        ],
      },
    });

    await provider.createVerificationCharge('VER-m1', 20, 'A7XMEC');

    const cuerpo = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    const unidad = cuerpo.purchase_units[0];
    // El código tiene que estar en algo que el titular vea, no solo en nuestros registros.
    expect(JSON.stringify(unidad)).toContain('A7XMEC');
  });

  it('X-02: el importe y la moneda son los pedidos', async () => {
    responder(token, {
      status: 201,
      body: { id: 'ORD-1', status: 'CREATED', links: [{ rel: 'approve', href: 'https://x' }] },
    });

    await provider.createVerificationCharge('VER-m1', 20, 'A7XMEC');

    const cuerpo = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(cuerpo.purchase_units[0].amount).toEqual({ currency_code: 'MXN', value: '20.00' });
  });

  it('X-03: devuelve el enlace donde el titular aprueba', async () => {
    responder(token, {
      status: 201,
      body: {
        id: 'ORD-1',
        status: 'PAYER_ACTION_REQUIRED',
        links: [
          { rel: 'payer-action', href: 'https://sandbox.paypal.com/checkoutnow?token=ORD-1' },
        ],
      },
    });

    const r = await provider.createVerificationCharge('VER-m1', 20, 'A7XMEC');

    expect(r.orderId).toBe('ORD-1');
    expect(r.approvalUrl).toContain('checkoutnow');
  });

  it('X-04: el cobro queda en la traza, pero el código NO', async () => {
    // El código es el secreto que prueba la titularidad: en la traza sería regalarlo.
    responder(token, {
      status: 201,
      body: { id: 'ORD-1', status: 'CREATED', links: [{ rel: 'approve', href: 'https://x' }] },
    });

    await provider.createVerificationCharge('VER-m1', 20, 'A7XMEC');

    const registrado = JSON.stringify(record.mock.calls);
    expect(registrado).toContain('VER-m1');
    expect(registrado).not.toContain('A7XMEC');
  });

  // ── La devolución ────────────────────────────────────────────────────

  it('X-05: se devuelve el importe íntegro de la captura', async () => {
    responder(token, { status: 201, body: { id: 'REF-1', status: 'COMPLETED' } });

    const r = await provider.refundCapture('CAP-9', 20, 'Verificacion de cuenta');

    expect(r.refunded).toBe(true);
    expect(r.refundId).toBe('REF-1');
    const cuerpo = JSON.parse(String(fetchMock.mock.calls[1][1].body));
    expect(cuerpo.amount).toEqual({ value: '20.00', currency_code: 'MXN' });
  });

  it('X-06: si la devolución falla NO se lanza — queda para reintentar', async () => {
    // Un fallo de devolución no puede tumbar la verificación ni perder el dinero: se marca
    // pendiente y se reintenta. Misma disciplina que el ciclo de pago de PT-080.
    responder(token, { ok: false, status: 422, body: {} });

    const r = await provider.refundCapture('CAP-9', 20, 'x');

    expect(r.refunded).toBe(false);
    expect(r.error).toBeDefined();
  });

  it('X-07: la devolución también queda en la traza', async () => {
    responder(token, { status: 201, body: { id: 'REF-1', status: 'COMPLETED' } });

    await provider.refundCapture('CAP-9', 20, 'x');

    const pasos = record.mock.calls.map((c) => c[0].step);
    expect(pasos).toContain('REFUND_RAISED');
  });
});
