import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class KycService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getKycQueue(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/kyc?${qs}`);
  }

  getKycSubmission(id: string) {
    return this.apiClient.call('GET', `/admin/kyc/${id}`);
  }

  approveKyc(id: string, adminUser: string) {
    return this.apiClient.call('PATCH', `/admin/kyc/${id}/approve`, { adminUser });
  }

  rejectKyc(id: string, reason: string, adminUser: string) {
    return this.apiClient.call('PATCH', `/admin/kyc/${id}/reject`, { reason, adminUser });
  }

  requestKycCorrection(id: string, notes: string, adminUser: string) {
    return this.apiClient.call('PATCH', `/admin/kyc/${id}/request-correction`, { notes, adminUser });
  }
}
