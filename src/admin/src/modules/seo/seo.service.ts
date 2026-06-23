import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class SeoService {
  constructor(private readonly apiClient: AdminApiClient) {}

  updateSeoConfig(page: string, config: Record<string, string>) {
    return this.apiClient.call('PUT', `/admin/seo/${page}`, config);
  }
}
