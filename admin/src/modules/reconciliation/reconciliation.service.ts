import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private readonly apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
  private readonly apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';

  async exportReconciliation(provider: string, dateFrom: string, dateTo: string): Promise<Buffer | null> {
    try {
      const res = await fetch(
        `${this.apiUrl}/api/v1/admin/reconciliation/export?provider=${provider}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
        { headers: { 'X-Admin-Key': this.apiKey } },
      );
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      this.logger.error('exportReconciliation failed', e);
      return null;
    }
  }
}
