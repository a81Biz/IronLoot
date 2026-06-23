import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class DisputesService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getDisputes(page = 1) { return this.apiClient.call('GET', `/admin/disputes?page=${page}`); }
  getDisputeDetail(id: string) { return this.apiClient.call('GET', `/admin/disputes/${id}`); }

  resolveDisputeBuyer(id: string, reason: string, adminUser: string) {
    return this.apiClient.call('POST', `/admin/disputes/${id}/resolve-buyer`, { reason, adminUser });
  }

  resolveDisputeSeller(id: string, reason: string, adminUser: string) {
    return this.apiClient.call('POST', `/admin/disputes/${id}/resolve-seller`, { reason, adminUser });
  }
}
