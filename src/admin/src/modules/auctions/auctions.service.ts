import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuctionsAdminService {
  private readonly logger = new Logger(AuctionsAdminService.name);
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

  getAuctions(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.call('GET', `/admin/auctions?${qs}`);
  }

  getAuction(id: string) { return this.call('GET', `/admin/auctions/${id}`); }
  cancelAuction(id: string) { return this.call('PATCH', `/admin/auctions/${id}/cancel`); }
  approveAuction(id: string, adminUser: string) { return this.call('PATCH', `/admin/auctions/${id}/approve`, { adminUser }); }
  rejectAuction(id: string, reason: string, adminUser: string) { return this.call('PATCH', `/admin/auctions/${id}/reject`, { reason, adminUser }); }
  suspendAuction(id: string, adminUser: string) { return this.call('PATCH', `/admin/auctions/${id}/suspend`, { adminUser }); }
  forceCloseAuction(id: string, adminUser: string) { return this.call('PATCH', `/admin/auctions/${id}/force-close`, { adminUser }); }
  reopenAuction(id: string, adminUser: string) { return this.call('PATCH', `/admin/auctions/${id}/reopen`, { adminUser }); }
}
