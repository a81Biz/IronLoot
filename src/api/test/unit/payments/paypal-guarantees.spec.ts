// La excepcion del proyecto, no la de Nest: son clases distintas y el adaptador lanza esta.
import { UnauthorizedException } from '../../../src/common/observability';
import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';

/**
 * PT-087 — PayPal recibe las garantías que PT-080 y PT-086 dieron solo a Mercado Pago.
 *
 * F-06 la traza, F-07 la vía garantizada, F-08 el 401. Aquí se exigen una a una sobre el
 * comportamiento real del adaptador, no sobre su forma.
 */
describe('PaypalProvider — garantías (PT-087)', () => {
  const ORIGINAL_ENV = { ...process.env };
  let record: jest.Mock;
  let provider: PaypalProvider;
  let fetchMock: jest.SpyInstance;

  /** Cada llamada devuelve la siguiente respuesta de la cola. */
  const responder = (...respuestas: Array<{ ok?: boolean; status?: number; body: unknown }>) => {
    const cola = [...respuestas];
    fetchMock.mockImplementation(async () => {
      const r = cola.shift() ?? { ok: true, status: 200, body: {} };
      return {
        ok: r.ok ?? true,
        status: r.status ?? 200,
        json: async () => r.body,
      } as never;
    });
  };

  const token = { body: { access_token: 'TOKEN-SECRETO-PAYPAL', expires_in: 3600 } };
  const paso = (nombre: string) =>
    record.mock.calls.map((c) => c[0]).find((e) => e.step === nombre);

  beforeEach(() => {
    process.env.PAYPAL_CLIENT_ID = 'cid-test';
    process.env.PAYPAL_CLIENT_SECRET = 'sec-test';
    process.env.PAYPAL_WEBHOOK_ID = 'wh-test';
    process.env.PAYPAL_MODE = 'sandbox';

    record = jest.fn().mockResolvedValue(undefined);
    fetchMock = jest.spyOn(global, 'fetch');
    provider = new PaypalProvider({ record } as never);
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  // ── F-06: la traza ───────────────────────────────────────────────────

  it('P-01: crear una orden deja PROVIDER_CREATE con endpoint, estado HTTP y duración', async () => {
    responder(token, {
      status: 201,
      body: {
        id: 'ORDER-1',
        status: 'PAYER_ACTION_REQUIRED',
        links: [
          { rel: 'payer-action', href: 'https://sandbox.paypal.com/checkoutnow?token=ORDER-1' },
        ],
      },
    });

    await provider.createPayment('DEP-u1-1', 321.5, 'MXN', 'Depósito', 'c@test.local');

    const e = paso('PROVIDER_CREATE');
    expect(e).toBeDefined();
    expect(e.provider).toBe('PAYPAL');
    expect(e.reference).toBe('DEP-u1-1');
    expect(e.direction).toBe('OUTBOUND');
    expect(e.endpoint).toContain('/v2/checkout/orders');
    expect(e.httpStatus).toBe(201);
    expect(typeof e.durationMs).toBe('number');
    expect(e.data.response.id).toBe('ORDER-1');
  });

  it('P-02: el token OAuth2 NUNCA llega a la traza', async () => {
    // La redacción vive en PaymentTraceService, pero eso solo protege si el adaptador
    // entrega el dato por ese camino. Aquí se comprueba que no lo cuela por otro.
    responder(token, {
      status: 201,
      body: { id: 'ORDER-1', status: 'CREATED', links: [{ rel: 'approve', href: 'https://x' }] },
    });

    await provider.createPayment('DEP-u1-1', 100, 'MXN', 'd', 'c@test.local');

    const registrado = JSON.stringify(record.mock.calls);
    expect(registrado).not.toContain('TOKEN-SECRETO-PAYPAL');
    expect(registrado).not.toContain('sec-test');
  });

  it('P-03: una firma rechazada deja SIGNATURE_REJECTED en la traza', async () => {
    responder(token, { body: { verification_status: 'FAILURE' } });

    await expect(
      provider.handleWebhook(
        { id: 'WH-1', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'ORDER-1' } } as never,
        cabecerasFirma(),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(paso('SIGNATURE_REJECTED')).toBeDefined();
    expect(paso('SIGNATURE_OK')).toBeUndefined();
  });

  it('P-04: una firma válida deja SIGNATURE_OK', async () => {
    responder(
      token,
      { body: { verification_status: 'SUCCESS' } },
      { body: { id: 'ORDER-1', status: 'COMPLETED' } },
    );

    await provider.handleWebhook(
      { id: 'WH-1', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'ORDER-1' } } as never,
      cabecerasFirma(),
    );

    expect(paso('SIGNATURE_OK')).toBeDefined();
  });

  it('P-05: si la traza falla, el pago sigue adelante', async () => {
    record.mockRejectedValue(new Error('bd caída'));
    responder(token, {
      status: 201,
      body: { id: 'ORDER-1', status: 'CREATED', links: [{ rel: 'approve', href: 'https://x' }] },
    });

    await expect(
      provider.createPayment('DEP-u1-1', 100, 'MXN', 'd', 'c@test.local'),
    ).resolves.toMatchObject({ externalId: 'ORDER-1' });
  });

  // ── F-08: el 401 ─────────────────────────────────────────────────────

  it('P-06: firma inválida ⇒ UnauthorizedException, no Error genérico', async () => {
    responder(token, { body: { verification_status: 'FAILURE' } });

    await expect(
      provider.handleWebhook(
        { id: 'WH-1', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'ORDER-1' } } as never,
        cabecerasFirma(),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('P-07: faltando cabeceras de firma ⇒ también 401', async () => {
    await expect(
      provider.handleWebhook(
        { id: 'WH-1', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'ORDER-1' } } as never,
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  // ── F-07: la vía garantizada ─────────────────────────────────────────

  it('P-08: una orden APROBADA pero sin capturar se captura y se acredita', async () => {
    // Es el caso real observado el 2026-07-27: el comprador aprobó, ninguna notificación
    // llegó, y el dinero quedaría en el limbo sin esto.
    responder(
      token,
      { body: { id: 'ORDER-1', status: 'APPROVED', purchase_units: [{ custom_id: 'DEP-u1-1' }] } },
      {
        body: {
          id: 'ORDER-1',
          status: 'COMPLETED',
          purchase_units: [
            {
              custom_id: 'DEP-u1-1',
              payments: {
                captures: [{ id: 'CAP-9', amount: { value: '321.50', currency_code: 'MXN' } }],
              },
            },
          ],
        },
      },
    );

    const r = await provider.findPayment({ reference: 'DEP-u1-1', providerRef: 'ORDER-1' });

    expect(r).toMatchObject({
      paymentId: 'CAP-9',
      externalId: 'DEP-u1-1',
      status: 'COMPLETED',
      amount: 321.5,
    });
  });

  it('P-09: una orden ya COMPLETADA se devuelve sin volver a capturar', async () => {
    responder(token, {
      body: {
        id: 'ORDER-1',
        status: 'COMPLETED',
        purchase_units: [
          {
            custom_id: 'DEP-u1-1',
            payments: {
              captures: [{ id: 'CAP-9', amount: { value: '321.50', currency_code: 'MXN' } }],
            },
          },
        ],
      },
    });

    const r = await provider.findPayment({ reference: 'DEP-u1-1', providerRef: 'ORDER-1' });

    expect(r?.status).toBe('COMPLETED');
    // token + GET, sin POST de captura
    const captura = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/capture'));
    expect(captura).toBeUndefined();
  });

  it('P-10: una orden que el comprador aún no aprobó NO acredita', async () => {
    responder(token, {
      body: {
        id: 'ORDER-1',
        status: 'PAYER_ACTION_REQUIRED',
        purchase_units: [{ custom_id: 'DEP-u1-1' }],
      },
    });

    await expect(
      provider.findPayment({ reference: 'DEP-u1-1', providerRef: 'ORDER-1' }),
    ).resolves.toBeNull();
  });

  it('P-11: sin id de orden guardado no se puede sondear — devuelve null, no lanza', async () => {
    // Los ciclos abiertos antes de PT-087 tienen provider_ref = NULL.
    await expect(
      provider.findPayment({ reference: 'DEP-viejo-1', providerRef: null }),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('P-12: si PayPal falla al consultar, devuelve null en vez de romper el lote', async () => {
    responder(token, { ok: false, status: 500, body: {} });

    await expect(
      provider.findPayment({ reference: 'DEP-u1-1', providerRef: 'ORDER-1' }),
    ).resolves.toBeNull();
  });

  it('P-13: el sondeo deja constancia en la traza', async () => {
    responder(token, {
      body: {
        id: 'ORDER-1',
        status: 'PAYER_ACTION_REQUIRED',
        purchase_units: [{ custom_id: 'DEP-u1-1' }],
      },
    });

    await provider.findPayment({ reference: 'DEP-u1-1', providerRef: 'ORDER-1' });

    const e = paso('PROVIDER_CONFIRM');
    expect(e).toBeDefined();
    expect(e.endpoint).toContain('/v2/checkout/orders/ORDER-1');
  });

  it('P-14: la llegada de la notificacion queda registrada ANTES de validar la firma (PT-089)', async () => {
    // Mercado Pago lo registraba y PayPal no. Una notificacion rechazada tambien ocurrio: la
    // traza debe decir que llego, no solo que se rechazo.
    responder(token, { body: { verification_status: 'FAILURE' } });

    await expect(
      provider.handleWebhook(
        { id: 'WH-1', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'ORDER-1' } } as never,
        cabecerasFirma(),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const llegada = paso('NOTIFICATION_RECEIVED');
    expect(llegada).toBeDefined();
    expect(llegada.direction).toBe('INBOUND');
    expect(llegada.detail).toBe('CHECKOUT.ORDER.APPROVED');
    // Y va primero: el orden de la traza cuenta la historia.
    const pasos = record.mock.calls.map((c) => c[0].step);
    expect(pasos.indexOf('NOTIFICATION_RECEIVED')).toBeLessThan(
      pasos.indexOf('SIGNATURE_REJECTED'),
    );
  });

  function cabecerasFirma() {
    return {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-transmission-id': 'tid-1',
      'paypal-transmission-time': '2026-07-27T00:00:00Z',
      'paypal-transmission-sig': 'c2ln',
    };
  }
});
