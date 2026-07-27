import { BadRequestException } from '@nestjs/common';
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
import { Test, TestingModule } from '@nestjs/testing';

/**
 * PT-092 — Cuántas cuentas de cobro puede tener un vendedor, y de qué clase.
 *
 * Decisión de producto: **un solo PayPal, pero varias CLABE y varias tarjetas**.
 *
 * El porqué de la asimetría: una cuenta de PayPal se identifica por un correo y una persona
 * tiene el suyo; tener dos registrados no resuelve ningún caso real y multiplica la superficie
 * de error al elegir destino. En cambio, es normal tener cuentas en varios bancos, o una cuenta
 * personal y otra de la actividad.
 */
describe('Cardinalidad de los métodos de cobro (PT-092)', () => {
  const USUARIO = '11111111-1111-1111-1111-111111111111';

  let service: PaymentsService;
  let findFirst: jest.Mock;
  let findMany: jest.Mock;
  let create: jest.Mock;

  beforeEach(async () => {
    findFirst = jest.fn().mockResolvedValue(null);
    findMany = jest.fn().mockResolvedValue([]);
    create = jest.fn().mockImplementation(({ data }) => ({ id: 'm-nuevo', ...data }));

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
          useValue: { open: jest.fn(), attachProviderRef: jest.fn(), reopenForRetry: jest.fn() },
        },
        { provide: PaymentTraceService, useValue: { record: jest.fn(), byReference: jest.fn() } },
        {
          provide: PrismaService,
          useValue: { userPaymentMethod: { findFirst, findMany, create } },
        },
        { provide: WalletService, useValue: { deposit: jest.fn(), getBalance: jest.fn() } },
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

  // ── PayPal: uno y solo uno ───────────────────────────────────────────

  it('C-01: se puede registrar un PayPal si no hay ninguno', async () => {
    const r = await service.addPaypalAccount(USUARIO, { paypalEmail: 'v@ejemplo.com' });

    expect(r.type).toBe('PAYPAL');
    expect(r.paypalEmail).toBe('v@ejemplo.com');
  });

  it('C-02: un SEGUNDO PayPal se rechaza', async () => {
    findMany.mockResolvedValue([{ id: 'm1', type: 'PAYPAL', paypalEmail: 'otro@ejemplo.com' }]);

    await expect(
      service.addPaypalAccount(USUARIO, { paypalEmail: 'v@ejemplo.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('C-03: el rechazo dice cuál es la cuenta que ya existe, para que se pueda quitar', async () => {
    findMany.mockResolvedValue([{ id: 'm1', type: 'PAYPAL', paypalEmail: 'otro@ejemplo.com' }]);

    await expect(
      service.addPaypalAccount(USUARIO, { paypalEmail: 'v@ejemplo.com' }),
    ).rejects.toThrow(/otro@ejemplo\.com/);
  });

  // ── CLABE y tarjeta: varias ──────────────────────────────────────────

  it('C-04: una segunda CLABE se acepta', async () => {
    findMany.mockResolvedValue([{ id: 'm1', type: 'CLABE', clabe: '012180012345678903' }]);

    const r = await service.addBankAccount(USUARIO, {
      clabe: '646180110400000007',
      holderName: 'Vendedor',
    });

    expect(r.type).toBe('CLABE');
  });

  it('C-05: una tercera CLABE también', async () => {
    findMany.mockResolvedValue([
      { id: 'm1', type: 'CLABE' },
      { id: 'm2', type: 'CLABE' },
    ]);

    await expect(
      service.addBankAccount(USUARIO, { clabe: '646180110400000007', holderName: 'V' }),
    ).resolves.toBeDefined();
  });

  it('C-06: tener un PayPal no impide registrar una CLABE', async () => {
    findMany.mockResolvedValue([{ id: 'm1', type: 'PAYPAL', paypalEmail: 'v@ejemplo.com' }]);

    await expect(
      service.addBankAccount(USUARIO, { clabe: '646180110400000007', holderName: 'V' }),
    ).resolves.toBeDefined();
  });

  // ── Lo que se conserva ───────────────────────────────────────────────

  it('C-07: una CLABE con dígito verificador inválido se sigue rechazando', async () => {
    await expect(
      service.addBankAccount(USUARIO, { clabe: '012180012345678900', holderName: 'V' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('C-08: un PayPal sin correo válido se rechaza', async () => {
    await expect(
      service.addPaypalAccount(USUARIO, { paypalEmail: 'no-es-correo' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('C-09: el mismo PayPal registrado dos veces no crea un duplicado', async () => {
    findFirst.mockResolvedValue({ id: 'm1', type: 'PAYPAL', paypalEmail: 'v@ejemplo.com' });
    findMany.mockResolvedValue([{ id: 'm1', type: 'PAYPAL', paypalEmail: 'v@ejemplo.com' }]);

    await expect(
      service.addPaypalAccount(USUARIO, { paypalEmail: 'v@ejemplo.com' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('C-10: toda cuenta nueva nace SIN verificar', async () => {
    // Es la premisa de PT-092: el destino del retiro es un hecho comprobado, no una afirmación.
    const r = await service.addPaypalAccount(USUARIO, { paypalEmail: 'v@ejemplo.com' });
    expect(r.isVerified).toBe(false);
  });
});
