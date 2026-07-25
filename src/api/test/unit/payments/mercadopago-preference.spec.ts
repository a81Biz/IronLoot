const mockCreate = jest.fn();
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn().mockImplementation(() => ({})),
  Preference: jest.fn().mockImplementation(() => ({ create: mockCreate })),
  Payment: jest.fn().mockImplementation(() => ({ get: jest.fn() })),
  PaymentMethod: jest.fn().mockImplementation(() => ({ get: jest.fn() })),
}));

import { MercadoPagoProvider } from '../../../src/modules/payments/providers/mercadopago.provider';

/**
 * PT-065 (BUG) — Provider MercadoPago:
 *  #3 con credenciales de prueba debe devolver sandbox_init_point (no el init_point productivo).
 *  #1 la preferencia debe incluir notification_url cuando MERCADO_PAGO_NOTIFICATION_URL está configurado.
 */
describe('MercadoPagoProvider.createPayment (PT-065)', () => {
  const OLD = { ...process.env };
  beforeEach(() => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token';
    mockCreate.mockReset().mockResolvedValue({
      id: 'pref-1',
      init_point: 'https://www.mercadopago.com.mx/prod',
      sandbox_init_point: 'https://sandbox.mercadopago.com.mx/sbx',
    });
  });
  afterEach(() => {
    process.env = { ...OLD };
  });

  it('#3 usa sandbox_init_point cuando MERCADO_PAGO_SANDBOX=true', async () => {
    process.env.MERCADO_PAGO_SANDBOX = 'true';
    const provider = new MercadoPagoProvider();
    const res = await provider.createPayment('DEP-u-1', 500, 'MXN', 'Wallet Deposit', 'a@b.com');
    expect(res.redirectUrl).toBe('https://sandbox.mercadopago.com.mx/sbx');
  });

  it('#3 usa init_point (productivo) cuando SANDBOX no está', async () => {
    delete process.env.MERCADO_PAGO_SANDBOX;
    const provider = new MercadoPagoProvider();
    const res = await provider.createPayment('DEP-u-1', 500, 'MXN', 'Wallet Deposit', 'a@b.com');
    expect(res.redirectUrl).toBe('https://www.mercadopago.com.mx/prod');
  });

  it('#1 incluye notification_url en la preferencia cuando está configurado', async () => {
    process.env.MERCADO_PAGO_NOTIFICATION_URL =
      'https://tunnel.example/api/v1/payments/webhook/MERCADO_PAGO';
    const provider = new MercadoPagoProvider();
    await provider.createPayment('DEP-u-1', 500, 'MXN', 'Wallet Deposit', 'a@b.com');
    const body = mockCreate.mock.calls[0][0].body;
    expect(body.notification_url).toBe(
      'https://tunnel.example/api/v1/payments/webhook/MERCADO_PAGO',
    );
  });
});
