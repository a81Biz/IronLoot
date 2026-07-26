import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';

/**
 * PT-076.3 — createPayment() sobre Orders v2.
 *
 * Cubre T-11..T-17 de changes/PT-076-paypal-orders-v2/test-scenarios.md
 * y los criterios CA-05, CA-06, CA-13 y CA-14.
 */

const REFERENCE = 'DEP-3f8a1c2e-9b4d-4e7a-8c1f-2d5e6a7b8c9d-1700000000';

describe('PaypalProvider — createPayment (Orders v2)', () => {
  let fetchMock: jest.Mock;
  const originalEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_WEBHOOK_ID',
    'PAYPAL_MODE',
    'CLIENT_URL',
  ] as const;

  const tokenResponse = () => ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'token-A', expires_in: 32400 }),
  });

  const orderResponseWith = (links: Array<{ rel: string; href: string }>) => ({
    ok: true,
    status: 200,
    json: async () => ({ id: 'ORDER-XYZ', status: 'CREATED', links }),
  });

  /** Devuelve el cuerpo JSON con el que se llamó a /v2/checkout/orders. */
  const orderRequestBody = () => JSON.parse(fetchMock.mock.calls[1][1].body);
  const orderRequestInit = () => fetchMock.mock.calls[1][1];

  beforeEach(() => {
    ENV_KEYS.forEach((k) => {
      originalEnv[k] = process.env[k];
    });
    process.env.PAYPAL_CLIENT_ID = 'test-client-id';
    process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
    process.env.PAYPAL_WEBHOOK_ID = 'test-webhook-id';
    process.env.PAYPAL_MODE = 'sandbox';
    delete process.env.CLIENT_URL;

    fetchMock = jest.fn().mockResolvedValueOnce(tokenResponse());
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (originalEnv[k] === undefined) delete process.env[k];
      else process.env[k] = originalEnv[k];
    });
  });

  const withApproveLink = (rel = 'payer-action') =>
    fetchMock.mockResolvedValueOnce(
      orderResponseWith([
        { rel: 'self', href: 'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-XYZ' },
        { rel, href: 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER-XYZ' },
      ]),
    );

  const create = (amount = 500) =>
    new PaypalProvider().createPayment(REFERENCE, amount, 'MXN', 'Wallet Deposit', 'b@example.com');

  it('T-11: crea la orden con intent=CAPTURE, MXN e importe con dos decimales', async () => {
    withApproveLink();
    await create(500);

    expect(String(fetchMock.mock.calls[1][0])).toBe(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
    );

    const body = orderRequestBody();
    expect(body.intent).toBe('CAPTURE');
    expect(body.purchase_units).toHaveLength(1);
    expect(body.purchase_units[0].amount).toEqual({ currency_code: 'MXN', value: '500.00' });
  });

  it('T-11b: formatea correctamente importes con decimales', async () => {
    withApproveLink();
    await create(99.99);
    expect(orderRequestBody().purchase_units[0].amount.value).toBe('99.99');
  });

  it('T-12: propaga la referencia del depósito en custom_id', async () => {
    withApproveLink();
    await create();
    expect(orderRequestBody().purchase_units[0].custom_id).toBe(REFERENCE);
  });

  it('T-13: envía la cabecera de idempotencia PayPal-Request-Id', async () => {
    withApproveLink();
    await create();
    expect(orderRequestInit().headers['PayPal-Request-Id']).toBe(REFERENCE);
  });

  it('T-14: resuelve el enlace de aprobación con rel="payer-action"', async () => {
    withApproveLink('payer-action');
    const result = await create();
    expect(result.redirectUrl).toBe('https://www.sandbox.paypal.com/checkoutnow?token=ORDER-XYZ');
    expect(result.externalId).toBe('ORDER-XYZ');
  });

  it('T-15: resuelve el enlace de aprobación con rel="approve" (formato antiguo)', async () => {
    withApproveLink('approve');
    const result = await create();
    expect(result.redirectUrl).toBe('https://www.sandbox.paypal.com/checkoutnow?token=ORDER-XYZ');
  });

  it('T-16: lanza error explícito si no hay enlace de aprobación', async () => {
    fetchMock.mockResolvedValueOnce(
      orderResponseWith([
        { rel: 'self', href: 'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER-XYZ' },
      ]),
    );
    await expect(create()).rejects.toThrow(/approval|aprobación/i);
  });

  it('T-17: las URLs de retorno apuntan a CLIENT (5175), nunca al eliminado 5173', async () => {
    withApproveLink();
    await create();

    const ctx = orderRequestBody().payment_source?.paypal?.experience_context ?? {};
    const urls = `${ctx.return_url ?? ''} ${ctx.cancel_url ?? ''}`;

    expect(urls).toContain('5175');
    expect(urls).not.toContain('5173');
  });

  it('T-17b: respeta CLIENT_URL cuando está definida', async () => {
    process.env.CLIENT_URL = 'https://client.ironloot.local';
    withApproveLink();
    await create();

    const ctx = orderRequestBody().payment_source.paypal.experience_context;
    expect(ctx.return_url).toContain('https://client.ironloot.local');
    expect(ctx.cancel_url).toContain('https://client.ironloot.local');
  });

  it('T-17c: informa isIntegrated=true cuando el proveedor está configurado', async () => {
    withApproveLink();
    const result = await create();
    expect(result.isIntegrated).toBe(true);
  });
});
