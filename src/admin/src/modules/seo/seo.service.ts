import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class SeoService {
  constructor(private readonly apiClient: AdminApiClient) {}

  // PT-057 (FINDING-QA-06): resolver la config en servidor (la página hacía fetch client-side a
  // /api/v1/admin/seo sobre el admin app, que no tiene esa ruta → 404).
  async getAllSeo(): Promise<Array<{ page: string; title?: string; description?: string }>> {
    return (
      (await this.apiClient.call<Array<{ page: string; title?: string; description?: string }>>(
        'GET',
        '/admin/seo',
      )) || []
    );
  }

  updateSeoConfig(page: string, config: Record<string, string>) {
    return this.apiClient.call('PUT', `/admin/seo/${page}`, config);
  }
}
