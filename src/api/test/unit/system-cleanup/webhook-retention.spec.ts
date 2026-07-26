import { SystemCleanupService } from '../../../src/modules/system-cleanup/system-cleanup.service';

/**
 * PT-082 — Retención de las tablas de webhooks.
 *
 * `processed_webhook_events` es la **barrera de idempotencia**: purgar una fila permite que una
 * reentrega muy tardía vuelva a acreditar el mismo pago. Por eso la retención nunca puede bajar
 * de la ventana de reintento más larga de ninguna pasarela (MP ~96 h escalando; PayPal 25
 * intentos en 3 días).
 *
 * `payment_cycles` **no se purga**: es el registro de que se pidió un pago y qué pasó con él, y
 * los ciclos en ANOMALY o EXPIRED son justo los que exigen revisión humana.
 */
describe('SystemCleanupService — retención de webhooks (PT-082)', () => {
  let service: SystemCleanupService;
  let prisma: {
    auditEvent: { deleteMany: jest.Mock };
    requestLog: { deleteMany: jest.Mock };
    processedWebhookEvent: { deleteMany: jest.Mock };
    paymentCycleEvent: { deleteMany: jest.Mock };
    paymentCycle?: { deleteMany: jest.Mock };
  };
  const originalRetention = process.env.LOG_RETENTION_DAYS;

  beforeEach(() => {
    const ok = () => ({ deleteMany: jest.fn().mockResolvedValue({ count: 0 }) });
    prisma = {
      auditEvent: ok(),
      requestLog: ok(),
      processedWebhookEvent: ok(),
      paymentCycleEvent: ok(),
      paymentCycle: ok(),
    };
    const logger = {
      child: jest.fn().mockReturnThis(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    service = new SystemCleanupService(prisma as never, logger as never);
  });

  afterEach(() => {
    if (originalRetention === undefined) delete process.env.LOG_RETENTION_DAYS;
    else process.env.LOG_RETENTION_DAYS = originalRetention;
  });

  it('R-01: purga las reservas de idempotencia antiguas', async () => {
    await service.cleanOldLogs();
    expect(prisma.processedWebhookEvent.deleteMany).toHaveBeenCalled();
  });

  it('R-02: purga los eventos del ciclo antiguos', async () => {
    await service.cleanOldLogs();
    expect(prisma.paymentCycleEvent.deleteMany).toHaveBeenCalled();
  });

  it('R-03: NUNCA purga los ciclos de pago', async () => {
    await service.cleanOldLogs();
    expect(prisma.paymentCycle!.deleteMany).not.toHaveBeenCalled();
  });

  it('R-04: la retención de webhooks nunca baja del mínimo seguro', async () => {
    // Aunque se configure una retención absurda, la barrera de idempotencia debe conservarse
    // más allá de la ventana de reintento más larga de cualquier pasarela.
    process.env.LOG_RETENTION_DAYS = '1';

    await service.cleanOldLogs();

    const corte = prisma.processedWebhookEvent.deleteMany.mock.calls[0][0].where.processedAt.lt;
    const diasAtras = (Date.now() - new Date(corte).getTime()) / 86_400_000;
    expect(diasAtras).toBeGreaterThanOrEqual(30);
  });

  it('R-05: los logs siguen purgándose con LOG_RETENTION_DAYS (sin regresión)', async () => {
    process.env.LOG_RETENTION_DAYS = '10';

    await service.cleanOldLogs();

    const corte = prisma.auditEvent.deleteMany.mock.calls[0][0].where.timestamp.lt;
    const diasAtras = (Date.now() - new Date(corte).getTime()) / 86_400_000;
    expect(Math.round(diasAtras)).toBe(10);
  });

  it('R-06: un fallo purgando una tabla no impide purgar las demás', async () => {
    prisma.processedWebhookEvent.deleteMany.mockRejectedValue(new Error('bd caida'));

    await expect(service.cleanOldLogs()).resolves.toBeUndefined();
    expect(prisma.paymentCycleEvent.deleteMany).toHaveBeenCalled();
  });
});
