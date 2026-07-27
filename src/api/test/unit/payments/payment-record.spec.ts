import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCycleService } from '../../../src/modules/payments/payment-cycle.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { StructuredLogger } from '../../../src/common/observability';

/**
 * PT-085 — El ciclo escribe su `Payment` y genera el reembolso de un cobro duplicado.
 *
 * `Payment.orderId` era obligatorio con clave foránea a `Order`, y un depósito de wallet no
 * tiene orden: por eso la tabla llevaba vacía desde siempre. El panel financiero del admin la
 * consulta en seis sitios, así que **mostraba ceros**.
 *
 * `RefundRequest.orderId` tenía la misma restricción, y por eso PT-080 no pudo crear la
 * solicitud de reembolso que su propio diseño pedía ante un cobro duplicado.
 */

const UUID = '08b22a46-49a4-4ece-a8ff-021cce24ed70';
const REFERENCE = `DEP-${UUID}-1784948505855`;
const CANONICAL = '169718720683';

describe('PaymentCycleService — registro de pago y reembolso (PT-085)', () => {
  let service: PaymentCycleService;
  let cycleFindUnique: jest.Mock;
  // PT-087: el asiento se escribe con `upsert` para que un ciclo reabierto no lo duplique.
  let paymentUpsert: jest.Mock;
  let refundCreate: jest.Mock;

  const openCycle = (o: Record<string, unknown> = {}) => ({
    id: 'cycle-1',
    provider: 'MERCADO_PAGO',
    reference: REFERENCE,
    userId: UUID,
    amount: { toString: () => '250' },
    currency: 'MXN',
    status: 'REQUESTED',
    ...o,
  });

  const response = (o: Record<string, unknown> = {}) => ({
    paymentId: CANONICAL,
    externalId: REFERENCE,
    status: 'COMPLETED' as const,
    amount: 250,
    ...o,
  });

  beforeEach(async () => {
    cycleFindUnique = jest.fn().mockResolvedValue(openCycle());
    paymentUpsert = jest.fn().mockResolvedValue({});
    refundCreate = jest.fn().mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCycleService,
        {
          provide: PrismaService,
          useValue: {
            paymentCycle: {
              findUnique: cycleFindUnique,
              update: jest.fn().mockResolvedValue({}),
              create: jest.fn().mockResolvedValue({ id: 'cycle-1' }),
              findMany: jest.fn().mockResolvedValue([]),
            },
            paymentCycleEvent: { create: jest.fn().mockResolvedValue({}) },
            payment: { upsert: paymentUpsert },
            refundRequest: { create: refundCreate },
          },
        },
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

    service = module.get(PaymentCycleService);
  });

  const evaluate = (r = response()) => service.evaluate('MERCADO_PAGO', r as never, 'WEBHOOK');

  it('P-01: al liquidar el ciclo se escribe la fila de Payment', async () => {
    await evaluate();

    expect(paymentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference: REFERENCE },
        create: expect.objectContaining({
          provider: 'MERCADO_PAGO',
          status: 'COMPLETED',
          externalId: CANONICAL,
          reference: REFERENCE,
        }),
      }),
    );
  });

  it('P-02: un depósito escribe Payment SIN orden asociada', async () => {
    await evaluate();

    const data = paymentUpsert.mock.calls[0][0].create;
    expect(data.orderId ?? null).toBeNull();
  });

  it('P-03: el importe registrado es el confirmado', async () => {
    await evaluate();

    expect(Number(paymentUpsert.mock.calls[0][0].create.amount)).toBe(250);
  });

  it('P-04: un rechazo también se registra, como FAILED', async () => {
    await evaluate(response({ status: 'FAILED' }));

    expect(paymentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ status: 'FAILED' }) }),
    );
  });

  it('P-05: un duplicado NO escribe una segunda fila de Payment', async () => {
    cycleFindUnique.mockResolvedValue(
      openCycle({ status: 'SETTLED', canonicalPaymentId: CANONICAL }),
    );

    await evaluate();

    expect(paymentUpsert).not.toHaveBeenCalled();
  });

  it('P-06: un cobro DISTINTO sobre una referencia cerrada genera la solicitud de reembolso', async () => {
    cycleFindUnique.mockResolvedValue(
      openCycle({ status: 'SETTLED', canonicalPaymentId: 'pago-anterior' }),
    );

    await evaluate(response({ paymentId: 'pago-nuevo' }));

    expect(refundCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentReference: REFERENCE,
          status: 'PENDING_REFUND',
        }),
      }),
    );
  });

  it('P-07: el reembolso de un depósito no exige orden', async () => {
    cycleFindUnique.mockResolvedValue(
      openCycle({ status: 'SETTLED', canonicalPaymentId: 'pago-anterior' }),
    );

    await evaluate(response({ paymentId: 'pago-nuevo' }));

    const data = refundCreate.mock.calls[0][0].data;
    expect(data.orderId ?? null).toBeNull();
  });

  it('P-08: si escribir el Payment falla, la acreditación sigue adelante', async () => {
    // El registro es contable, no la fuente de verdad del dinero: un fallo aquí no puede
    // impedir que el usuario reciba su saldo.
    paymentUpsert.mockRejectedValue(new Error('bd caida'));

    const decision = await evaluate();

    expect(decision.shouldCredit).toBe(true);
  });
});
