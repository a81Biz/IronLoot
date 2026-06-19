import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  private readonly apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
  private readonly apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';

  private async call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    try {
      const res = await fetch(`${this.apiUrl}/api/v1${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        this.logger.warn(`Admin API ${method} ${path} → ${res.status}`);
        return null;
      }
      return res.json() as Promise<T>;
    } catch (e) {
      this.logger.error(`Admin API call failed: ${method} ${path}`, e);
      return null;
    }
  }

  getPlatformConfig() { return this.call('GET', '/admin/configuration/platform'); }
  updatePlatformConfig(updates: Record<string, string>, adminUser: string) {
    return this.call('PUT', '/admin/configuration/platform', { updates, adminUser });
  }

  getCfdiConfig() { return this.call('GET', '/admin/configuration/cfdi'); }
  updateCfdiConfig(data: Record<string, string | undefined>, adminUser: string) {
    return this.call('PUT', '/admin/configuration/cfdi', { ...data, adminUser });
  }

  getPaymentConfig() { return this.call('GET', '/admin/system/payment-config'); }
  updatePaymentConfig(providers: string[], primaryCardProvider: string) {
    return this.call('PUT', '/admin/system/payment-config', { providers, primaryCardProvider });
  }

  getSmtpConfig() { return this.call('GET', '/admin/configuration/smtp'); }
  updateSmtpConfig(updates: Record<string, string>, adminUser: string) {
    return this.call('PUT', '/admin/configuration/smtp', { updates, adminUser });
  }

  getStorageConfig() { return this.call('GET', '/admin/configuration/storage'); }
  updateStorageConfig(updates: Record<string, string>, adminUser: string) {
    return this.call('PUT', '/admin/configuration/storage', { updates, adminUser });
  }
}
