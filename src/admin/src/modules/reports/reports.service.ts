import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class ReportsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getReport(type: string, from?: string, to?: string) {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const query = qs.toString();
    return this.apiClient.call('GET', `/admin/reports/${type}${query ? `?${query}` : ''}`);
  }

  async downloadCsv(type: string, from?: string, to?: string): Promise<string | null> {
    const qs = new URLSearchParams({ format: 'csv' });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const ab = await this.apiClient.callRaw(`/admin/reports/${type}?${qs}`);
    return ab ? Buffer.from(ab).toString('utf-8') : null;
  }
}
