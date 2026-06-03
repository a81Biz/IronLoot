import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminApiKeyGuard } from './guards/admin-api-key.guard';
import { Public } from '../auth/decorators';
import { RefundsService } from '../refunds/refunds.service';
import { SeoService } from '../seo/seo.service';
import { CmsService } from '../cms/cms.service';
import { RefundStatus, CmsContentType } from '@prisma/client';

@ApiTags('admin')
@ApiSecurity('x-admin-key')
@UseGuards(AdminApiKeyGuard)
@Public()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly refundsService: RefundsService,
    private readonly seoService: SeoService,
    private readonly cmsService: CmsService,
  ) {}

  // ─── Dashboard ───────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Dashboard statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('dashboard/extended-stats')
  @ApiOperation({ summary: 'Extended dashboard KPIs' })
  getExtendedStats() {
    return this.adminService.getExtendedStats();
  }

  @Get('dashboard/revenue-by-day')
  @ApiOperation({ summary: 'Revenue grouped by day' })
  getRevenueByDay(@Query('days', new ParseIntPipe({ optional: true })) days = 90) {
    return this.adminService.getRevenueByDay(days);
  }

  @Get('dashboard/users-by-day')
  @ApiOperation({ summary: 'New users grouped by day' })
  getNewUsersByDay(@Query('days', new ParseIntPipe({ optional: true })) days = 30) {
    return this.adminService.getNewUsersByDay(days);
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List users' })
  getUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('q') q?: string,
  ) {
    return this.adminService.getUsers(page, limit, q);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'User detail with activity history' })
  getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user state' })
  updateUser(@Param('id') id: string, @Body() data: { state?: string; isSeller?: boolean }) {
    return this.adminService.updateUser(id, data);
  }

  // ─── Auctions ────────────────────────────────────────────────────────────

  @Get('auctions')
  @ApiOperation({ summary: 'List auctions' })
  getAuctions(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
  ) {
    return this.adminService.getAuctions(page, 20, status);
  }

  @Get('auctions/:id')
  @ApiOperation({ summary: 'Auction detail' })
  getAuctionDetail(@Param('id') id: string) {
    return this.adminService.getAuctionDetail(id);
  }

  @Patch('auctions/:id/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel auction' })
  cancelAuction(@Param('id') id: string) {
    return this.adminService.cancelAuction(id);
  }

  @Patch('auctions/:id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve auction (DRAFT → PUBLISHED)' })
  approveAuction(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.approveAuction(id, body.adminUser ?? 'admin');
  }

  @Patch('auctions/:id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject auction (→ DRAFT with reason)' })
  rejectAuction(@Param('id') id: string, @Body() body: { reason: string; adminUser?: string }) {
    return this.adminService.rejectAuction(id, body.reason, body.adminUser ?? 'admin');
  }

  @Patch('auctions/:id/suspend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Suspend active auction' })
  suspendAuction(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.suspendAuction(id, body.adminUser ?? 'admin');
  }

  @Patch('auctions/:id/force-close')
  @HttpCode(200)
  @ApiOperation({ summary: 'Force close active auction' })
  forceCloseAuction(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.forceCloseAuction(id, body.adminUser ?? 'admin');
  }

  @Patch('auctions/:id/reopen')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reopen closed/cancelled/suspended auction' })
  reopenAuction(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.reopenAuction(id, body.adminUser ?? 'admin');
  }

  // ─── Lots ────────────────────────────────────────────────────────────────

  @Get('lots')
  @ApiOperation({ summary: 'List lots (auctions) with admin filters' })
  getLots(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('blocked') blocked?: string,
  ) {
    return this.adminService.getLots(page, 20, blocked);
  }

  @Get('lots/:id')
  @ApiOperation({ summary: 'Lot detail' })
  getLot(@Param('id') id: string) {
    return this.adminService.getAuctionDetail(id);
  }

  @Patch('lots/:id/block')
  @HttpCode(200)
  @ApiOperation({ summary: 'Block lot (hide from public)' })
  blockLot(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.blockLot(id, body.adminUser ?? 'admin');
  }

  @Patch('lots/:id/unblock')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unblock lot' })
  unblockLot(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.unblockLot(id, body.adminUser ?? 'admin');
  }

  @Patch('lots/:id')
  @ApiOperation({ summary: 'Update lot admin fields (notes)' })
  updateLot(@Param('id') id: string, @Body() body: { adminNotes?: string }) {
    return this.adminService.updateLot(id, body);
  }

  // ─── Orders ──────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'List orders' })
  getOrders(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
  ) {
    return this.adminService.getOrders(page, 20, status);
  }

  // ─── Payments ────────────────────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List payments with filters' })
  getPayments(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getPaymentsFiltered(page, 20, status, provider, from, to);
  }

  // ─── Financial — Commissions ──────────────────────────────────────────────

  @Get('financial/commissions/config')
  @ApiOperation({ summary: 'Get commission configuration' })
  getCommissionsConfig() {
    return this.adminService.getCommissionsConfig();
  }

  @Put('financial/commissions/config/global')
  @ApiOperation({ summary: 'Update global commission rate' })
  updateGlobalRate(@Body() body: { ratePercent: number; adminUser?: string }) {
    return this.adminService.upsertGlobalRate(body.ratePercent, body.adminUser ?? 'admin');
  }

  @Put('financial/commissions/config/seller/:sellerId')
  @ApiOperation({ summary: 'Update seller-specific commission rate' })
  updateSellerRate(
    @Param('sellerId') sellerId: string,
    @Body() body: { ratePercent: number; adminUser?: string },
  ) {
    return this.adminService.upsertSellerRate(
      sellerId,
      body.ratePercent,
      body.adminUser ?? 'admin',
    );
  }

  @Delete('financial/commissions/config/:id')
  @ApiOperation({ summary: 'Delete commission config override' })
  deleteCommissionConfig(@Param('id') id: string) {
    return this.adminService.deleteCommissionConfig(id);
  }

  @Get('financial/commissions/records')
  @ApiOperation({ summary: 'Get commission records ledger' })
  getCommissionsRecords(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
  ) {
    return this.adminService.getCommissionsRecords(page, status);
  }

  @Patch('financial/commissions/records/:id/mark-collected')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark commission record as collected' })
  markCommissionCollected(@Param('id') id: string) {
    return this.adminService.markCommissionCollected(id);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────

  @Get('reports/financial')
  @ApiOperation({ summary: 'Financial report' })
  async getFinancialReport(
    @Res({ passthrough: true }) res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format = 'json',
  ) {
    const fromDate = from
      ? new Date(from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    const data = await this.adminService.getFinancialReport(fromDate, toDate);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=financial-report.csv`);
      const header = 'date,sales,commissions\n';
      const rows = data.by_day.map((r) => `${r.date},${r.sales},${r.commissions}`).join('\n');
      return header + rows;
    }
    return data;
  }

  @Get('reports/operational')
  @ApiOperation({ summary: 'Operational report' })
  async getOperationalReport(
    @Res({ passthrough: true }) res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format = 'json',
  ) {
    const fromDate = from
      ? new Date(from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    const data = await this.adminService.getOperationalReport(fromDate, toDate);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=operational-report.csv');
      return `auctions_total,conversion_rate,avg_bids,new_users\n${data.auctions_total},${data.conversion_rate},${data.avg_bids_per_auction},${data.new_users}`;
    }
    return data;
  }

  @Get('reports/fiscal')
  @ApiOperation({ summary: 'Fiscal report' })
  async getFiscalReport(
    @Res({ passthrough: true }) res: Response,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format = 'json',
  ) {
    const fromDate = from
      ? new Date(from)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to ? new Date(to) : new Date();
    const data = await this.adminService.getFiscalReport(fromDate, toDate);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=fiscal-report.csv');
      return `cfdi_emitted,cfdi_cancelled,cfdi_pending,iva_total\n${data.cfdi_emitted},${data.cfdi_cancelled},${data.cfdi_pending},${data.iva_total}`;
    }
    return data;
  }

  // ─── Platform Configuration ───────────────────────────────────────────────

  @Get('configuration/platform')
  @ApiOperation({ summary: 'Get platform configuration' })
  getPlatformConfig() {
    return this.adminService.getPlatformConfig();
  }

  @Put('configuration/platform')
  @ApiOperation({ summary: 'Update platform configuration' })
  updatePlatformConfig(@Body() body: { updates: Record<string, string>; adminUser?: string }) {
    return this.adminService.updatePlatformConfig(body.updates, body.adminUser ?? 'admin');
  }

  @Get('configuration/smtp')
  @ApiOperation({ summary: 'Get SMTP configuration (secrets masked)' })
  getSmtpConfig() {
    return this.adminService.getSmtpConfig();
  }

  @Put('configuration/smtp')
  @ApiOperation({ summary: 'Update SMTP configuration' })
  updateSmtpConfig(@Body() body: { updates: Record<string, string>; adminUser?: string }) {
    return this.adminService.updateSmtpConfig(body.updates, body.adminUser ?? 'admin');
  }

  @Get('configuration/storage')
  @ApiOperation({ summary: 'Get storage configuration (secrets masked)' })
  getStorageConfig() {
    return this.adminService.getStorageConfig();
  }

  @Put('configuration/storage')
  @ApiOperation({ summary: 'Update storage configuration' })
  updateStorageConfig(@Body() body: { updates: Record<string, string>; adminUser?: string }) {
    return this.adminService.updateStorageConfig(body.updates, body.adminUser ?? 'admin');
  }

  @Get('configuration/cfdi')
  @ApiOperation({ summary: 'Get CFDI configuration' })
  getCfdiConfig() {
    return this.adminService.getCfdiConfig();
  }

  @Put('configuration/cfdi')
  @ApiOperation({ summary: 'Update CFDI configuration' })
  updateCfdiConfig(
    @Body() body: { rfcEmisor?: string; pacUrl?: string; pacApiKey?: string; adminUser?: string },
  ) {
    const { adminUser, ...data } = body;
    return this.adminService.updateCfdiConfig(data, adminUser ?? 'admin');
  }

  @Get('system/payment-config')
  @ApiOperation({ summary: 'Get payment provider configuration' })
  getPaymentConfig() {
    return this.adminService.getPaymentConfig();
  }

  @Put('system/payment-config')
  @ApiOperation({ summary: 'Update payment provider configuration' })
  updatePaymentConfig(@Body() body: { providers: string[]; primaryCardProvider: string }) {
    return this.adminService.updatePaymentConfig(body.providers, body.primaryCardProvider);
  }

  // ─── Disputes ────────────────────────────────────────────────────────────

  @Get('disputes')
  @ApiOperation({ summary: 'List disputes' })
  getDisputes(@Query('page', new ParseIntPipe({ optional: true })) page = 1) {
    return this.adminService.getDisputes(page);
  }

  // ─── Audit ───────────────────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Audit log with filters' })
  async getAuditLogs(
    @Res({ passthrough: true }) res: Response,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('format') format = 'json',
  ) {
    const data = await this.adminService.getAuditLogsFiltered(page, 50, {
      userId,
      module,
      action,
      from,
      to,
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit.csv');
      const header = 'id,eventType,actorUserId,entityType,entityId,result,createdAt\n';
      const rows = data.data
        .map(
          (r: any) =>
            `${r.id},${r.eventType},${r.actorUserId ?? ''},${r.entityType ?? ''},${r.entityId ?? ''},${r.result},${r.createdAt}`,
        )
        .join('\n');
      return header + rows;
    }
    return data;
  }

  // ─── Moderation ──────────────────────────────────────────────────────────

  @Get('moderation')
  @ApiOperation({ summary: 'Get moderation queue' })
  getModerationQueue(@Query('page', new ParseIntPipe({ optional: true })) page = 1) {
    return this.adminService.getModerationQueue(page);
  }

  @Patch('moderation/:id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve auction moderation' })
  approveModeration(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.approveModeration(id, body.adminUser ?? 'admin');
  }

  @Patch('moderation/:id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject auction moderation' })
  rejectModeration(
    @Param('id') id: string,
    @Body() body: { reason_code: string; notes?: string; adminUser?: string },
  ) {
    return this.adminService.rejectModeration(
      id,
      body.reason_code,
      body.notes,
      body.adminUser ?? 'admin',
    );
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────

  @Get('kyc')
  @ApiOperation({ summary: 'KYC submissions queue' })
  getKycQueue(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
  ) {
    return this.adminService.getKycQueue(page, status);
  }

  @Get('kyc/:id')
  @ApiOperation({ summary: 'KYC submission detail' })
  getKycSubmission(@Param('id') id: string) {
    return this.adminService.getKycSubmission(id);
  }

  @Patch('kyc/:id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve KYC submission' })
  approveKyc(@Param('id') id: string, @Body() body: { adminUser?: string }) {
    return this.adminService.approveKyc(id, body.adminUser ?? 'admin');
  }

  @Patch('kyc/:id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject KYC submission' })
  rejectKyc(@Param('id') id: string, @Body() body: { reason: string; adminUser?: string }) {
    return this.adminService.rejectKyc(id, body.reason, body.adminUser ?? 'admin');
  }

  @Patch('kyc/:id/request-correction')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request KYC correction' })
  requestKycCorrection(
    @Param('id') id: string,
    @Body() body: { notes: string; adminUser?: string },
  ) {
    return this.adminService.requestKycCorrection(id, body.notes, body.adminUser ?? 'admin');
  }

  // ─── CFDI ────────────────────────────────────────────────────────────────

  @Get('cfdi')
  @ApiOperation({ summary: 'List CFDI records' })
  getCfdiList(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('status') status?: string,
  ) {
    return this.adminService.getCfdiList(page, status);
  }

  @Get('cfdi/:orderId')
  @ApiOperation({ summary: 'Get CFDI record for order' })
  getCfdi(@Param('orderId') orderId: string) {
    return this.adminService.getCfdi(orderId);
  }

  @Post('cfdi/:orderId/generate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Generate CFDI for order' })
  generateCfdi(@Param('orderId') orderId: string) {
    return this.adminService.generateCfdi(orderId);
  }

  @Post('cfdi/:orderId/cancel')
  @HttpCode(200)
  @ApiOperation({ summary: 'Cancel CFDI' })
  cancelCfdi(@Param('orderId') orderId: string) {
    return this.adminService.cancelCfdi(orderId);
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  @Post('notifications/campaigns')
  @ApiOperation({ summary: 'Create and send bulk notification campaign' })
  sendCampaign(
    @Body()
    body: {
      segment: string;
      title: string;
      body: string;
      channels: string[];
      adminUser?: string;
    },
  ) {
    return this.adminService.sendBulkNotification(
      body.segment,
      body.title,
      body.body,
      body.channels,
      body.adminUser ?? 'admin',
    );
  }

  @Get('notifications/campaigns')
  @ApiOperation({ summary: 'List notification campaigns' })
  getCampaigns(@Query('page', new ParseIntPipe({ optional: true })) page = 1) {
    return this.adminService.getCampaigns(page);
  }

  // ─── Refunds (PT-013) ─────────────────────────────────────────────────────

  @Get('refunds')
  @ApiOperation({ summary: 'List refund requests' })
  getRefunds(
    @Query('status') status?: RefundStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
  ) {
    return this.refundsService.listRefunds(status, page);
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Create refund for an order' })
  createRefund(
    @Body() body: { orderId: string; amount: number; reason: string; adminUser?: string },
  ) {
    return this.refundsService.createRefund(
      body.orderId,
      body.amount,
      body.reason,
      body.adminUser ?? 'admin',
    );
  }

  @Patch('refunds/:id/status')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update refund status' })
  updateRefundStatus(@Param('id') id: string, @Body() body: { status: RefundStatus }) {
    return this.refundsService.updateStatus(id, body.status);
  }

  // ─── Reconciliation (PT-013) ──────────────────────────────────────────────

  @Get('reconciliation')
  @ApiOperation({ summary: 'Reconcile payments by provider and date range' })
  reconcile(
    @Query('provider') provider: 'MERCADO_PAGO' | 'PAYPAL',
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.adminService.reconcilePayments(provider, new Date(dateFrom), new Date(dateTo));
  }

  @Get('reconciliation/export')
  @ApiOperation({ summary: 'Export reconciliation as CSV' })
  async reconcileExport(
    @Query('provider') provider: 'MERCADO_PAGO' | 'PAYPAL',
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Res() res: Response,
  ) {
    const data = await this.adminService.reconcilePayments(
      provider,
      new Date(dateFrom),
      new Date(dateTo),
    );
    const rows = [
      'externalId,internalId,amount,status,source',
      ...(data.internalOnly ?? []).map(
        (p: any) => `${p.externalId},${p.id},${p.amount},${p.status},INTERNAL_ONLY`,
      ),
      ...(data.providerOnly ?? []).map((p: any) => `${p.id},,${p.amount},,PROVIDER_ONLY`),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="reconciliation-${provider}-${dateFrom}.csv"`,
    );
    return res.send(rows);
  }

  // ─── Dispute Resolution (PT-013) ──────────────────────────────────────────

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute detail by ID' })
  getDisputeById(@Param('id') id: string) {
    return this.adminService.getDisputeById(id);
  }

  @Post('disputes/:id/resolve-buyer')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resolve dispute in favor of buyer (triggers refund)' })
  resolveDisputeBuyer(
    @Param('id') id: string,
    @Body() body: { reason: string; adminUser?: string },
  ) {
    return this.adminService.resolveDisputeFavorBuyer(id, body.reason, body.adminUser ?? 'admin');
  }

  @Post('disputes/:id/resolve-seller')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resolve dispute in favor of seller' })
  resolveDisputeSeller(
    @Param('id') id: string,
    @Body() body: { reason: string; adminUser?: string },
  ) {
    return this.adminService.resolveDisputeFavorSeller(id, body.reason, body.adminUser ?? 'admin');
  }

  @Post('disputes/:id/request-evidence')
  @HttpCode(200)
  @ApiOperation({ summary: 'Request additional evidence from dispute parties' })
  requestEvidence(@Param('id') id: string, @Body() body: { message: string; adminUser?: string }) {
    return this.adminService.requestDisputeEvidence(id, body.message, body.adminUser ?? 'admin');
  }

  // ─── SEO (PT-013) ─────────────────────────────────────────────────────────

  @Get('seo')
  @ApiOperation({ summary: 'Get all SEO configurations' })
  getAllSeo() {
    return this.seoService.getAllSeoConfigs();
  }

  @Put('seo/:page')
  @ApiOperation({ summary: 'Update SEO config for a page' })
  updateSeo(
    @Param('page') page: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      adminUser?: string;
    },
  ) {
    const { adminUser, ...config } = body;
    return this.seoService.setSeoConfig(page, config, adminUser ?? 'admin');
  }

  // ─── CMS (PT-013) ─────────────────────────────────────────────────────────

  @Get('cms')
  @ApiOperation({ summary: 'Get all CMS content blocks' })
  getAllCms() {
    return this.cmsService.getAllContent();
  }

  @Put('cms/:key')
  @ApiOperation({ summary: 'Update a CMS content block' })
  updateCms(
    @Param('key') key: string,
    @Body() body: { value: string; type?: CmsContentType; adminUser?: string },
  ) {
    return this.cmsService.setContent(
      key,
      body.value,
      body.type ?? CmsContentType.TEXT,
      body.adminUser ?? 'admin',
    );
  }
}
