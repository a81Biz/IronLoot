import { NotFoundException } from '@nestjs/common';
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
 * PT-087 — Integridad de la acreditación (F-09, F-11).
 *
 * Encontrados al verificar PayPal de punta a punta el 2026-07-27: una orden se capturó de
 * verdad en la pasarela, el ciclo se marcó SETTLED, `payments` registró COMPLETED… y el
 * usuario no recibió nada, porque acreditar falló **después** de declarar el cierre.
 *
 * El sistema quedó afirmando que el pago estaba resuelto mientras el dinero no había llegado
 * a su destino. Eso es exactamente lo que el ciclo de tres fases existe para impedir.
 */
describe('Integridad de la acreditación (PT-087)', () => {
  const REF = 'DEP-db73d689-0ab1-4ed2-93c8-11b83e7ade6a-1785117585473';

  let service: PaymentsService;
  let deposit: jest.Mock;
  let reopenForRetry: jest.Mock;
  let record: jest.Mock;
  let deleteReserva: jest.Mock;

  const resultado = {
    paymentId: 'CAP-9',
    externalId: REF,
    status: 'COMPLETED' as const,
    amount: 321.5,
  };

  beforeEach(async () => {
    deposit = jest.fn().mockResolvedValue({
      wallet: { id: 'w-1' },
      ledger: { balanceBefore: '0', balanceAfter: '321.5', id: 'l-1' },
    });
    reopenForRetry = jest.fn().mockResolvedValue(undefined);
    record = jest.fn().mockResolvedValue(undefined);
    deleteReserva = jest.fn().mockResolvedValue(undefined);

    const doble = (key: string) => ({
      key,
      aliases: [],
      handleWebhook: jest.fn(),
      createPayment: jest.fn(),
      verifyPayment: jest.fn(),
      checkStatus: jest.fn().mockReturnValue(true),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: MercadoPagoProvider, useValue: doble('MERCADO_PAGO') },
        { provide: PaypalProvider, useValue: doble('PAYPAL') },
        { provide: StripeProvider, useValue: doble('STRIPE') },
        { provide: HeyBancoProvider, useValue: doble('HEY_BANCO') },
        {
          provide: PaymentProviderRegistry,
          useFactory: (mp: never, pp: never, st: never, hb: never) =>
            new PaymentProviderRegistry([mp, pp, st, hb] as never),
          inject: [MercadoPagoProvider, PaypalProvider, StripeProvider, HeyBancoProvider],
        },
        {
          provide: PaymentCycleService,
          useValue: {
            open: jest.fn(),
            attachProviderRef: jest.fn(),
            reopenForRetry,
            evaluate: jest
              .fn()
              .mockResolvedValue({ shouldCredit: true, outcome: 'PROCESSED', cycleId: 'c-1' }),
          },
        },
        { provide: PaymentTraceService, useValue: { record, byReference: jest.fn() } },
        {
          provide: PrismaService,
          useValue: {
            processedWebhookEvent: { create: jest.fn(), delete: deleteReserva },
          },
        },
        { provide: WalletService, useValue: { deposit, getBalance: jest.fn() } },
        {
          provide: StructuredLogger,
          useValue: {
            child: jest.fn().mockReturnThis(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  // ── F-09: el cierre no puede preceder a la acreditación ──────────────

  it('C-01: si acreditar falla, el ciclo NO se queda cerrado — vuelve a ser reintentable', async () => {
    deposit.mockRejectedValue(new NotFoundException('Wallet not found'));

    await expect(service.applyProviderResult('PAYPAL', resultado, 'POLL')).rejects.toThrow();

    expect(reopenForRetry).toHaveBeenCalledWith('c-1');
  });

  it('C-02: si acreditar falla, la reserva de deduplicación se libera para poder reintentar', async () => {
    deposit.mockRejectedValue(new NotFoundException('Wallet not found'));

    await expect(service.applyProviderResult('PAYPAL', resultado, 'POLL')).rejects.toThrow();

    expect(deleteReserva).toHaveBeenCalled();
  });

  it('C-03: si acreditar falla, queda constancia en la traza', async () => {
    deposit.mockRejectedValue(new NotFoundException('Wallet not found'));

    await expect(service.applyProviderResult('PAYPAL', resultado, 'POLL')).rejects.toThrow();

    const fallo = record.mock.calls
      .map((c) => c[0])
      .find((e) => e.step === 'WALLET_CREDITED' && e.outcome === 'ERROR');
    expect(fallo).toBeDefined();
    expect(fallo.provider).toBe('PAYPAL');
  });

  it('C-04: si acreditar va bien, el ciclo NO se reabre', async () => {
    await service.applyProviderResult('PAYPAL', resultado, 'POLL');

    expect(reopenForRetry).not.toHaveBeenCalled();
    expect(deposit).toHaveBeenCalledWith(
      'db73d689-0ab1-4ed2-93c8-11b83e7ade6a',
      321.5,
      REF,
      'DEPOSIT',
    );
  });

  // ── F-11: la traza no puede mentir sobre la pasarela ─────────────────

  it('C-05: una acreditación por PayPal se registra como PAYPAL, no como MERCADO_PAGO', async () => {
    await service.applyProviderResult('PAYPAL', resultado, 'POLL');

    const credito = record.mock.calls.map((c) => c[0]).find((e) => e.step === 'WALLET_CREDITED');
    expect(credito).toBeDefined();
    expect(credito.provider).toBe('PAYPAL');
  });

  it('C-06: una acreditación por Mercado Pago sigue registrándose como MERCADO_PAGO', async () => {
    await service.applyProviderResult('MERCADO_PAGO', resultado, 'WEBHOOK');

    const credito = record.mock.calls.map((c) => c[0]).find((e) => e.step === 'WALLET_CREDITED');
    expect(credito.provider).toBe('MERCADO_PAGO');
  });
});
