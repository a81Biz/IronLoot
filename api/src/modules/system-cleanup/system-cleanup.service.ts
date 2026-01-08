import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger, ChildLogger } from '../../common/observability';

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
  async cleanOldLogs() {
    this.logger.info('Starting system cleanup...');
    const now = new Date();
    // Keep logs for 30 days
    const retentionDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      const deletedAudit = await this.prisma.auditEvent.deleteMany({
        where: { timestamp: { lt: retentionDate } },
      });
      this.logger.info(`Deleted ${deletedAudit.count} old audit events`);

      const deletedRequests = await this.prisma.requestLog.deleteMany({
        where: { timestamp: { lt: retentionDate } },
      });
      this.logger.info(`Deleted ${deletedRequests.count} old request logs`);

      // Add ErrorLog/ExceptionLog if applicable from your schema
    } catch (error) {
      this.logger.error('Failed to cleanup logs', error as Error);
    }
  }
}
