import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LotsService {
  private readonly logger = new Logger(LotsService.name);
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

  getLots(page = 1, blocked?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (blocked !== undefined) qs.set('blocked', blocked);
    return this.call('GET', `/admin/lots?${qs}`);
  }

  getLot(id: string) { return this.call('GET', `/admin/lots/${id}`); }
  blockLot(id: string, adminUser: string) { return this.call('PATCH', `/admin/lots/${id}/block`, { adminUser }); }
  unblockLot(id: string, adminUser: string) { return this.call('PATCH', `/admin/lots/${id}/unblock`, { adminUser }); }
  updateLot(id: string, data: Record<string, unknown>) { return this.call('PATCH', `/admin/lots/${id}`, data); }
}
