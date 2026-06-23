import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class CfdiService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getCfdiList(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/cfdi?${qs}`);
  }

  generateCfdi(orderId: string) {
    return this.apiClient.call('POST', `/admin/cfdi/${orderId}/generate`);
  }

  cancelCfdi(orderId: string) {
    return this.apiClient.call('POST', `/admin/cfdi/${orderId}/cancel`);
  }

  async downloadCfdi(orderId: string, format: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const ab = await this.apiClient.callRaw(`/admin/cfdi/${orderId}/download/${format}`);
    if (!ab) return null;
    const buffer = Buffer.from(ab);
    const contentType = format === 'pdf' ? 'application/pdf' : 'application/xml';
    return { buffer, contentType };
  }
}
