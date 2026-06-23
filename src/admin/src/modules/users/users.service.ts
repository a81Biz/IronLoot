import { Injectable } from '@nestjs/common';
import { AdminApiClient } from '../../shared/admin-api-client.service';

@Injectable()
export class UsersService {
  constructor(private readonly apiClient: AdminApiClient) {}

  getUsers(page = 1, limit = 20, q?: string) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) qs.set('q', q);
    return this.apiClient.call('GET', `/admin/users?${qs}`);
  }

  getUser(id: string) { return this.apiClient.call('GET', `/admin/users/${id}`); }

  updateUser(id: string, data: Record<string, unknown>) {
    return this.apiClient.call('PATCH', `/admin/users/${id}`, data);
  }
}
