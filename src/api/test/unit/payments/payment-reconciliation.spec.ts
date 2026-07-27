import { Test, TestingModule } from '@nestjs/testing';
import { PaymentReconciliationService } from '../../../src/modules/payments/payment-reconciliation.service';
import { PaymentCycleService } from '../../../src/modules/payments/payment-cycle.service';
import { PaymentTraceService } from '../../../src/modules/payments/payment-trace.service';
import { PaymentsService } from '../../../src/modules/payments/payments.service';
import { PaymentProviderRegistry } from '../../../src/modules/payments/payment-provider.registry';
import { StructuredLogger } from '../../../src/common/observability';

/**
 * PT-080.10 — Vía garantizada.
 *
 * Cubre B-11..B-16 de changes/PT-080-payment-cycle/test-scenarios.md.
 *
 * El webhook es la vía rápida; esta es la garantizada. Un pago cobrado cuya notificación
 * nunca llega se acredita igualmente por consulta a la pasarela. Es lo que habría evitado
 * que se perdieran 180 MXN reales el 2026-07-26.
 *
 * Al vencer `PAYMENT_EXPIRATION_HOURS` (72, ya configurado en el proyecto) sin resolución,
 * el ciclo pasa a EXPIRED: se asume no resuelto y NO acredita.
 */

const REFERENCE = 'DEP-08b22a46-49a4-4ece-a8ff-021cce24ed70-1784948505855';

