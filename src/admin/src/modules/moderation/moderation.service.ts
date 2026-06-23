import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class ModerationService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getModerationQueue(page = 1) {
    return this.apiClient.call('GET', `/admin/moderation?page=${page}`);
  }

  approveModeration(id: string, adminUser: string) {
    return this.apiClient.call('PATCH', `/admin/moderation/${id}/approve`, { adminUser });
  }

  rejectModeration(id: string, reason_code: string, notes: string | undefined, adminUser: string) {
    return this.apiClient.call('PATCH', `/admin/moderation/${id}/reject`, { reason_code, notes, adminUser });
  }
}
