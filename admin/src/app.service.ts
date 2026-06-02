import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
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

  getStats() {
    return this.call('GET', '/admin/stats');
  }

  getUsers(page = 1, limit = 20, q?: string) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) qs.set('q', q);
    return this.call('GET', `/admin/users?${qs}`);
  }

  updateUser(id: string, data: Record<string, unknown>) {
    return this.call('PATCH', `/admin/users/${id}`, data);
  }

  getAuctions(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.call('GET', `/admin/auctions?${qs}`);
  }

  cancelAuction(id: string) {
    return this.call('PATCH', `/admin/auctions/${id}/cancel`);
  }

  getOrders(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.call('GET', `/admin/orders?${qs}`);
  }

  getPayments(page = 1) {
    return this.call('GET', `/admin/payments?page=${page}`);
  }

  getDisputes(page = 1) {
    return this.call('GET', `/admin/disputes?page=${page}`);
  }

  getAuditLogs(page = 1) {
    return this.call('GET', `/admin/audit-logs?page=${page}`);
  }

  getPaymentConfig() {
    return this.call('GET', '/admin/system/payment-config');
  }

  updatePaymentConfig(providers: string[], primaryCardProvider: string) {
    return this.call('PUT', '/admin/system/payment-config', { providers, primaryCardProvider });
  }
}
