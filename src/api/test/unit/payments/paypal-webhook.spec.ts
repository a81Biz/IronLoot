import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';

/**
 * PT-076.4 — handleWebhook(): verificación de firma, despacho por evento y captura.
 *
 * Cubre T-18..T-25 de changes/PT-076-paypal-orders-v2/test-scenarios.md
 * y los criterios CA-07, CA-08, CA-11 y CA-13.
 *
 * Decisión AD-01 del design.md: la captura de Orders v2 ocurre **dentro** del webhook
 * CHECKOUT.ORDER.APPROVED, para no alterar la interfaz compartida PaymentProvider.
 */

const REFERENCE = 'DEP-3f8a1c2e-9b4d-4e7a-8c1f-2d5e6a7b8c9d-1700000000';

const WEBHOOK_HEADERS = {
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
  'paypal-transmission-id': 'db49fb10-1343-11ef-ac58-e32457403f67',
  'paypal-transmission-sig': 'ZGVtby1zaWduYXR1cmU=',
  'paypal-transmission-time': '2026-07-25T05:19:23Z',
};

const approvedEvent = () => ({
  id: 'WH-APPROVED-1',
  event_type: 'CHECKOUT.ORDER.APPROVED',
  resource: { id: 'ORDER-XYZ', status: 'APPROVED' },
});

const captureCompletedEvent = (value = '500.00') => ({
  id: 'WH-CAPTURE-1',
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  resource: {
    id: 'CAPTURE-123',
    status: 'COMPLETED',
    custom_id: REFERENCE,
    amount: { currency_code: 'MXN', value },
  },
});

describe('PaypalProvider — handleWebhook (Orders v2)', () => {
  let fetchMock: jest.Mock;
  const originalEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_WEBHOOK_ID',
    'PAYPAL_MODE',
  ] as const;

  const tokenResponse = () => ({
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'token-A', expires_in: 32400 }),
  });

  const verification = (status: 'SUCCESS' | 'FAILURE') => ({
    ok: true,
    status: 200,
    json: async () => ({ verification_status: status }),
  });

  const captureResponse = (ok = true) => ({
    ok,
    status: ok ? 201 : 500,
    json: async () => ({ id: 'CAPTURE-123', status: ok ? 'COMPLETED' : 'FAILED' }),
  });

  /** Encuentra la llamada a un endpoint concreto entre las hechas al fetch simulado. */
  const callTo = (fragment: string) =>
    fetchMock.mock.calls.find(([url]) => String(url).includes(fragment));

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
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (originalEnv[k] === undefined) delete process.env[k];
      else process.env[k] = originalEnv[k];
    });
  });

  // ── Verificación de firma (CA-08, CA-11) ─────────────────────────────

  it('T-18: verifica la firma contra PayPal con las cabeceras y el webhook_id', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(verification('SUCCESS'));

    const event = captureCompletedEvent();
    await new PaypalProvider().handleWebhook(event, WEBHOOK_HEADERS);

    const [url, init] = callTo('/v1/notifications/verify-webhook-signature')!;
    expect(String(url)).toBe(
      'https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature',
    );

    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      auth_algo: WEBHOOK_HEADERS['paypal-auth-algo'],
      cert_url: WEBHOOK_HEADERS['paypal-cert-url'],
      transmission_id: WEBHOOK_HEADERS['paypal-transmission-id'],
      transmission_sig: WEBHOOK_HEADERS['paypal-transmission-sig'],
      transmission_time: WEBHOOK_HEADERS['paypal-transmission-time'],
      webhook_id: 'test-webhook-id',
    });
    expect(body.webhook_event).toEqual(event);
  });

  it('T-19: rechaza el webhook si la verificación devuelve FAILURE', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(verification('FAILURE'));

    await expect(
      new PaypalProvider().handleWebhook(captureCompletedEvent(), WEBHOOK_HEADERS),
    ).rejects.toThrow(/signature/i);
  });

  it('T-20: rechaza sin llamar a PayPal si falta alguna cabecera PAYPAL-*', async () => {
    const incomplete: Record<string, string> = { ...WEBHOOK_HEADERS };
    delete incomplete['paypal-transmission-sig'];

    await expect(
      new PaypalProvider().handleWebhook(captureCompletedEvent(), incomplete),
    ).rejects.toThrow(/header/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('T-21: rechaza si PAYPAL_WEBHOOK_ID no está configurado', async () => {
    delete process.env.PAYPAL_WEBHOOK_ID;

    await expect(
      new PaypalProvider().handleWebhook(captureCompletedEvent(), WEBHOOK_HEADERS),
    ).rejects.toThrow(/PAYPAL_WEBHOOK_ID/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── Despacho y captura (CA-07, AD-01) ────────────────────────────────

  it('T-22: CHECKOUT.ORDER.APPROVED dispara la captura y no acredita todavía', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(verification('SUCCESS'))
      .mockResolvedValueOnce(captureResponse());

    const result = await new PaypalProvider().handleWebhook(approvedEvent(), WEBHOOK_HEADERS);

    const captureCall = callTo('/v2/checkout/orders/ORDER-XYZ/capture');
    expect(captureCall).toBeDefined();
    expect(captureCall![1].method).toBe('POST');

    // La acreditación llega con PAYMENT.CAPTURE.COMPLETED, no aquí.
    expect(result).toBeNull();
  });

  it('T-23: si la captura falla, propaga el error para que PayPal reintente', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(verification('SUCCESS'))
      .mockResolvedValueOnce(captureResponse(false));

    await expect(
      new PaypalProvider().handleWebhook(approvedEvent(), WEBHOOK_HEADERS),
    ).rejects.toThrow();
  });

  it('T-24: PAYMENT.CAPTURE.COMPLETED devuelve el resultado con importe y referencia', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(verification('SUCCESS'));

    const result = await new PaypalProvider().handleWebhook(
      captureCompletedEvent('500.00'),
      WEBHOOK_HEADERS,
    );

    expect(result).toMatchObject({
      paymentId: 'CAPTURE-123',
      externalId: REFERENCE,
      status: 'COMPLETED',
      amount: 500,
    });
  });

  it('T-24b: preserva los decimales del importe', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(verification('SUCCESS'));

    const result = await new PaypalProvider().handleWebhook(
      captureCompletedEvent('99.99'),
      WEBHOOK_HEADERS,
    );

    expect(result!.amount).toBe(99.99);
  });

  it('T-24c: expone el id del evento para la deduplicación aguas arriba', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(verification('SUCCESS'));

    const result = await new PaypalProvider().handleWebhook(
      captureCompletedEvent(),
      WEBHOOK_HEADERS,
    );

    expect(result!.eventId).toBe('WH-CAPTURE-1');
  });

  it('T-25: un evento no suscrito se ignora sin acreditar', async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(verification('SUCCESS'));

    const result = await new PaypalProvider().handleWebhook(
      { id: 'WH-DENIED-1', event_type: 'PAYMENT.CAPTURE.DENIED', resource: { id: 'CAPTURE-9' } },
      WEBHOOK_HEADERS,
    );

    expect(result).toBeNull();
  });
});
