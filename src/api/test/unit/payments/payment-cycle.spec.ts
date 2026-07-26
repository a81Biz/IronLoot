import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCycleService } from '../../../src/modules/payments/payment-cycle.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { StructuredLogger } from '../../../src/common/observability';

/**
 * PT-080.7 — Ciclo de pago en tres fases.
 *
 * Cubre B-01..B-10 de changes/PT-080-payment-cycle/test-scenarios.md.
 *
 * SOLICITUD (al pedir el pago) → CONFIRMACIÓN (respuesta de la pasarela) → PERSISTENCIA
 * (cierre). Las tres deben coincidir en usuario, importe y moneda; si algo difiere el ciclo
 * es ANOMALY y no se acredita. Solo se procesa la PRIMERA respuesta, positiva o negativa;
 * las posteriores se cancelan.
 */

const UUID = '08b22a46-49a4-4ece-a8ff-021cce24ed70';
const REFERENCE = `DEP-${UUID}-1784948505855`;
const CANONICAL = '169718720683';

describe('PaymentCycleService — invariante de tres fases (PT-080)', () => {
  let service: PaymentCycleService;
  let cycleFindUnique: jest.Mock;
  let cycleUpdate: jest.Mock;
  let cycleCreate: jest.Mock;
  let eventCreate: jest.Mock;
  let refundCreate: jest.Mock;

  /** Solicitud coherente por defecto: 250 MXN para UUID. */
  const openCycle = (overrides: Record<string, unknown> = {}) => ({
    id: 'cycle-1',
    provider: 'MERCADO_PAGO',
    reference: REFERENCE,
    userId: UUID,
    amount: { toString: () => '250' },
    currency: 'MXN',
    status: 'REQUESTED',
    ...overrides,
  });

  /** Respuesta de la pasarela coherente con la solicitud. */
  const response = (overrides: Record<string, unknown> = {}) => ({
    paymentId: CANONICAL,
    externalId: REFERENCE,
    status: 'COMPLETED' as const,
    amount: 250,
    ...overrides,
  });

  beforeEach(async () => {
    cycleFindUnique = jest.fn().mockResolvedValue(openCycle());
    cycleUpdate = jest.fn().mockResolvedValue({});
    cycleCreate = jest.fn().mockResolvedValue({ id: 'cycle-1' });
    eventCreate = jest.fn().mockResolvedValue({});
    refundCreate = jest.fn().mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCycleService,
        {
          provide: PrismaService,
          useValue: {
            paymentCycle: {
              findUnique: cycleFindUnique,
              update: cycleUpdate,
              create: cycleCreate,
              findMany: jest.fn().mockResolvedValue([]),
            },
            paymentCycleEvent: { create: eventCreate },
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

  const evaluate = (r = response(), format = 'WEBHOOK') =>
    service.evaluate('MERCADO_PAGO', r as never, format);

  // ── B-01..B-05 — invariante de las tres fases ────────────────────────

  it('B-01: solicitud, confirmación y persistencia coherentes → se acredita', async () => {
    const outcome = await evaluate();

    expect(outcome.shouldCredit).toBe(true);
    expect(outcome.outcome).toBe('PROCESSED');
    expect(eventCreate).toHaveBeenCalled();
  });

  it('B-02: importe confirmado distinto al solicitado → ANOMALY, no acredita', async () => {
    const outcome = await evaluate(response({ amount: 999 }));

    expect(outcome.shouldCredit).toBe(false);
    expect(outcome.outcome).toBe('ANOMALY');
    expect(cycleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ANOMALY' }) }),
    );
  });

  it('B-03: moneda distinta → ANOMALY', async () => {
    cycleFindUnique.mockResolvedValue(openCycle({ currency: 'USD' }));

    const outcome = await evaluate();

    expect(outcome.shouldCredit).toBe(false);
    expect(outcome.outcome).toBe('ANOMALY');
  });

  it('B-04: usuario distinto al de la solicitud → ANOMALY', async () => {
    // La referencia lleva el userId; una respuesta cuya referencia apunta a otro usuario
    // no puede acreditar sobre esta solicitud.
    cycleFindUnique.mockResolvedValue(openCycle({ userId: 'otro-usuario-uuid' }));

    const outcome = await evaluate();

    expect(outcome.shouldCredit).toBe(false);
    expect(outcome.outcome).toBe('ANOMALY');
  });

  it('B-05: confirmación sin solicitud previa se registra como huérfana y no acredita', async () => {
    cycleFindUnique.mockResolvedValue(null);

    const outcome = await evaluate();

    expect(outcome.shouldCredit).toBe(false);
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cycleId: null }) }),
    );
  });

  // ── B-06..B-09 — primera respuesta gana ──────────────────────────────

  it('B-06: una segunda respuesta tras cerrar se cancela y no afecta al resultado', async () => {
    cycleFindUnique.mockResolvedValue(
      openCycle({ status: 'SETTLED', canonicalPaymentId: 'otro-pago' }),
    );

    const outcome = await evaluate();

    expect(outcome.shouldCredit).toBe(false);
    expect(outcome.outcome).toBe('CANCELLED');
  });

  it('B-07: primera respuesta negativa cierra; una positiva posterior no lo "mejora"', async () => {
    // Primera: rechazo → FAILED
    const first = await evaluate(response({ status: 'FAILED' }));
    expect(first.shouldCredit).toBe(false);
    expect(first.outcome).toBe('REJECTED');

    // Segunda: aprobada, pero el ciclo ya está cerrado
    cycleFindUnique.mockResolvedValue(openCycle({ status: 'FAILED' }));
    const second = await evaluate();

    expect(second.shouldCredit).toBe(false);
    expect(second.outcome).toBe('CANCELLED');
  });

  it('B-08: la reentrega del MISMO pago se marca duplicada, no cancelada', async () => {
    cycleFindUnique.mockResolvedValue(
      openCycle({ status: 'SETTLED', canonicalPaymentId: CANONICAL }),
    );

    const outcome = await evaluate();

    expect(outcome.outcome).toBe('DUPLICATE');
    expect(outcome.shouldCredit).toBe(false);
  });

  it('B-09: un duplicado NO lanza excepción (está mapeada a 409 y provocaría reintentos)', async () => {
    cycleFindUnique.mockResolvedValue(
      openCycle({ status: 'SETTLED', canonicalPaymentId: CANONICAL }),
    );

    await expect(evaluate()).resolves.toBeDefined();
  });

  // ── B-10 — cobro duplicado bajo una misma referencia ─────────────────

  it('B-10: dos cobros DISTINTOS bajo la misma referencia se marcan para revisión', async () => {
    // No se crea un RefundRequest: ese modelo exige `orderId` con clave foránea a Order, y un
    // depósito de wallet no tiene orden. La cola de revisión es la propia tabla del ciclo,
    // donde la anomalía queda con su motivo. La decisión de devolver dinero sigue siendo del
    // admin (ADR-022).
    cycleFindUnique.mockResolvedValue(
      openCycle({ status: 'SETTLED', canonicalPaymentId: 'pago-anterior-distinto' }),
    );

    const outcome = await evaluate(response({ paymentId: 'pago-nuevo-distinto' }));

    expect(outcome.shouldCredit).toBe(false);
    expect(outcome.outcome).toBe('CANCELLED');
    expect(cycleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anomalyReason: expect.stringMatching(/cobro/i) }),
      }),
    );
    expect(eventCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ outcome: 'CANCELLED' }) }),
    );
  });

  // ── Apertura del ciclo ───────────────────────────────────────────────

  it('B-11: abrir el ciclo lo deja en REQUESTED con los datos de la solicitud', async () => {
    await service.open({
      provider: 'MERCADO_PAGO',
      reference: REFERENCE,
      userId: UUID,
      amount: 250,
      currency: 'MXN',
    } as never);

    expect(cycleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reference: REFERENCE,
          userId: UUID,
          status: 'REQUESTED',
        }),
      }),
    );
  });
});
