import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger, ChildLogger } from '../../common/observability';

/**
 * PT-082 — Retención mínima de las tablas de webhooks, en días.
 *
 * `processed_webhook_events` es la **barrera de idempotencia**: purgar una fila permite que una
 * reentrega tardía vuelva a acreditar el mismo pago. Este suelo no puede bajar de la ventana de
 * reintento más larga de ninguna pasarela integrada:
 *
 *   - Mercado Pago: reintenta a 0, 15 y 30 min, 6 h, 48 h, 96 h y después cada 96 h.
 *   - PayPal: hasta 25 intentos a lo largo de 3 días.
 *
 * 30 días dejan un margen de más de un orden de magnitud. **No reducir sin revisar antes las
 * ventanas de reintento de todas las pasarelas.**
 */
const WEBHOOK_MIN_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SystemCleanupService {
  private readonly logger: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    logger: StructuredLogger,
  ) {
    this.logger = logger.child('SystemCleanupService');
  }

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanOldLogs(): Promise<void> {
    this.logger.info('Starting system cleanup...');
    const now = new Date();

    // PT-043 (AUD-018): single authoritative retention, configurable (default 90 days).
    const retentionDays = Number(process.env.LOG_RETENTION_DAYS) || 90;
    const retentionDate = new Date(now.getTime() - retentionDays * DAY_MS);

    // PT-082: los webhooks tienen su propio suelo, independiente de la retención de logs.
    const webhookDays = Math.max(retentionDays, WEBHOOK_MIN_RETENTION_DAYS);
    const webhookDate = new Date(now.getTime() - webhookDays * DAY_MS);

    // Cada purga va aislada: un fallo en una tabla no puede impedir que se limpien las demás.
    await this.purge('audit events', () =>
      this.prisma.auditEvent.deleteMany({ where: { timestamp: { lt: retentionDate } } }),
    );

    await this.purge('request logs', () =>
      this.prisma.requestLog.deleteMany({ where: { timestamp: { lt: retentionDate } } }),
    );

    await this.purge('webhook idempotency reservations', () =>
      this.prisma.processedWebhookEvent.deleteMany({
        where: { processedAt: { lt: webhookDate } },
      }),
    );

    await this.purge('payment cycle events', () =>
      this.prisma.paymentCycleEvent.deleteMany({ where: { receivedAt: { lt: webhookDate } } }),
    );

    // `payment_cycles` NO se purga: es el registro de que se pidió un pago y qué pasó con él.
    // Los ciclos en ANOMALY o EXPIRED son justamente los que exigen revisión humana.
  }

  private async purge(what: string, run: () => Promise<{ count: number }>): Promise<void> {
    try {
      const { count } = await run();
      if (count > 0) this.logger.info(`Deleted ${count} old ${what}`);
    } catch (error) {
      this.logger.error(`Failed to purge ${what}`, error as Error);
    }
  }
}
