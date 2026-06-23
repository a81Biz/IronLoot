import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class AuctionsAdminService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getAuctions(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/auctions?${qs}`);
  }

  getAuction(id: string) { return this.apiClient.call('GET', `/admin/auctions/${id}`); }
  cancelAuction(id: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/cancel`); }
  approveAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/approve`, { adminUser }); }
  rejectAuction(id: string, reason: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/reject`, { reason, adminUser }); }
  suspendAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/suspend`, { adminUser }); }
  forceCloseAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/force-close`, { adminUser }); }
  reopenAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/reopen`, { adminUser }); }
}
