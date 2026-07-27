// La excepcion del proyecto, no la de Nest: son clases distintas y el adaptador lanza esta.
import { UnauthorizedException } from '../../../src/common/observability';
import {
  PaymentProviderRegistry,
  PAYMENT_PROVIDERS,
} from '../../../src/modules/payments/payment-provider.registry';
import { PaymentProvider } from '../../../src/modules/payments/interfaces';
import { MercadoPagoProvider } from '../../../src/modules/payments/providers/mercadopago.provider';
import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';
import { StripeProvider } from '../../../src/modules/payments/providers/stripe.provider';
import { HeyBancoProvider } from '../../../src/modules/payments/providers/heybanco.provider';

/**
 * PT-087 — Las garantías son del registro, no de un proveedor.
 *
 * PT-080 y PT-086 dieron a Mercado Pago traza, vía garantizada y rechazo con 401. PayPal quedó
 * sin las tres, y nadie lo detectó porque no había ninguna prueba que las exigiera **a todos**.
 *
 * Esta suite recorre cada adaptador registrado. Añadir una pasarela nueva la incorpora
 * automáticamente: si no cumple, esta prueba falla antes de que llegue a producción.
 */
describe('Garantías exigibles a todo proveedor registrado (PT-087)', () => {
  const ORIGINAL_ENV = { ...process.env };

  /** Con todas las credenciales presentes, para que `checkStatus()` no descarte a nadie. */
  beforeEach(() => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-test-token';
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = 'secreto-de-prueba';
    process.env.PAYPAL_CLIENT_ID = 'cid-test';
    process.env.PAYPAL_CLIENT_SECRET = 'sec-test';
    process.env.PAYPAL_WEBHOOK_ID = 'wh-test';
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  /** Stripe lee su configuración por `ConfigService`; aquí basta con que no encuentre nada. */
  const configStub = { get: () => undefined } as never;

  const build = () =>
    new PaymentProviderRegistry([
      new MercadoPagoProvider(),
      new PaypalProvider(),
      new StripeProvider(configStub),
      new HeyBancoProvider(),
    ] as never);

  it('G-01: el token de inyección existe y el registro los resuelve por clave', () => {
    expect(PAYMENT_PROVIDERS).toBeDefined();
    const registry = build();
    for (const provider of registry.all()) {
      expect(registry.resolve(provider.key)).toBe(provider);
    }
  });

  describe('G-02: una firma inválida se rechaza con 401, nunca con 500', () => {
    // Un rechazo de seguridad no es una avería interna. Devolver 500 contamina la tasa de
    // error y le dice a la pasarela «vuelve a intentarlo». Mercado Pago ya lo hacía bien
    // (PT-080, hallazgo F-05); PayPal seguía lanzando `Error` genérico (F-08).
    const conFirma: Array<{
      key: string;
      make: () => PaymentProvider;
      payload: unknown;
      headers: Record<string, string>;
      query: Record<string, string>;
    }> = [
      {
        key: 'MERCADO_PAGO',
        make: (): PaymentProvider => new MercadoPagoProvider(),
        payload: { type: 'payment', data: { id: '123' } },
        headers: { 'x-signature': 'ts=1,v1=firma-falsa', 'x-request-id': 'req-1' },
        query: { 'data.id': '123', type: 'payment' },
      },
      {
        key: 'PAYPAL',
        make: (): PaymentProvider => new PaypalProvider(),
        payload: {
          id: 'WH-FALSO',
          event_type: 'CHECKOUT.ORDER.APPROVED',
          resource: { id: 'ORDER-1' },
        },
        headers: {
          'paypal-auth-algo': 'SHA256withRSA',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
          'paypal-transmission-id': 'falso-1',
          'paypal-transmission-time': '2026-07-27T00:00:00Z',
          'paypal-transmission-sig': 'ZmFsc2E=',
        },
        query: {},
      },
    ];

    it.each(conFirma)('$key rechaza con UnauthorizedException', async (caso) => {
      // La pasarela responde que la firma NO es válida (PayPal); Mercado Pago la valida en local.
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'tok',
          expires_in: 3600,
          verification_status: 'FAILURE',
        }),
      } as never);

      const provider = caso.make();

      await expect(
        provider.handleWebhook(caso.payload as never, caso.headers, caso.query),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  it('G-03: si un proveedor declara vía garantizada, devuelve null cuando no hay pago — no lanza', async () => {
    // El reconciliador recorre todos los ciclos abiertos. Un adaptador que lance ante
    // «no encontrado» convertiría un caso normal en un fallo del lote.
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'tok', expires_in: 3600, results: [] }),
    } as never);

    const conVia = build()
      .all()
      .filter((p) => typeof p.findPayment === 'function');

    // No es opcional que existan: los dos proveedores verificables deben tenerla.
    expect(conVia.map((p) => p.key).sort()).toEqual(['MERCADO_PAGO', 'PAYPAL']);

    for (const provider of conVia) {
      await expect(
        provider.findPayment!({ reference: 'DEP-inexistente-1', providerRef: 'NO-EXISTE' }),
      ).resolves.toBeNull();
    }
  });

  it('G-04: todo proveedor con configuración completa se ofrece al usuario', () => {
    const disponibles = build().availableKeys();
    expect(disponibles).toContain('MERCADO_PAGO');
    expect(disponibles).toContain('PAYPAL');
  });

  it('G-05: sin sus credenciales, un proveedor NO se ofrece', () => {
    delete process.env.PAYPAL_CLIENT_SECRET;
    expect(build().availableKeys()).not.toContain('PAYPAL');
  });
});
