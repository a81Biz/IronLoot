import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getCampaigns(page = 1) {
    return this.apiClient.call('GET', `/admin/notifications/campaigns?page=${page}`);
  }

  sendCampaign(body: { segment: string; title: string; body: string; channels: string[]; adminUser: string }) {
    return this.apiClient.call('POST', '/admin/notifications/campaigns', body);
  }
}
