import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class RefundsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  // PT-056 (FINDING-QA-06): resolver la lista en servidor (la página hacía fetch client-side a
  // /api/v1/admin/refunds sobre el admin app, que no tiene esa ruta → 404).
  async listRefunds(status?: string): Promise<{ items: any[] }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return (
      (await this.apiClient.call<{ items: any[] }>('GET', `/admin/refunds${qs}`)) || { items: [] }
    );
  }

  createRefund(orderId: string, amount: number, reason: string) {
    return this.apiClient.call('POST', '/admin/refunds', { orderId, amount, reason });
  }

  updateRefundStatus(id: string, status: string) {
    return this.apiClient.call('PATCH', `/admin/refunds/${id}/status`, { status });
  }
}
