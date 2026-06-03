import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
  private readonly apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';

  private async call<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.apiUrl}/api/v1${path}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': this.apiKey,
        },
      });
      if (!res.ok) {
        this.logger.warn(`Admin API GET ${path} → ${res.status}`);
        return null;
      }
      return res.json() as Promise<T>;
    } catch (e) {
      this.logger.error(`Admin API call failed: GET ${path}`, e);
      return null;
    }
  }

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
    return this.call(`/admin/audit-logs?${qs}`);
  }

  async exportCsv(
    filters: { userId?: string; module?: string; action?: string; from?: string; to?: string } = {},
  ): Promise<string | null> {
    try {
      const qs = new URLSearchParams({ format: 'csv', limit: '10000' });
      if (filters.userId) qs.set('userId', filters.userId);
      if (filters.module) qs.set('module', filters.module);
      if (filters.action) qs.set('action', filters.action);
      if (filters.from) qs.set('from', filters.from);
      if (filters.to) qs.set('to', filters.to);
      const res = await fetch(`${this.apiUrl}/api/v1/admin/audit-logs?${qs}`, {
        headers: { 'X-Admin-Key': this.apiKey },
      });
      if (!res.ok) return null;
      return res.text();
    } catch (e) {
      this.logger.error('exportCsv failed', e);
      return null;
    }
  }
}
