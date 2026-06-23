import { Injectable, Logger } from '@nestjs/common';

/**
 * Singleton HTTP client for admin SSR → API calls.
 * Obtains a short-lived admin JWT via /admin/auth/login and refreshes it
 * automatically before expiry. Falls back to X-Admin-Key if JWT login fails
 * (e.g. when ADMIN_TOTP_SECRET is not yet configured in dev).
 */
@Injectable()
export class AdminApiClient {
  private readonly logger = new Logger(AdminApiClient.name);
  private readonly apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
  private readonly apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';
  private readonly username = process.env.ADMIN_USERNAME || 'admin';
  private readonly password = process.env.ADMIN_PASSWORD || 'admin';

  private token: string | null = null;
  private tokenExpiresAt = 0;

  private async getToken(): Promise<string | null> {
    if (this.token && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.token;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const res = await fetch(`${this.apiUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password }),
      });

      if (!res.ok) {
        this.logger.warn('Admin JWT refresh failed — falling back to API key auth');
        this.token = null;
        return null;
      }

      const { access_token, expires_in } = (await res.json()) as {
        access_token: string;
        expires_in: number;
      };
      this.token = access_token;
      this.tokenExpiresAt = Date.now() + expires_in * 1000;
      this.logger.debug('Admin JWT refreshed successfully');
      return this.token;
    } catch {
      this.logger.warn('Admin JWT refresh threw — falling back to API key auth');
      this.token = null;
      return null;
    }
  }

  async call<T>(method: string, path: string, body?: unknown): Promise<T | null> {
    const jwt = await this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    } else {
      headers['X-Admin-Key'] = this.apiKey;
    }

    try {
      const res = await fetch(`${this.apiUrl}/api/v1${path}`, {
        method,
        headers,
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

  async callRaw(path: string): Promise<ArrayBuffer | null> {
    const jwt = await this.getToken();
    const headers: Record<string, string> = {};
    if (jwt) {
      headers['Authorization'] = `Bearer ${jwt}`;
    } else {
      headers['X-Admin-Key'] = this.apiKey;
    }

    try {
      const res = await fetch(`${this.apiUrl}/api/v1${path}`, { headers });
      if (!res.ok) return null;
      return res.arrayBuffer();
    } catch {
      return null;
    }
  }
}
