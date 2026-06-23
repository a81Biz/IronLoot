import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class LotsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getLots(page = 1, blocked?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (blocked !== undefined) qs.set('blocked', blocked);
    return this.apiClient.call('GET', `/admin/lots?${qs}`);
  }

  getLot(id: string) { return this.apiClient.call('GET', `/admin/lots/${id}`); }
  blockLot(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/lots/${id}/block`, { adminUser }); }
  unblockLot(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/lots/${id}/unblock`, { adminUser }); }
  updateLot(id: string, data: Record<string, unknown>) { return this.apiClient.call('PATCH', `/admin/lots/${id}`, data); }
}
