import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class RefundsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  createRefund(orderId: string, amount: number, reason: string) {
    return this.apiClient.call('POST', '/admin/refunds', { orderId, amount, reason });
  }

  updateRefundStatus(id: string, status: string) {
    return this.apiClient.call('PATCH', `/admin/refunds/${id}/status`, { status });
  }
}
