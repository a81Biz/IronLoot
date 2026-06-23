import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class ReconciliationService {
  constructor(private readonly apiClient: AdminApiClient) {}

  async exportReconciliation(provider: string, dateFrom: string, dateTo: string): Promise<Buffer | null> {
    const ab = await this.apiClient.callRaw(
      `/admin/reconciliation/export?provider=${provider}&dateFrom=${dateFrom}&dateTo=${dateTo}`,
    );
    return ab ? Buffer.from(ab) : null;
  }
}
