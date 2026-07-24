import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SystemCleanupService {
  private readonly logger = new Logger(SystemCleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * PT-043 (AUD-018): disabled cron. Audit/log retention is handled by the single authoritative
   * SystemCleanupService in the system-cleanup module (configurable LOG_RETENTION_DAYS). This
   * duplicate 90-day cron previously conflicted with the 30-day one (effective retention 30d).
   * Method kept (no @Cron) so it can be invoked manually if ever needed.
   */
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
