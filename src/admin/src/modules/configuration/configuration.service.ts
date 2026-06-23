import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class ConfigurationService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getPlatformConfig() { return this.apiClient.call('GET', '/admin/configuration/platform'); }
  updatePlatformConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/platform', { updates, adminUser });
  }

  getCfdiConfig() { return this.apiClient.call('GET', '/admin/configuration/cfdi'); }
  updateCfdiConfig(data: Record<string, string | undefined>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/cfdi', { ...data, adminUser });
  }

  getPaymentConfig() { return this.apiClient.call('GET', '/admin/system/payment-config'); }
  updatePaymentConfig(providers: string[], primaryCardProvider: string) {
    return this.apiClient.call('PUT', '/admin/system/payment-config', { providers, primaryCardProvider });
  }

  getSmtpConfig() { return this.apiClient.call('GET', '/admin/configuration/smtp'); }
  updateSmtpConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/smtp', { updates, adminUser });
  }

  getStorageConfig() { return this.apiClient.call('GET', '/admin/configuration/storage'); }
  updateStorageConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/storage', { updates, adminUser });
  }
}
