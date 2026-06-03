import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CfdiService {
  private readonly logger = new Logger(CfdiService.name);
  private readonly apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
  private readonly apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';

  private async call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    try {
      const res = await fetch(`${this.apiUrl}/api/v1${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        this.logger.warn(`Admin API ${method} ${path} → ${res.status}`);
        return null;
      }
      return res.json() as Promise<T>;
    } catch (e) {
      this.logger.error(`Admin API call failed: ${method} ${path}`, e);
      return null;
    }
  }

  getCfdiList(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.call('GET', `/admin/cfdi?${qs}`);
  }

  generateCfdi(orderId: string) {
    return this.call('POST', `/admin/cfdi/${orderId}/generate`);
  }

  cancelCfdi(orderId: string) {
    return this.call('POST', `/admin/cfdi/${orderId}/cancel`);
  }

  async downloadCfdi(orderId: string, format: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/admin/cfdi/${orderId}/download/${format}`, {
        headers: { 'X-Admin-Key': this.apiKey },
      });
      if (!res.ok) {
        this.logger.warn(`Admin API GET /admin/cfdi/${orderId}/download/${format} → ${res.status}`);
        return null;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = format === 'pdf' ? 'application/pdf' : 'application/xml';
      return { buffer, contentType };
    } catch (e) {
      this.logger.error(`downloadCfdi failed: ${orderId}/${format}`, e);
      return null;
    }
  }
}
