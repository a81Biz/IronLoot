import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { MercadoPagoProvider } from '../../../src/modules/payments/providers/mercadopago.provider';
import { PaypalProvider } from '../../../src/modules/payments/providers/paypal.provider';
import { StripeProvider } from '../../../src/modules/payments/providers/stripe.provider';
import { HeyBancoProvider } from '../../../src/modules/payments/providers/heybanco.provider';
import { PrismaService } from '../../../src/database/prisma.service';
import { WalletService } from '../../../src/modules/wallet/wallet.service';
import { StructuredLogger } from '../../../src/common/observability';

/**
 * PT-076.5 — PaymentsService: disponibilidad de proveedores, extracción de importe
 * y deduplicación de webhooks reentregados.
 *
 * Cubre T-03, T-04, T-26..T-33 de changes/PT-076-paypal-orders-v2/test-scenarios.md
 * y los criterios CA-01, CA-09, CA-12 y CA-15.
 *
 * T-27 y T-28 son **guardas de regresión**: verifican que MercadoPago y Stripe
 * conservan exactamente su extracción histórica de importe desde `metadata`.
 */

const UUID = '08b22a46-49a4-4ece-a8ff-021cce24ed70';
const REFERENCE = `DEP-${UUID}-1784948505855`;

/** Error de violación de restricción única tal y como lo emite Prisma. */
const uniqueViolation = (): Error & { code: string } =>
  Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });

describe('PaymentsService — PT-076 (importe, disponibilidad y deduplicación)', () => {
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

  // ── T-26..T-30 — extracción de importe (CA-09, CA-15) ────────────────

  describe('extracción de importe', () => {
    it('T-26: PayPal acredita usando el campo amount normalizado', async () => {
      handlers.paypal.mockResolvedValue({
        paymentId: 'CAPTURE-1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        amount: 500,
        eventId: 'WH-1',
      });

      await fireWebhook('PAYPAL');
      expect(walletDeposit).toHaveBeenCalledWith(UUID, 500, REFERENCE, 'DEPOSIT');
    });

    it('T-27 (regresión): MercadoPago sigue acreditando por metadata.transaction_amount', async () => {
      handlers.mp.mockResolvedValue({
        paymentId: 'ORDTST1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        metadata: { transaction_amount: 750 },
      });

      await fireWebhook('MERCADO_PAGO');
      expect(walletDeposit).toHaveBeenCalledWith(UUID, 750, REFERENCE, 'DEPOSIT');
    });

    it('T-28 (regresión): Stripe sigue acreditando por metadata.amountTotal en centavos', async () => {
      providerStatus.stripe.mockReturnValue(true);
      handlers.stripe.mockResolvedValue({
        paymentId: 'pi_1',
        externalId: REFERENCE,
        status: 'COMPLETED',
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
        eventId: 'WH-1',
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
        eventId: 'WH-1',
      });

      await fireWebhook('PAYPAL');
      expect(walletDeposit).toHaveBeenCalledWith(UUID, 99.99, REFERENCE, 'DEPOSIT');
    });
  });

  // ── T-31..T-33 — deduplicación (CA-12) ───────────────────────────────

  describe('deduplicación de reentregas', () => {
    const completedEvent = (eventId: string) => ({
      paymentId: 'CAPTURE-1',
      externalId: REFERENCE,
      status: 'COMPLETED' as const,
      amount: 500,
      eventId,
    });

    it('T-31: reserva el evento antes de acreditar', async () => {
      handlers.paypal.mockResolvedValue(completedEvent('WH-1'));

      await fireWebhook('PAYPAL');

      expect(eventCreate).toHaveBeenCalledWith({
        data: { provider: 'PAYPAL', eventId: 'WH-1' },
      });
      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    it('T-31b: una reentrega del mismo evento no vuelve a acreditar', async () => {
      handlers.paypal.mockResolvedValue(completedEvent('WH-1'));
      eventCreate.mockRejectedValueOnce(uniqueViolation());

      const response = await fireWebhook('PAYPAL');

      expect(walletDeposit).not.toHaveBeenCalled();
      // Debe responder 200 para que PayPal deje de reintentar.
      expect(response).toEqual({ received: true });
    });

    it('T-32: ante dos entregas concurrentes solo una acredita', async () => {
      handlers.paypal.mockResolvedValue(completedEvent('WH-1'));
      eventCreate.mockResolvedValueOnce({}).mockRejectedValueOnce(uniqueViolation());

      await Promise.all([fireWebhook('PAYPAL'), fireWebhook('PAYPAL')]);

      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });

    it('T-32b: si la acreditación falla, libera la reserva y propaga para que PayPal reintente', async () => {
      handlers.paypal.mockResolvedValue(completedEvent('WH-1'));
      walletDeposit.mockRejectedValueOnce(new Error('wallet down'));

      await expect(fireWebhook('PAYPAL')).rejects.toThrow('wallet down');

      expect(eventDelete).toHaveBeenCalledWith({
        where: { provider_eventId: { provider: 'PAYPAL', eventId: 'WH-1' } },
      });
    });

    it('T-32c (regresión): un fallo de acreditación en MercadoPago NO propaga (200 como antes)', async () => {
      handlers.mp.mockResolvedValue({
        paymentId: 'ORDTST1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        metadata: { transaction_amount: 500 },
      });
      walletDeposit.mockRejectedValueOnce(new Error('wallet down'));

      await expect(fireWebhook('MERCADO_PAGO')).resolves.toEqual({ received: true });
    });

    it('T-33: dos eventos distintos del mismo usuario acreditan por separado', async () => {
      handlers.paypal.mockResolvedValueOnce(completedEvent('WH-1'));
      await fireWebhook('PAYPAL');

      handlers.paypal.mockResolvedValueOnce(completedEvent('WH-2'));
      await fireWebhook('PAYPAL');

      expect(walletDeposit).toHaveBeenCalledTimes(2);
    });

    it('T-33b: los proveedores sin eventId acreditan sin pasar por la reserva', async () => {
      handlers.mp.mockResolvedValue({
        paymentId: 'ORDTST1',
        externalId: REFERENCE,
        status: 'COMPLETED',
        metadata: { transaction_amount: 500 },
      });

      await fireWebhook('MERCADO_PAGO');

      expect(eventCreate).not.toHaveBeenCalled();
      expect(walletDeposit).toHaveBeenCalledTimes(1);
    });
  });
});
