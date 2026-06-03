import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);
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

  getCommissionsConfig() { return this.call('GET', '/admin/financial/commissions/config'); }

  getCommissionsRecords(page = 1) {
    return this.call('GET', `/admin/financial/commissions/records?page=${page}`);
  }

  upsertGlobalRate(ratePercent: number, adminUser: string) {
    return this.call('PUT', '/admin/financial/commissions/config/global', { ratePercent, adminUser });
  }

  upsertSellerRate(sellerId: string, ratePercent: number, adminUser: string) {
    return this.call('PUT', `/admin/financial/commissions/config/seller/${sellerId}`, { ratePercent, adminUser });
  }

  deleteCommissionConfig(id: string) {
    return this.call('DELETE', `/admin/financial/commissions/config/${id}`);
  }

  markCommissionCollected(id: string) {
    return this.call('PATCH', `/admin/financial/commissions/records/${id}/mark-collected`);
  }
}
