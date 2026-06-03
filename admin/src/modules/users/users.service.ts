import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
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

  getUsers(page = 1, limit = 20, q?: string) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) qs.set('q', q);
    return this.call('GET', `/admin/users?${qs}`);
  }

  getUser(id: string) { return this.call('GET', `/admin/users/${id}`); }

  updateUser(id: string, data: Record<string, unknown>) {
    return this.call('PATCH', `/admin/users/${id}`, data);
  }
}
