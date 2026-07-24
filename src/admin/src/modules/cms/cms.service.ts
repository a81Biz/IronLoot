import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class CmsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  // PT-052 (FINDING-QA-10): fetch content server-side (the page previously did a client-side
  // fetch to '/api/v1/admin/cms' on the admin app, which has no such route/proxy → 404).
  async getAllContent(): Promise<Array<{ key: string; value: string; type: string }>> {
    return (
      (await this.apiClient.call<Array<{ key: string; value: string; type: string }>>(
        'GET',
        '/admin/cms',
      )) || []
    );
  }

  updateCmsContent(key: string, value: string) {
    return this.apiClient.call('PUT', `/admin/cms/${key}`, { value });
  }
}
