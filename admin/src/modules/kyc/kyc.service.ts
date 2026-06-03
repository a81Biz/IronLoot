import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
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

  getKycQueue(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.call('GET', `/admin/kyc?${qs}`);
  }

  getKycSubmission(id: string) {
    return this.call('GET', `/admin/kyc/${id}`);
  }

  approveKyc(id: string, adminUser: string) {
    return this.call('PATCH', `/admin/kyc/${id}/approve`, { adminUser });
  }

  rejectKyc(id: string, reason: string, adminUser: string) {
    return this.call('PATCH', `/admin/kyc/${id}/reject`, { reason, adminUser });
  }

  requestKycCorrection(id: string, notes: string, adminUser: string) {
    return this.call('PATCH', `/admin/kyc/${id}/request-correction`, { notes, adminUser });
  }
}
