import { Injectable, Logger } from '@nestjs/common';
import { AdminApiClient } from './shared/admin-api-client.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';

  constructor(private readonly apiClient: AdminApiClient) {}

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  getStats() { return this.apiClient.call('GET', '/admin/stats'); }
  getExtendedStats() { return this.apiClient.call('GET', '/admin/dashboard/extended-stats'); }
  getRevenueByDay(days = 90) { return this.apiClient.call('GET', `/admin/dashboard/revenue-by-day?days=${days}`); }
  getNewUsersByDay(days = 30) { return this.apiClient.call('GET', `/admin/dashboard/users-by-day?days=${days}`); }

  // ─── Users ─────────────────────────────────────────────────────────────────

  getUsers(page = 1, limit = 20, q?: string) {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q) qs.set('q', q);
    return this.apiClient.call('GET', `/admin/users?${qs}`);
  }
  getUser(id: string) { return this.apiClient.call('GET', `/admin/users/${id}`); }
  updateUser(id: string, data: Record<string, unknown>) { return this.apiClient.call('PATCH', `/admin/users/${id}`, data); }

  // ─── Auctions ──────────────────────────────────────────────────────────────

  getAuctions(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/auctions?${qs}`);
  }
  getAuction(id: string) { return this.apiClient.call('GET', `/admin/auctions/${id}`); }
  cancelAuction(id: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/cancel`); }
  approveAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/approve`, { adminUser }); }
  rejectAuction(id: string, reason: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/reject`, { reason, adminUser }); }
  suspendAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/suspend`, { adminUser }); }
  forceCloseAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/force-close`, { adminUser }); }
  reopenAuction(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/auctions/${id}/reopen`, { adminUser }); }

  // ─── Lots ──────────────────────────────────────────────────────────────────

  getLots(page = 1, blocked?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (blocked !== undefined) qs.set('blocked', blocked);
    return this.apiClient.call('GET', `/admin/lots?${qs}`);
  }
  getLot(id: string) { return this.apiClient.call('GET', `/admin/lots/${id}`); }
  blockLot(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/lots/${id}/block`, { adminUser }); }
  unblockLot(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/lots/${id}/unblock`, { adminUser }); }
  updateLot(id: string, data: Record<string, unknown>) { return this.apiClient.call('PATCH', `/admin/lots/${id}`, data); }

  // ─── Orders ────────────────────────────────────────────────────────────────

  getOrders(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/orders?${qs}`);
  }

  // ─── Payments ──────────────────────────────────────────────────────────────

  getPayments(page = 1, status?: string, provider?: string, from?: string, to?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    if (provider) qs.set('provider', provider);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return this.apiClient.call('GET', `/admin/payments?${qs}`);
  }

  // ─── Commissions ───────────────────────────────────────────────────────────

  getCommissionsConfig() { return this.apiClient.call('GET', '/admin/financial/commissions/config'); }
  getCommissionsRecords(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/financial/commissions/records?${qs}`);
  }
  upsertGlobalRate(ratePercent: number, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/financial/commissions/config/global', { ratePercent, adminUser });
  }
  upsertSellerRate(sellerId: string, ratePercent: number, adminUser: string) {
    return this.apiClient.call('PUT', `/admin/financial/commissions/config/seller/${sellerId}`, { ratePercent, adminUser });
  }
  deleteCommissionConfig(id: string) { return this.apiClient.call('DELETE', `/admin/financial/commissions/config/${id}`); }
  markCommissionCollected(id: string) { return this.apiClient.call('PATCH', `/admin/financial/commissions/records/${id}/mark-collected`); }

  // ─── Reports ───────────────────────────────────────────────────────────────

  getReport(type: string, from?: string, to?: string) {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return this.apiClient.call('GET', `/admin/reports/${type}?${qs}`);
  }

  // ─── Configuration ─────────────────────────────────────────────────────────

  getPlatformConfig() { return this.apiClient.call('GET', '/admin/configuration/platform'); }
  updatePlatformConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/platform', { updates, adminUser });
  }
  getSmtpConfig() { return this.apiClient.call('GET', '/admin/configuration/smtp'); }
  updateSmtpConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/smtp', { updates, adminUser });
  }
  getStorageConfig() { return this.apiClient.call('GET', '/admin/configuration/storage'); }
  updateStorageConfig(updates: Record<string, string>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/storage', { updates, adminUser });
  }
  getCfdiConfig() { return this.apiClient.call('GET', '/admin/configuration/cfdi'); }
  updateCfdiConfig(data: Record<string, string>, adminUser: string) {
    return this.apiClient.call('PUT', '/admin/configuration/cfdi', { ...data, adminUser });
  }
  getPaymentConfig() { return this.apiClient.call('GET', '/admin/system/payment-config'); }
  updatePaymentConfig(providers: string[], primaryCardProvider: string) {
    return this.apiClient.call('PUT', '/admin/system/payment-config', { providers, primaryCardProvider });
  }

  // ─── Refunds ───────────────────────────────────────────────────────────────

  getRefunds(status?: string, page = 1) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/refunds?${qs}`);
  }
  createRefund(orderId: string, amount: number, reason: string) {
    return this.apiClient.call('POST', '/admin/refunds', { orderId, amount, reason });
  }
  updateRefundStatus(id: string, status: string) {
    return this.apiClient.call('PATCH', `/admin/refunds/${id}/status`, { status });
  }

  // ─── Reconciliation ────────────────────────────────────────────────────────

  getReconciliation(provider: string, dateFrom: string, dateTo: string) {
    return this.apiClient.call('GET', `/admin/reconciliation?provider=${provider}&dateFrom=${dateFrom}&dateTo=${dateTo}`);
  }

  async exportReconciliation(provider: string, dateFrom: string, dateTo: string): Promise<Buffer | null> {
    const ab = await this.apiClient.callRaw(`/admin/reconciliation/export?provider=${provider}&dateFrom=${dateFrom}&dateTo=${dateTo}`);
    if (!ab) return null;
    return Buffer.from(ab);
  }

  // ─── SEO ───────────────────────────────────────────────────────────────────

  getAllSeoConfigs() { return this.apiClient.call('GET', '/admin/seo'); }
  updateSeoConfig(page: string, config: Record<string, string>) {
    return this.apiClient.call('PUT', `/admin/seo/${page}`, config);
  }

  // ─── CMS ───────────────────────────────────────────────────────────────────

  getAllCmsContent() { return this.apiClient.call('GET', '/admin/cms'); }
  updateCmsContent(key: string, value: string, metadata?: Record<string, unknown>) {
    return this.apiClient.call('PUT', `/admin/cms/${key}`, { value, ...metadata });
  }

  // ─── Disputes ──────────────────────────────────────────────────────────────

  getDisputes(page = 1) { return this.apiClient.call('GET', `/admin/disputes?page=${page}`); }
  getDisputeDetail(id: string) { return this.apiClient.call('GET', `/admin/disputes/${id}`); }
  resolveDisputeBuyer(id: string, reason: string, adminUser: string) {
    return this.apiClient.call('POST', `/admin/disputes/${id}/resolve-buyer`, { reason, adminUser });
  }
  resolveDisputeSeller(id: string, reason: string, adminUser: string) {
    return this.apiClient.call('POST', `/admin/disputes/${id}/resolve-seller`, { reason, adminUser });
  }

  // ─── Audit ─────────────────────────────────────────────────────────────────

  getAuditLogs(page = 1, filters: { userId?: string; module?: string; action?: string; from?: string; to?: string } = {}) {
    const qs = new URLSearchParams({ page: String(page) });
    if (filters.userId) qs.set('userId', filters.userId);
    if (filters.module) qs.set('module', filters.module);
    if (filters.action) qs.set('action', filters.action);
    if (filters.from) qs.set('from', filters.from);
    if (filters.to) qs.set('to', filters.to);
    return this.apiClient.call('GET', `/admin/audit-logs?${qs}`);
  }

  // ─── Moderation ────────────────────────────────────────────────────────────

  getModerationQueue(page = 1) { return this.apiClient.call('GET', `/admin/moderation?page=${page}`); }
  approveModeration(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/moderation/${id}/approve`, { adminUser }); }
  rejectModeration(id: string, reason_code: string, notes: string | undefined, adminUser: string) {
    return this.apiClient.call('PATCH', `/admin/moderation/${id}/reject`, { reason_code, notes, adminUser });
  }

  // ─── KYC ───────────────────────────────────────────────────────────────────

  getKycQueue(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/kyc?${qs}`);
  }
  getKycSubmission(id: string) { return this.apiClient.call('GET', `/admin/kyc/${id}`); }
  approveKyc(id: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/kyc/${id}/approve`, { adminUser }); }
  rejectKyc(id: string, reason: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/kyc/${id}/reject`, { reason, adminUser }); }
  requestKycCorrection(id: string, notes: string, adminUser: string) { return this.apiClient.call('PATCH', `/admin/kyc/${id}/request-correction`, { notes, adminUser }); }

  // ─── CFDI ──────────────────────────────────────────────────────────────────

  getCfdiList(page = 1, status?: string) {
    const qs = new URLSearchParams({ page: String(page) });
    if (status) qs.set('status', status);
    return this.apiClient.call('GET', `/admin/cfdi?${qs}`);
  }
  generateCfdi(orderId: string) { return this.apiClient.call('POST', `/admin/cfdi/${orderId}/generate`); }
  cancelCfdi(orderId: string) { return this.apiClient.call('POST', `/admin/cfdi/${orderId}/cancel`); }

  // ─── Notifications ─────────────────────────────────────────────────────────

  getCampaigns(page = 1) { return this.apiClient.call('GET', `/admin/notifications/campaigns?page=${page}`); }
  sendCampaign(body: { segment: string; title: string; body: string; channels: string[]; adminUser: string }) {
    return this.apiClient.call('POST', '/admin/notifications/campaigns', body);
  }
}
