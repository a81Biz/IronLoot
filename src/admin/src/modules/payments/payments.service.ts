import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getPayments(page = 1, status?: string, provider?: string, from?: string, to?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    if (provider) qs.set('provider', provider);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return this.apiClient.call('GET', `/admin/payments?${qs}`);
  }
}
