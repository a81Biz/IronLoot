import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class AuditService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getLogs(
    page = 1,
    filters: { userId?: string; module?: string; action?: string; from?: string; to?: string } = {},
  ) {
    const qs = new URLSearchParams({ page: String(page) });
    if (filters.userId) qs.set('userId', filters.userId);
    if (filters.module) qs.set('module', filters.module);
    if (filters.action) qs.set('action', filters.action);
    if (filters.from) qs.set('from', filters.from);
    if (filters.to) qs.set('to', filters.to);
    return this.apiClient.call('GET', `/admin/audit-logs?${qs}`);
  }

  async exportCsv(
    filters: { userId?: string; module?: string; action?: string; from?: string; to?: string } = {},
  ): Promise<string | null> {
    const qs = new URLSearchParams({ format: 'csv', limit: '10000' });
    if (filters.userId) qs.set('userId', filters.userId);
    if (filters.module) qs.set('module', filters.module);
    if (filters.action) qs.set('action', filters.action);
    if (filters.from) qs.set('from', filters.from);
    if (filters.to) qs.set('to', filters.to);
    const ab = await this.apiClient.callRaw(`/admin/audit-logs?${qs}`);
    return ab ? Buffer.from(ab).toString('utf-8') : null;
  }
}
