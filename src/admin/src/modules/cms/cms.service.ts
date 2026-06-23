import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class CmsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  updateCmsContent(key: string, value: string) {
    return this.apiClient.call('PUT', `/admin/cms/${key}`, { value });
  }
}
