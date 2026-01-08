import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SystemCleanupService {
  private readonly logger = new Logger(SystemCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Delete audit events older than 90 days.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupAuditLogs() {
    this.logger.debug('Running audit log cleanup...');
    const retentionDays = 90;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - retentionDays);

    try {
      const result = await this.prisma.auditEvent.deleteMany({
        where: {
          timestamp: { lt: dateLimit },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Deleted ${result.count} old audit events.`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup audit logs', error);
    }
  }
}
