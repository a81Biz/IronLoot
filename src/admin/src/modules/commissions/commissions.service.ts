import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class CommissionsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getCommissionsConfig() { return this.apiClient.call('GET', '/admin/financial/commissions/config'); }

  getCommissionsRecords(page = 1) {
    return this.apiClient.call('GET', `/admin/financial/commissions/records?page=${page}`);
  }

  upsertGlobalRate(ratePercent: number, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/financial/commissions/config/global', { ratePercent, adminUser });
  }

  upsertSellerRate(sellerId: string, ratePercent: number, adminUser: string) {
    return this.apiClient.call('PUT', `/admin/financial/commissions/config/seller/${sellerId}`, { ratePercent, adminUser });
  }

  deleteCommissionConfig(id: string) {
    return this.apiClient.call('DELETE', `/admin/financial/commissions/config/${id}`);
  }

  markCommissionCollected(id: string) {
    return this.apiClient.call('PATCH', `/admin/financial/commissions/records/${id}/mark-collected`);
  }
}
