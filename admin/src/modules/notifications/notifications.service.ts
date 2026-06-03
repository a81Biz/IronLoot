import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
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

  getCampaigns(page = 1) {
    return this.call('GET', `/admin/notifications/campaigns?page=${page}`);
  }

  sendCampaign(body: { segment: string; title: string; body: string; channels: string[]; adminUser: string }) {
    return this.call('POST', '/admin/notifications/campaigns', body);
  }
}
