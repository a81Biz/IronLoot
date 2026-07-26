import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';

/**
 * PT-076.2 — Token OAuth2 y checkStatus() del proveedor PayPal (Orders v2).
 *
 * Cubre T-01, T-02 y T-06..T-10 de changes/PT-076-paypal-orders-v2/test-scenarios.md
 * y los criterios de aceptación CA-03 y CA-04.
 *
 * A diferencia de MercadoPago (token estático de entorno), PayPal exige OAuth2
 * client_credentials con un token de vida limitada que hay que cachear y renovar.
 */

const ENV_KEYS = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_WEBHOOK_ID',
  'PAYPAL_MODE',
] as const;

describe('PaypalProvider — OAuth2 y configuración', () => {
  const originalEnv: Record<string, string | undefined> = {};
  let fetchMock: jest.Mock;

  const tokenResponse = (accessToken: string, expiresIn = 32400) => ({
    ok: true,
    status: 200,
    json: async () => ({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
    }),
  });

  const orderResponse = () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: 'ORDER-1',
      status: 'CREATED',
      links: [
        { rel: 'payer-action', href: 'https://sandbox.paypal.com/checkoutnow?token=ORDER-1' },
      ],
    }),
  });

  const unauthorized = () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: 'invalid_token' }),
  });

  const createOrder = (provider: PaypalProvider) =>
    provider.createPayment('DEP-user-1-1700000000', 500, 'MXN', 'Wallet Deposit', 'b@example.com');

  beforeEach(() => {
    ENV_KEYS.forEach((k) => {
      originalEnv[k] = process.env[k];
    });
    process.env.PAYPAL_CLIENT_ID = 'test-client-id';
    process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
    process.env.PAYPAL_WEBHOOK_ID = 'test-webhook-id';
    process.env.PAYPAL_MODE = 'sandbox';

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-25T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
    ENV_KEYS.forEach((k) => {
      if (originalEnv[k] === undefined) delete process.env[k];
      else process.env[k] = originalEnv[k];
    });
  });

  // ── T-01 / T-02 — checkStatus (CA-03) ────────────────────────────────

  describe('checkStatus()', () => {
    it('T-01: devuelve true con clientId, secret y webhookId presentes', () => {
      expect(new PaypalProvider().checkStatus()).toBe(true);
    });

    it.each([['PAYPAL_CLIENT_ID'], ['PAYPAL_CLIENT_SECRET'], ['PAYPAL_WEBHOOK_ID']])(
      'T-02: devuelve false si falta %s',
      (key) => {
        delete process.env[key];
        expect(new PaypalProvider().checkStatus()).toBe(false);
      },
    );

    it('T-02b: no depende de PAYPAL_BUSINESS_EMAIL (obsoleta en Orders v2)', () => {
      delete process.env.PAYPAL_BUSINESS_EMAIL;
      expect(new PaypalProvider().checkStatus()).toBe(true);
    });
  });

  // ── T-06..T-10 — token OAuth2 (CA-04) ────────────────────────────────

  describe('token OAuth2', () => {
    it('T-06: solicita el token contra /v1/oauth2/token con Basic auth y lo usa', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse('token-A'))
        .mockResolvedValueOnce(orderResponse());

      await createOrder(new PaypalProvider());

      const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
      expect(tokenUrl).toBe('https://api-m.sandbox.paypal.com/v1/oauth2/token');
      expect(tokenInit.method).toBe('POST');
      expect(tokenInit.body).toContain('grant_type=client_credentials');

      const expectedBasic = Buffer.from('test-client-id:test-client-secret').toString('base64');
      expect(tokenInit.headers.Authorization).toBe(`Basic ${expectedBasic}`);

      const [, orderInit] = fetchMock.mock.calls[1];
      expect(orderInit.headers.Authorization).toBe('Bearer token-A');
    });

    it('T-07: reutiliza el token cacheado en una segunda llamada dentro de su validez', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse('token-A'))
        .mockResolvedValueOnce(orderResponse())
        .mockResolvedValueOnce(orderResponse());

      const provider = new PaypalProvider();
      await createOrder(provider);
      jest.advanceTimersByTime(60_000);
      await createOrder(provider);

      const tokenCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/v1/oauth2/token'),
      );
      expect(tokenCalls).toHaveLength(1);
    });

    it('T-08: renueva el token de forma proactiva dentro del margen de 60s', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse('token-A', 120))
        .mockResolvedValueOnce(orderResponse())
        .mockResolvedValueOnce(tokenResponse('token-B', 120))
        .mockResolvedValueOnce(orderResponse());

      const provider = new PaypalProvider();
      await createOrder(provider);

      // 70s después: quedan 50s de vida, por debajo del margen de seguridad.
      jest.advanceTimersByTime(70_000);
      await createOrder(provider);

      const tokenCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/v1/oauth2/token'),
      );
      expect(tokenCalls).toHaveLength(2);

      const [, lastOrderInit] = fetchMock.mock.calls[3];
      expect(lastOrderInit.headers.Authorization).toBe('Bearer token-B');
    });

    it('T-09: ante un 401 renueva el token y reintenta una vez', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse('token-A'))
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(tokenResponse('token-B'))
        .mockResolvedValueOnce(orderResponse());

      const result = await createOrder(new PaypalProvider());

      expect(result.redirectUrl).toContain('checkoutnow');
      const [, retriedInit] = fetchMock.mock.calls[3];
      expect(retriedInit.headers.Authorization).toBe('Bearer token-B');
    });

    it('T-10: si el reintento vuelve a dar 401, propaga el error sin bucle', async () => {
      fetchMock
        .mockResolvedValueOnce(tokenResponse('token-A'))
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(tokenResponse('token-B'))
        .mockResolvedValueOnce(unauthorized());

      await expect(createOrder(new PaypalProvider())).rejects.toThrow();

      // Exactamente 4 llamadas: token, intento, token, reintento. Sin tercer intento.
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it('T-10b: usa el host de producción cuando PAYPAL_MODE=production', async () => {
      process.env.PAYPAL_MODE = 'production';
      fetchMock
        .mockResolvedValueOnce(tokenResponse('token-A'))
        .mockResolvedValueOnce(orderResponse());

      await createOrder(new PaypalProvider());

      expect(fetchMock.mock.calls[0][0]).toBe('https://api-m.paypal.com/v1/oauth2/token');
    });
  });
});
