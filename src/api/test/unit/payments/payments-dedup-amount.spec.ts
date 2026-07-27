import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { PaymentCycleService } from '../../../src/modules/payments/payment-cycle.service';
import { PaymentTraceService } from '../../../src/modules/payments/payment-trace.service';
import { PaymentProviderRegistry } from '../../../src/modules/payments/payment-provider.registry';
import { MercadoPagoProvider } from '../../../src/modules/payments/providers/mercadopago.provider';
import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';
import { StripeProvider } from '../../../src/modules/payments/providers/stripe.provider';
import { HeyBancoProvider } from '../../../src/modules/payments/providers/heybanco.provider';
import { PrismaService } from '../../../src/database/prisma.service';
import { WalletService } from '../../../src/modules/wallet/wallet.service';
import { StructuredLogger } from '../../../src/common/observability';

/**
 * PaymentsService — disponibilidad de proveedores, extracción de importe y deduplicación.
 *
 * PT-076 introdujo la extracción de importe normalizada y la disponibilidad derivada de
 * configuración. PT-078 cambió la clave de deduplicación de identificador de notificación
 * a identificador de pago y la extendió a los cuatro proveedores.
 *
 * T-27, T-28 y D-18 son **guardas de regresión**: verifican que Mercado Pago y Stripe
 * conservan exactamente su extracción histórica de importe desde `metadata`.
 */

const UUID = '08b22a46-49a4-4ece-a8ff-021cce24ed70';
const REFERENCE = `DEP-${UUID}-1784948505855`;

/** Error de violación de restricción única tal y como lo emite Prisma. */
const uniqueViolation = (): Error & { code: string } =>
  Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

