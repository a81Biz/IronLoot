import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class OrdersService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getOrders(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/orders?${qs}`);
  }
}
