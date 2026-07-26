import { MercadoPagoProvider } from '../../../src/modules/payments/providers/mercadopago.provider';

/**
 * PT-080.3 / PT-080.4 — Entrada de notificaciones de Mercado Pago.
 *
 * Cubre A-01..A-16 de changes/PT-080-payment-cycle/test-scenarios.md.
 *
 * Mercado Pago documenta DOS formatos sobre la misma URL:
 *   - Webhooks: query `data.id`, cuerpo {id,type,action,data:{id}}, firma validable.
 *   - IPN:      query `topic` + `id`, sin `data.id`, firma NO validable con el secret.
 *
 * Y `data.id` significa cosas distintas segun el topic, con endpoint de confirmacion
 * distinto para cada uno. El discriminador es el TOPIC, no la forma del identificador
 * (el adaptador anterior enrutaba con /^(ORD|PAY)/i y mandaba ids PAY... a /v1/orders,
 * que responde 400 — verificado contra la API real).
 */

const SECRET = 'test-webhook-secret';
const REFERENCE = 'DEP-08b22a46-49a4-4ece-a8ff-021cce24ed70-1784948505855';
const CANONICAL = '169718720683';

describe('MercadoPagoProvider — entrada de notificaciones (PT-080)', () => {
  let fetchMock: jest.Mock;
  const originalEnv: Record<string, string | undefined> = {};
  const ENV_KEYS = ['MERCADO_PAGO_ACCESS_TOKEN', 'MERCADO_PAGO_WEBHOOK_SECRET'] as const;

  const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json });
  const notFound = () => ({ ok: false, status: 404, json: async () => ({ message: 'not found' }) });

  const paymentDoc = (overrides: Record<string, unknown> = {}) => ({
    id: Number(CANONICAL),
    status: 'approved',
    external_reference: REFERENCE,
    transaction_amount: 250,
    ...overrides,
  });

  const orderDoc = () => ({
    id: 'ORDTST01KYEDNWKHXHCS58ZPA3GESWMT',
    status: 'processed',
    external_reference: REFERENCE,
  });

  const searchDoc = (results: unknown[]) => ({ results });

  /** Cabeceras del formato Webhooks, con firma valida sobre el manifiesto de MP. */
  const signedHeaders = (resourceId: string): Record<string, string> => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    const ts = '1700000000';
    const requestId = 'req-1';
    const manifest = `id:${resourceId};request-id:${requestId};ts:${ts};`;
    const hash = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
    return { 'x-signature': `ts=${ts},v1=${hash}`, 'x-request-id': requestId };
  };

  const webhookQuery = (resourceId: string) => ({ 'data.id': resourceId });
  const webhookBody = (type: string, resourceId: string) => ({
    id: 1,
    type,
    action: `${type}.updated`,
    data: { id: resourceId },
  });

  const ipnQuery = (topic: string, id: string) => ({ topic, id });

  /** Encuentra la llamada a un endpoint concreto. */
  const calledWith = (fragment: string) =>
    fetchMock.mock.calls.find(([url]) => String(url).includes(fragment));

  beforeEach(() => {
    ENV_KEYS.forEach((k) => {
      originalEnv[k] = process.env[k];
    });
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'test-access-token';
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;

    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    ENV_KEYS.forEach((k) => {
      if (originalEnv[k] === undefined) delete process.env[k];
      else process.env[k] = originalEnv[k];
    });
  });

  // ── A-01..A-06 — formatos y validacion por formato ───────────────────

  it('A-01: procesa una notificacion en formato IPN (topic + id, sin data.id)', async () => {
    fetchMock.mockResolvedValueOnce(ok(paymentDoc()));

    const result = await new MercadoPagoProvider().handleWebhook(
      { topic: 'payment', id: CANONICAL },
      {},
      ipnQuery('payment', CANONICAL),
    );

    expect(result).toMatchObject({
      paymentId: CANONICAL,
      externalId: REFERENCE,
      status: 'COMPLETED',
      amount: 250,
    });
  });

  it('A-02: procesa una notificacion en formato Webhooks firmada', async () => {
    fetchMock.mockResolvedValueOnce(ok(paymentDoc()));

    const result = await new MercadoPagoProvider().handleWebhook(
      webhookBody('payment', CANONICAL),
      signedHeaders(CANONICAL),
      webhookQuery(CANONICAL),
    );

    expect(result).toMatchObject({ paymentId: CANONICAL, status: 'COMPLETED' });
  });

  it('A-03: firma invalida en formato Webhooks se rechaza con 401', async () => {
    await expect(
      new MercadoPagoProvider().handleWebhook(
        webhookBody('payment', CANONICAL),
        { 'x-signature': 'ts=1700000000,v1=firmafalsa', 'x-request-id': 'req-1' },
        webhookQuery(CANONICAL),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('A-04: faltan cabeceras de firma en formato Webhooks -> 401', async () => {
    await expect(
      new MercadoPagoProvider().handleWebhook(
        webhookBody('payment', CANONICAL),
        {},
        webhookQuery(CANONICAL),
      ),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('A-05: en IPN el importe sale de la API, nunca del payload', async () => {
    // El payload miente: dice 999999. La API dice 250. Debe ganar la API.
    fetchMock.mockResolvedValueOnce(ok(paymentDoc()));

    const result = await new MercadoPagoProvider().handleWebhook(
      { topic: 'payment', id: CANONICAL, transaction_amount: 999999, status: 'approved' },
      {},
      ipnQuery('payment', CANONICAL),
    );

    expect(result!.amount).toBe(250);
  });

  it('A-06: IPN cuyo pago no esta aprobado no se marca como completado', async () => {
    fetchMock.mockResolvedValueOnce(ok(paymentDoc({ status: 'rejected' })));

    const result = await new MercadoPagoProvider().handleWebhook(
      { topic: 'payment', id: CANONICAL },
      {},
      ipnQuery('payment', CANONICAL),
    );

    expect(result!.status).not.toBe('COMPLETED');
  });

  // ── A-07..A-09 — topics ──────────────────────────────────────────────

  it('A-07: topic merchant_order se confirma en /merchant_orders', async () => {
    fetchMock
      .mockResolvedValueOnce(ok({ id: 'MO-1', external_reference: REFERENCE }))
      .mockResolvedValueOnce(ok(searchDoc([paymentDoc()])));

    await new MercadoPagoProvider().handleWebhook(
      { topic: 'merchant_order', id: 'MO-1' },
      {},
      ipnQuery('merchant_order', 'MO-1'),
    );

    expect(calledWith('/merchant_orders/MO-1')).toBeDefined();
  });

  it('A-08: un id PAY... NUNCA se consulta contra /v1/orders', async () => {
    fetchMock.mockResolvedValue(ok(searchDoc([paymentDoc()])));

    await new MercadoPagoProvider()
      .handleWebhook(
        webhookBody('payment', 'PAY01KYEDNWM3EHE6WWKPJ4228D91'),
        signedHeaders('PAY01KYEDNWM3EHE6WWKPJ4228D91'),
        webhookQuery('PAY01KYEDNWM3EHE6WWKPJ4228D91'),
      )
      .catch(() => undefined);

    const badCall = fetchMock.mock.calls.find(([url]) => /\/v1\/orders\/PAY/i.test(String(url)));
    expect(badCall).toBeUndefined();
  });

  it('A-09: un topic desconocido se ignora sin acreditar', async () => {
    const result = await new MercadoPagoProvider().handleWebhook(
      { topic: 'chargebacks', id: 'CB-1' },
      {},
      ipnQuery('chargebacks', 'CB-1'),
    );

    expect(result).toBeNull();
  });

  // ── A-12..A-16 — identificador canonico ──────────────────────────────

  it('A-12: topic payment usa el id recibido como canonico, sin consulta extra', async () => {
    fetchMock.mockResolvedValueOnce(ok(paymentDoc()));

    const result = await new MercadoPagoProvider().handleWebhook(
      { topic: 'payment', id: CANONICAL },
      {},
      ipnQuery('payment', CANONICAL),
    );

    expect(result!.paymentId).toBe(CANONICAL);
    expect(calledWith('/v1/payments/search')).toBeUndefined();
  });

  it('A-13: topic order resuelve el pago canonico por external_reference', async () => {
    fetchMock
      .mockResolvedValueOnce(ok(orderDoc()))
      .mockResolvedValueOnce(ok(searchDoc([paymentDoc()])));

    const result = await new MercadoPagoProvider().handleWebhook(
      { topic: 'order', id: orderDoc().id },
      {},
      ipnQuery('order', orderDoc().id),
    );

    expect(calledWith('/v1/payments/search')).toBeDefined();
    expect(result!.paymentId).toBe(CANONICAL);
  });

  it('A-14: el MISMO pago por orden y por pago produce la MISMA clave', async () => {
    // Via orden
    fetchMock
      .mockResolvedValueOnce(ok(orderDoc()))
      .mockResolvedValueOnce(ok(searchDoc([paymentDoc()])));
    const viaOrder = await new MercadoPagoProvider().handleWebhook(
      { topic: 'order', id: orderDoc().id },
      {},
      ipnQuery('order', orderDoc().id),
    );

    // Via pago
    fetchMock.mockResolvedValueOnce(ok(paymentDoc()));
    const viaPayment = await new MercadoPagoProvider().handleWebhook(
      { topic: 'payment', id: CANONICAL },
      {},
      ipnQuery('payment', CANONICAL),
    );

    expect(viaOrder!.paymentId).toBe(viaPayment!.paymentId);
  });

  it('A-15: varios pagos aprobados bajo la misma referencia es una anomalia', async () => {
    fetchMock
      .mockResolvedValueOnce(ok(orderDoc()))
      .mockResolvedValueOnce(ok(searchDoc([paymentDoc(), paymentDoc({ id: 999999999 })])));

    await expect(
      new MercadoPagoProvider().handleWebhook(
        { topic: 'order', id: orderDoc().id },
        {},
        ipnQuery('order', orderDoc().id),
      ),
    ).rejects.toThrow(/anomal/i);
  });

  it('A-16: si la busqueda no encuentra pago, no acredita', async () => {
    fetchMock.mockResolvedValueOnce(ok(orderDoc())).mockResolvedValueOnce(ok(searchDoc([])));

    const result = await new MercadoPagoProvider().handleWebhook(
      { topic: 'order', id: orderDoc().id },
      {},
      ipnQuery('order', orderDoc().id),
    );

    expect(result).toBeNull();
  });

  it('A-16b: si la API responde 404, no acredita', async () => {
    fetchMock.mockResolvedValueOnce(notFound());

    const result = await new MercadoPagoProvider()
      .handleWebhook({ topic: 'payment', id: CANONICAL }, {}, ipnQuery('payment', CANONICAL))
      .catch(() => null);

    expect(result).toBeNull();
  });
});
