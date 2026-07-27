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
 * PT-064 (BUG CRÍTICO) — Procesamiento del webhook de acreditación:
 *  #2 el proveedor debe compararse case-insensitive (la URL registrada usa "mercadopago").
 *  #6 el userId de "DEP-<uuid>-<ts>" es un UUID (con guiones); el parser previo split('-')[1]
 *     entregaba un UUID truncado → wallet no encontrada.
 */
describe('PaymentsService.handleWebhook — acreditación (PT-064)', () => {
  let service: PaymentsService;
  let mpHandle: jest.Mock;
  let walletDeposit: jest.Mock;

  beforeEach(async () => {
    mpHandle = jest.fn().mockResolvedValue(null);
    walletDeposit = jest.fn();
    const logger = { child: jest.fn().mockReturnThis(), info: jest.fn(), error: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: MercadoPagoProvider,
          useValue: {
            handleWebhook: mpHandle,
            createPayment: jest.fn(),
            verifyPayment: jest.fn(),
            checkStatus: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: PaypalProvider,
          useValue: {
            handleWebhook: jest.fn(),
            createPayment: jest.fn(),
            verifyPayment: jest.fn(),
            checkStatus: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: StripeProvider,
          useValue: {
            handleWebhook: jest.fn(),
            checkStatus: jest.fn().mockReturnValue(true),
            createPayment: jest.fn(),
          },
        },
        {
          provide: HeyBancoProvider,
          useValue: {
            handleWebhook: jest.fn(),
            checkStatus: jest.fn().mockReturnValue(true),
            createPayment: jest.fn(),
          },
        },
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
          // PT-078: la acreditación pasa ahora por una reserva de deduplicación en
          // `processed_webhook_events` también para Mercado Pago, así que el mock de
          // Prisma debe proveerla.
          provide: PrismaService,
          useValue: {
            processedWebhookEvent: { create: jest.fn(), delete: jest.fn() },
          },
        },
        { provide: WalletService, useValue: { deposit: walletDeposit, getBalance: jest.fn() } },
        { provide: StructuredLogger, useValue: logger },
      ],
    }).compile();
    service = module.get(PaymentsService);
  });

  it('#2 rutea el provider case-insensitive ("mercadopago" → MercadoPago)', async () => {
    await service.handleWebhook(
      'mercadopago',
      { type: 'payment', data: { id: '1' } } as any,
      {},
      {},
    );
    expect(mpHandle).toHaveBeenCalled();
  });

  it('#6 acredita con el UUID completo del external_reference (no truncado)', async () => {
    const uuid = '08b22a46-49a4-4ece-a8ff-021cce24ed70';
    mpHandle.mockResolvedValue({
      paymentId: 'ORDTST1',
      externalId: `DEP-${uuid}-1784948505855`,
      status: 'COMPLETED',
      // PT-080: el adaptador normaliza su propio importe; el nucleo ya no lee metadata.
      amount: 500,
      metadata: { transaction_amount: 500 },
    });
    await service.handleWebhook(
      'MERCADO_PAGO',
      { type: 'payment', data: { id: '1' } } as any,
      {},
      {},
    );
    expect(walletDeposit).toHaveBeenCalledWith(uuid, 500, `DEP-${uuid}-1784948505855`, 'DEPOSIT');
  });
});