describe('PaymentReconciliationService — vía garantizada (PT-080)', () => {
  let service: PaymentReconciliationService;
  let dueForCheck: jest.Mock;
  let scheduleNextCheck: jest.Mock;
  let expire: jest.Mock;
  let applyProviderResult: jest.Mock;
  let findByReference: jest.Mock;
  let findPaypal: jest.Mock;

  const cycle = (overrides: Record<string, unknown> = {}) => ({
    id: 'cycle-1',
    provider: 'MERCADO_PAGO',
    reference: REFERENCE,
    userId: '08b22a46-49a4-4ece-a8ff-021cce24ed70',
    amount: 250,
    status: 'REQUESTED',
    requestedAt: new Date(),
    checkCount: 0,
    providerRef: null,
    ...overrides,
  });

  const approved = () => ({
    paymentId: '169718720683',
    externalId: REFERENCE,
    status: 'COMPLETED' as const,
    amount: 250,
  });

  beforeEach(async () => {
    dueForCheck = jest.fn().mockResolvedValue([]);
    scheduleNextCheck = jest.fn().mockResolvedValue(undefined);
    expire = jest.fn().mockResolvedValue(undefined);
    applyProviderResult = jest
      .fn()
      .mockResolvedValue({ shouldCredit: true, outcome: 'PROCESSED', cycleId: 'cycle-1' });
    findByReference = jest.fn().mockResolvedValue(null);
    findPaypal = jest.fn().mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentReconciliationService,
        {
          provide: PaymentCycleService,
          useValue: {
            dueForCheck,
            scheduleNextCheck,
            expire,
            isExpired: (c: { requestedAt: Date }) =>
              Date.now() - new Date(c.requestedAt).getTime() > 72 * 3600_000,
          },
        },
        {
          // PT-086: la traza nunca bloquea; en tests basta con un doble silencioso.
          provide: PaymentTraceService,
          useValue: { record: jest.fn().mockResolvedValue(undefined), byReference: jest.fn() },
        },
        { provide: PaymentsService, useValue: { applyProviderResult } },
        {
          // PT-087: el reconciliador ya no conoce pasarelas. Resuelve por registro, igual
          // que el resto del núcleo desde PT-080.
          provide: PaymentProviderRegistry,
          useValue: {
            resolve: (key: string) =>
              key === 'MERCADO_PAGO'
                ? { key: 'MERCADO_PAGO', findPayment: findByReference }
                : key === 'PAYPAL'
                  ? { key: 'PAYPAL', findPayment: findPaypal }
                  : null,
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

    service = module.get(PaymentReconciliationService);
  });

  it('B-11: un pago aprobado SIN notificación se acredita por consulta', async () => {
    dueForCheck.mockResolvedValue([cycle()]);
    findByReference.mockResolvedValue(approved());

    await service.reconcilePending();

    expect(applyProviderResult).toHaveBeenCalledWith(
      'MERCADO_PAGO',
      expect.objectContaining({ paymentId: '169718720683' }),
      'POLL',
    );
  });

  it('B-12: si la pasarela aún no tiene pago, reprograma la siguiente consulta', async () => {
    dueForCheck.mockResolvedValue([cycle()]);
    findByReference.mockResolvedValue(null);

    await service.reconcilePending();

    expect(scheduleNextCheck).toHaveBeenCalledWith(expect.objectContaining({ id: 'cycle-1' }));
    expect(applyProviderResult).not.toHaveBeenCalled();
  });

  it('B-13: pasadas 72 h sin resolver, el ciclo expira y NO acredita', async () => {
    const viejo = new Date(Date.now() - 73 * 3600_000);
    dueForCheck.mockResolvedValue([cycle({ requestedAt: viejo })]);
    findByReference.mockResolvedValue(approved());

    await service.reconcilePending();

    expect(expire).toHaveBeenCalledWith('cycle-1');
    expect(applyProviderResult).not.toHaveBeenCalled();
  });

  it('B-14: un pago en efectivo pendiente a las 48 h NO expira antes de tiempo', async () => {
    const hace48h = new Date(Date.now() - 48 * 3600_000);
    dueForCheck.mockResolvedValue([cycle({ requestedAt: hace48h })]);
    findByReference.mockResolvedValue(null);

    await service.reconcilePending();

    expect(expire).not.toHaveBeenCalled();
    expect(scheduleNextCheck).toHaveBeenCalled();
  });

  it('B-15: si el ciclo ya se cerró por webhook, la consulta no vuelve a acreditar', async () => {
    // El ciclo llega a la consulta ya SETTLED: `evaluate` lo marcara duplicado.
    dueForCheck.mockResolvedValue([cycle()]);
    findByReference.mockResolvedValue(approved());
    applyProviderResult.mockResolvedValue({
      shouldCredit: false,
      outcome: 'DUPLICATE',
      cycleId: 'cycle-1',
    });

    await expect(service.reconcilePending()).resolves.toBeUndefined();
  });

  it('B-16: un fallo consultando un ciclo no interrumpe el resto', async () => {
    dueForCheck.mockResolvedValue([cycle({ id: 'c-1' }), cycle({ id: 'c-2' })]);
    findByReference.mockRejectedValueOnce(new Error('MP caido')).mockResolvedValueOnce(approved());

    await service.reconcilePending();

    expect(applyProviderResult).toHaveBeenCalledTimes(1);
  });

  it('B-16b: sin ciclos pendientes no hace nada', async () => {
    await service.reconcilePending();

    expect(findByReference).not.toHaveBeenCalled();
    expect(applyProviderResult).not.toHaveBeenCalled();
  });

  // ── PT-087: la vía garantizada deja de ser de un solo proveedor ───────

  it('B-17: un ciclo de PayPal se sondea por su adaptador, no se ignora', async () => {
    // Antes de PT-087 esto devolvía `null` en duro y el pago se perdía en silencio: el
    // mismo fallo F-04 que costó 180 MXN, reintroducido para el segundo proveedor.
    dueForCheck.mockResolvedValue([
      cycle({ provider: 'PAYPAL', providerRef: '6D025229D0199593K' }),
    ]);
    findPaypal.mockResolvedValue({
      paymentId: 'CAP-9',
      externalId: REFERENCE,
      status: 'COMPLETED',
      amount: 321.5,
    });

    await service.reconcilePending();

    expect(findPaypal).toHaveBeenCalledWith({
      reference: REFERENCE,
      providerRef: '6D025229D0199593K',
    });
    expect(applyProviderResult).toHaveBeenCalledWith(
      'PAYPAL',
      expect.objectContaining({ paymentId: 'CAP-9' }),
      'POLL',
    );
  });

  it('B-18: un proveedor sin vía garantizada reprograma, no rompe el lote', async () => {
    dueForCheck.mockResolvedValue([cycle({ provider: 'STRIPE' })]);

    await service.reconcilePending();

    expect(applyProviderResult).not.toHaveBeenCalled();
    expect(scheduleNextCheck).toHaveBeenCalled();
  });

  it('B-19: el id del proveedor viaja al adaptador tal cual se guardó', async () => {
    dueForCheck.mockResolvedValue([cycle({ providerRef: '169718720683' })]);

    await service.reconcilePending();

    expect(findByReference).toHaveBeenCalledWith({
      reference: REFERENCE,
      providerRef: '169718720683',
    });
  });
});
