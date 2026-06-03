import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
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

  getReport(type: string, from?: string, to?: string) {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const query = qs.toString();
    return this.call(`/admin/reports/${type}${query ? `?${query}` : ''}`);
  }

  async downloadCsv(type: string, from?: string, to?: string): Promise<string | null> {
    try {
      const qs = new URLSearchParams({ format: 'csv' });
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const res = await fetch(`${this.apiUrl}/api/v1/admin/reports/${type}?${qs}`, {
        headers: { 'X-Admin-Key': this.apiKey },
      });
      if (!res.ok) return null;
      return res.text();
    } catch (e) {
      this.logger.error('downloadCsv failed', e);
      return null;
    }
  }
}