describe('PaymentsService — importe, disponibilidad y deduplicación', () => {
  let service: PaymentsService;
  let walletDeposit: jest.Mock;
  let eventCreate: jest.Mock;
  let eventDelete: jest.Mock;
  let providerStatus: Record<string, jest.Mock>;
  let handlers: Record<string, jest.Mock>;

  beforeEach(async () => {
    walletDeposit = jest.fn().mockResolvedValue({});
    eventCreate = jest.fn().mockResolvedValue({});
    eventDelete = jest.fn().mockResolvedValue({});

    providerStatus = {
      mp: jest.fn().mockReturnValue(true),
      paypal: jest.fn().mockReturnValue(true),
      stripe: jest.fn().mockReturnValue(false),
      heybanco: jest.fn().mockReturnValue(false),
    };

    handlers = {
      mp: jest.fn().mockResolvedValue(null),
      paypal: jest.fn().mockResolvedValue(null),
      stripe: jest.fn().mockResolvedValue(null),
      heybanco: jest.fn().mockResolvedValue(null),
    };

    const logger = {
      child: jest.fn().mockReturnThis(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const providerMock = (key: string) => ({
      handleWebhook: handlers[key],
      createPayment: jest.fn(),
      verifyPayment: jest.fn(),
      checkStatus: providerStatus[key],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: MercadoPagoProvider, useValue: providerMock('mp') },
        { provide: PaypalProvider, useValue: providerMock('paypal') },
        { provide: StripeProvider, useValue: providerMock('stripe') },
        { provide: HeyBancoProvider, useValue: providerMock('heybanco') },
        {
          // PT-080: el registro resuelve el adaptador por clave o alias. Se construye con los
          // mismos dobles del test, de modo que el enrutado es real y no simulado.
          provide: PaymentProviderRegistry,
          useFactory: (mp: never, pp: never, st: never, hb: never) =>
            new PaymentProviderRegistry([
              Object.assign(mp, { key: 'MERCADO_PAGO', aliases: ['mercadopago'] }),
              Object.assign(pp, { key: 'PAYPAL', aliases: [] }),
              Object.assign(st, { key: 'STRIPE', aliases: [] }),
              Object.assign(hb, { key: 'HEY_BANCO', aliases: ['heybanco'] }),
            ] as never),
          inject: [MercadoPagoProvider, PaypalProvider, StripeProvider, HeyBancoProvider],
        },
        {
          // PT-080: el ciclo decide si procede acreditar. Por defecto, coherente.
          provide: PaymentCycleService,
          useValue: {
            open: jest.fn().mockResolvedValue(undefined),
            attachProviderRef: jest.fn().mockResolvedValue(undefined),
            // PT-087: el ciclo se reabre si la acreditacion falla tras haberlo cerrado.
            reopenForRetry: jest.fn().mockResolvedValue(undefined),
            evaluate: jest
              .fn()
              .mockResolvedValue({ shouldCredit: true, outcome: 'PROCESSED', cycleId: 'c-1' }),
          },
        },
        {
          // PT-086: la traza nunca bloquea; en tests basta con un doble silencioso.
          provide: PaymentTraceService,
          useValue: { record: jest.fn().mockResolvedValue(undefined), byReference: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: {
            processedWebhookEvent: { create: eventCreate, delete: eventDelete },
          },
        },
        { provide: WalletService, useValue: { deposit: walletDeposit, getBalance: jest.fn() } },
        { provide: StructuredLogger, useValue: logger },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  const fireWebhook = (provider = 'PAYPAL') =>
    service.handleWebhook(provider, { type: 'payment' } as never, {}, {});

  // ── T-03 / T-04 — disponibilidad derivada de checkStatus (CA-01) ──────

  describe('getAvailableProviders()', () => {
    it('T-03: excluye PAYPAL cuando el proveedor no está configurado', () => {
      providerStatus.paypal.mockReturnValue(false);
      expect(service.getAvailableProviders()).not.toContain('PAYPAL');
    });

    it('T-04: sigue incluyendo MERCADO_PAGO cuando sí está configurado (guarda R-12)', () => {
      expect(service.getAvailableProviders()).toContain('MERCADO_PAGO');
    });

    it('T-04b: excluye MERCADO_PAGO si su token no está presente', () => {
      providerStatus.mp.mockReturnValue(false);
      expect(service.getAvailableProviders()).not.toContain('MERCADO_PAGO');
    });

    it('T-04c: incluye los proveedores que pasen a estar configurados', () => {
      providerStatus.stripe.mockReturnValue(true);
      expect(service.getAvailableProviders()).toContain('STRIPE');
    });
  });

  // ── T-26..T-30 / D-18 — extracción de importe (CA-09, CA-15) ─────────

  describe('extracción de importe', () => {
    it('T-26: PayPal acredita usando el campo amount normalizado', async () => {
      handlers.paypal.mockResolvedValue({
        paymentId: 'CAPTURE-1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        amount: 500,
      });

      await fireWebhook('PAYPAL');
      expect(walletDeposit).toHaveBeenCalledWith(UUID, 500, REFERENCE, 'DEPOSIT');
    });

    it('T-27 (PT-080): MercadoPago acredita por el importe que normaliza su adaptador', async () => {
      // El nucleo ya no conoce `transaction_amount`: cada adaptador normaliza lo suyo.
      handlers.mp.mockResolvedValue({
        paymentId: 'ORDTST1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        amount: 750,
        metadata: { transaction_amount: 750 },
      });

      await fireWebhook('MERCADO_PAGO');
      expect(walletDeposit).toHaveBeenCalledWith(UUID, 750, REFERENCE, 'DEPOSIT');
    });

    it('T-28 (PT-080): Stripe acredita por el importe que normaliza su adaptador', async () => {
      // Stripe factura en centavos; la conversion vive ahora en su adaptador, no en el nucleo.
      providerStatus.stripe.mockReturnValue(true);
      handlers.stripe.mockResolvedValue({
        paymentId: 'cs_test_1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        amount: 123.45,
        metadata: { amountTotal: 12345 },
      });

      await fireWebhook('STRIPE');
      expect(walletDeposit).toHaveBeenCalledWith(UUID, 123.45, REFERENCE, 'DEPOSIT');
    });

    it('T-29: no acredita si ningún campo de importe es resoluble', async () => {
      handlers.paypal.mockResolvedValue({
        paymentId: 'CAPTURE-1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        metadata: {},
      });

      await fireWebhook('PAYPAL');
      expect(walletDeposit).not.toHaveBeenCalled();
    });

    it('T-30: preserva los decimales del importe', async () => {
      handlers.paypal.mockResolvedValue({
        paymentId: 'CAPTURE-1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        amount: 99.99,
      });

      await fireWebhook('PAYPAL');
      expect(walletDeposit).toHaveBeenCalledWith(UUID, 99.99, REFERENCE, 'DEPOSIT');
    });
  });

  // ── D-01..D-17 — deduplicación por identificador de pago (PT-078) ────
  //
  // La clave es `paymentId`, no el identificador de notificación: Mercado Pago emite varias
  // notificaciones distintas sobre el mismo pago (payment.created, payment.updated), cada una
  // con su propio id. Solo el id de pago impide acreditar dos veces el mismo dinero.

  describe('deduplicación por identificador de pago', () => {
    const completed = (paymentId: string, extra: Record<string, unknown> = {}) => ({
      paymentId,
      externalId: REFERENCE,
      status: 'COMPLETED' as const,
      amount: 500,
      ...extra,
    });

    const enableAll = (): void => {
      providerStatus.stripe.mockReturnValue(true);
      providerStatus.heybanco.mockReturnValue(true);
    };

    // ── Deduplicación en los cuatro proveedores (criterio 1) ──

    it.each([
      ['PAYPAL', 'paypal', 'CAPTURE-1'],
      ['MERCADO_PAGO', 'mp', '112233445'],
      ['STRIPE', 'stripe', 'cs_test_1'],
      ['HEY_BANCO', 'heybanco', 'HB-REF-1'],
    ])('D-01..04: %s no acredita dos veces el mismo pago', async (route, key, paymentId) => {
      enableAll();
      handlers[key].mockResolvedValue(completed(paymentId));
      eventCreate.mockResolvedValueOnce({}).mockRejectedValueOnce(uniqueViolation());

      await fireWebhook(route);
      await fireWebhook(route);

      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    it('D-05: la reserva se inserta con el proveedor y el id de pago', async () => {
      handlers.paypal.mockResolvedValue(completed('CAPTURE-1'));

      await fireWebhook('PAYPAL');

      expect(eventCreate).toHaveBeenCalledWith({
        data: { provider: 'PAYPAL', paymentId: 'CAPTURE-1' },
      });
      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    // ── El caso que motiva el PT (criterio 2) ──

    it('D-06: dos notificaciones distintas de MP sobre el mismo pago acreditan una vez', async () => {
      // payment.created y payment.updated: notificaciones distintas, mismo pago aprobado.
      handlers.mp
        .mockResolvedValueOnce(completed('112233445', { metadata: { action: 'payment.created' } }))
        .mockResolvedValueOnce(completed('112233445', { metadata: { action: 'payment.updated' } }));
      eventCreate.mockResolvedValueOnce({}).mockRejectedValueOnce(uniqueViolation());

      await fireWebhook('MERCADO_PAGO');
      await fireWebhook('MERCADO_PAGO');

      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    it('D-07: el mismo pago por Orders API y por Payments API legacy acredita una vez', async () => {
      handlers.mp.mockResolvedValue(completed('ORD01ABC'));
      eventCreate.mockResolvedValueOnce({}).mockRejectedValueOnce(uniqueViolation());

      await fireWebhook('MERCADO_PAGO');
      await fireWebhook('mercadopago');

      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    // ── Casos legítimos que NO deben bloquearse (criterio 3) ──

    it('D-08: dos pagos distintos del mismo usuario acreditan por separado', async () => {
      handlers.paypal.mockResolvedValueOnce(completed('CAPTURE-1'));
      await fireWebhook('PAYPAL');

      handlers.paypal.mockResolvedValueOnce(completed('CAPTURE-2'));
      await fireWebhook('PAYPAL');

      expect(walletDeposit).toHaveBeenCalledTimes(2);
    });

    it('D-09: el mismo id de pago en proveedores distintos no colisiona', async () => {
      handlers.paypal.mockResolvedValue(completed('12345'));
      handlers.mp.mockResolvedValue(completed('12345'));

      await fireWebhook('PAYPAL');
      await fireWebhook('MERCADO_PAGO');

      expect(eventCreate).toHaveBeenNthCalledWith(1, {
        data: { provider: 'PAYPAL', paymentId: '12345' },
      });
      expect(eventCreate).toHaveBeenNthCalledWith(2, {
        data: { provider: 'MERCADO_PAGO', paymentId: '12345' },
      });
      expect(walletDeposit).toHaveBeenCalledTimes(2);
    });

    it('D-10: un reintento del usuario con la misma referencia pero otro pago sí acredita', async () => {
      // La clave es el pago, no la referencia DEP-<userId>-<ts>: deduplicar por referencia
      // habría bloqueado este caso legítimo.
      handlers.paypal.mockResolvedValueOnce(completed('CAPTURE-FALLIDO'));
      await fireWebhook('PAYPAL');

      handlers.paypal.mockResolvedValueOnce(completed('CAPTURE-REINTENTO'));
      await fireWebhook('PAYPAL');

      expect(walletDeposit).toHaveBeenCalledTimes(2);
    });

    // ── Concurrencia (criterio 4) ──

    it('D-11: dos entregas concurrentes del mismo pago acreditan una sola vez', async () => {
      handlers.paypal.mockResolvedValue(completed('CAPTURE-1'));
      eventCreate.mockResolvedValueOnce({}).mockRejectedValueOnce(uniqueViolation());

      await Promise.all([fireWebhook('PAYPAL'), fireWebhook('PAYPAL')]);

      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    it('D-12: la entrega duplicada responde 200 para que la pasarela deje de reintentar', async () => {
      handlers.paypal.mockResolvedValue(completed('CAPTURE-1'));
      eventCreate.mockRejectedValueOnce(uniqueViolation());

      await expect(fireWebhook('PAYPAL')).resolves.toEqual({ received: true });
      expect(walletDeposit).not.toHaveBeenCalled();
    });

    // ── Fail-open sin identificador de pago (AD-02) ──

    it('D-13: sin paymentId acredita igualmente y registra el error', async () => {
      handlers.paypal.mockResolvedValue({
        externalId: REFERENCE,
        status: 'COMPLETED',
        amount: 500,
      });

      await fireWebhook('PAYPAL');

      expect(eventCreate).not.toHaveBeenCalled();
      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    it('D-14: con paymentId vacío se comporta igual que sin él', async () => {
      handlers.paypal.mockResolvedValue(completed(''));

      await fireWebhook('PAYPAL');

      expect(eventCreate).not.toHaveBeenCalled();
      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    it('D-14b: sin reserva no se propaga el fallo, porque reintentar duplicaría', async () => {
      handlers.paypal.mockResolvedValue({
        externalId: REFERENCE,
        status: 'COMPLETED',
        amount: 500,
      });
      walletDeposit.mockRejectedValueOnce(new Error('wallet down'));

      await expect(fireWebhook('PAYPAL')).resolves.toEqual({ received: true });
    });

    // ── Propagación unificada de fallos (AD-04) ──

    it('D-15: un fallo de acreditación en MercadoPago libera la reserva y propaga', async () => {
      handlers.mp.mockResolvedValue(completed('112233445'));
      walletDeposit.mockRejectedValueOnce(new Error('wallet down'));

      await expect(fireWebhook('MERCADO_PAGO')).rejects.toThrow('wallet down');

      expect(eventDelete).toHaveBeenCalledWith({
        where: { provider_paymentId: { provider: 'MERCADO_PAGO', paymentId: '112233445' } },
      });
    });

    it('D-16: un fallo de acreditación en PayPal libera la reserva y propaga', async () => {
      handlers.paypal.mockResolvedValue(completed('CAPTURE-1'));
      walletDeposit.mockRejectedValueOnce(new Error('wallet down'));

      await expect(fireWebhook('PAYPAL')).rejects.toThrow('wallet down');

      expect(eventDelete).toHaveBeenCalledWith({
        where: { provider_paymentId: { provider: 'PAYPAL', paymentId: 'CAPTURE-1' } },
      });
    });

    it('D-17: un error de BD distinto de P2002 propaga sin acreditar', async () => {
      handlers.paypal.mockResolvedValue(completed('CAPTURE-1'));
      eventCreate.mockRejectedValueOnce(new Error('connection lost'));

      await expect(fireWebhook('PAYPAL')).rejects.toThrow('connection lost');
      expect(walletDeposit).not.toHaveBeenCalled();
    });
  });
});
