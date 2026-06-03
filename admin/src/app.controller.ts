import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  ParseIntPipe,
} from '@nestjs/common';
import { AppService } from './app.service';
import { AdminAuthGuard } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ─── Auth ────────────────────────────────────────────────────────────────

  @Get('login')
  loginPage(@Req() req, @Res() res) {
    if (req.session?.isAdmin) return res.redirect('/');
    return res.render('pages/login', { title: 'Iron Loot Admin' });
  }

  @Post('login')
  @HttpCode(200)
  async loginAction(@Body() body: { username: string; password: string }, @Req() req, @Res() res) {
    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPass = process.env.ADMIN_PASSWORD || 'admin';

    if (body.username === expectedUser && body.password === expectedPass) {
      req.session.isAdmin = true;
      req.session.adminUser = body.username;
      return res.redirect('/');
    }

    return res.render('pages/login', {
      title: 'Iron Loot Admin',
      error: 'Credenciales incorrectas',
    });
  }

  @Post('logout')
  logout(@Req() req, @Res() res) {
    req.session.destroy(() => res.redirect('/login'));
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AdminAuthGuard)
  async dashboard(@Req() req, @Res() res) {
    const stats = await this.appService.getExtendedStats() ?? await this.appService.getStats();
    return res.render('pages/dashboard', {
      title: 'Dashboard',
      stats,
      adminUser: req.session.adminUser,
      activePage: 'dashboard',
    });
  }

  // ─── API proxy for dashboard charts (called by JS) ───────────────────────

  @Get('api/dashboard/extended-stats')
  @UseGuards(AdminAuthGuard)
  async apiExtendedStats() {
    return this.appService.getExtendedStats();
  }

  @Get('api/dashboard/revenue-by-day')
  @UseGuards(AdminAuthGuard)
  async apiRevenueByDay(@Query('days') days = '90') {
    return this.appService.getRevenueByDay(Number(days));
  }

  @Get('api/dashboard/users-by-day')
  @UseGuards(AdminAuthGuard)
  async apiUsersByDay(@Query('days') days = '30') {
    return this.appService.getNewUsersByDay(Number(days));
  }

  // ─── Users ───────────────────────────────────────────────────────────────

  @Get('users')
  @UseGuards(AdminAuthGuard)
  async users(@Req() req, @Res() res, @Query('page') page = '1', @Query('q') q?: string) {
    const result = await this.appService.getUsers(Number(page), 20, q);
    return res.render('pages/users', {
      title: 'Usuarios',
      result,
      q,
      adminUser: req.session.adminUser,
      activePage: 'users',
    });
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  async userDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const user = await this.appService.getUser(id);
    return res.render('pages/user-detail', {
      title: 'Detalle de usuario',
      user,
      adminUser: req.session.adminUser,
      activePage: 'users',
    });
  }

  @Post('users/:id/suspend')
  @UseGuards(AdminAuthGuard)
  async suspendUser(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.updateUser(id, { state: 'SUSPENDED' });
    return res.redirect(`/users/${id}`);
  }

  @Post('users/:id/ban')
  @UseGuards(AdminAuthGuard)
  async banUser(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.updateUser(id, { state: 'BANNED' });
    return res.redirect('/users');
  }

  @Post('users/:id/unban')
  @UseGuards(AdminAuthGuard)
  async unbanUser(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.updateUser(id, { state: 'ACTIVE' });
    return res.redirect('/users');
  }

  @Post('users/:id/enable-seller')
  @UseGuards(AdminAuthGuard)
  async enableSeller(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.updateUser(id, { isSeller: true });
    return res.redirect(`/users/${id}`);
  }

  @Post('users/:id/disable-seller')
  @UseGuards(AdminAuthGuard)
  async disableSeller(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.updateUser(id, { isSeller: false });
    return res.redirect(`/users/${id}`);
  }

  // ─── Auctions ────────────────────────────────────────────────────────────

  @Get('auctions')
  @UseGuards(AdminAuthGuard)
  async auctions(@Req() req, @Res() res, @Query('page') page = '1', @Query('status') status?: string) {
    const result = await this.appService.getAuctions(Number(page), status);
    return res.render('pages/auctions', {
      title: 'Subastas',
      result,
      status,
      adminUser: req.session.adminUser,
      activePage: 'auctions',
    });
  }

  @Get('auctions/:id')
  @UseGuards(AdminAuthGuard)
  async auctionDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const auction = await this.appService.getAuction(id);
    return res.render('pages/auction-detail', {
      title: 'Detalle de subasta',
      auction,
      adminUser: req.session.adminUser,
      activePage: 'auctions',
    });
  }

  @Post('auctions/:id/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.cancelAuction(id);
    return res.redirect('/auctions');
  }

  @Post('auctions/:id/approve')
  @UseGuards(AdminAuthGuard)
  async approveAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.approveAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/reject')
  @UseGuards(AdminAuthGuard)
  async rejectAuction(@Param('id') id: string, @Body() body: { reason: string }, @Req() req, @Res() res) {
    await this.appService.rejectAuction(id, body.reason, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/suspend')
  @UseGuards(AdminAuthGuard)
  async suspendAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.suspendAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/force-close')
  @UseGuards(AdminAuthGuard)
  async forceCloseAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.forceCloseAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/reopen')
  @UseGuards(AdminAuthGuard)
  async reopenAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.reopenAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  // ─── Lots ────────────────────────────────────────────────────────────────

  @Get('lots')
  @UseGuards(AdminAuthGuard)
  async lots(@Req() req, @Res() res, @Query('page') page = '1', @Query('blocked') blocked?: string) {
    const result = await this.appService.getLots(Number(page), blocked);
    return res.render('pages/lots', {
      title: 'Lotes',
      result,
      blocked,
      adminUser: req.session.adminUser,
      activePage: 'lots',
    });
  }

  @Get('lots/:id')
  @UseGuards(AdminAuthGuard)
  async lotDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const lot = await this.appService.getLot(id);
    return res.render('pages/lot-detail', {
      title: 'Detalle de lote',
      lot,
      adminUser: req.session.adminUser,
      activePage: 'lots',
    });
  }

  @Post('lots/:id/block')
  @UseGuards(AdminAuthGuard)
  async blockLot(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.blockLot(id, req.session.adminUser);
    return res.redirect(`/lots/${id}`);
  }

  @Post('lots/:id/unblock')
  @UseGuards(AdminAuthGuard)
  async unblockLot(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.unblockLot(id, req.session.adminUser);
    return res.redirect(`/lots/${id}`);
  }

  @Post('lots/:id/update')
  @UseGuards(AdminAuthGuard)
  async updateLot(@Param('id') id: string, @Body() body: any, @Req() req, @Res() res) {
    await this.appService.updateLot(id, { adminNotes: body.adminNotes });
    return res.redirect(`/lots/${id}`);
  }

  @Post('lots/:id/update-category')
  @UseGuards(AdminAuthGuard)
  async updateLotCategory(@Param('id') id: string, @Body() body: any, @Req() req, @Res() res) {
    if (body.categoryId) {
      await this.appService.updateLot(id, { adminNotes: `Category changed to: ${body.categoryId}` });
    }
    return res.redirect(`/lots/${id}`);
  }

  // ─── Orders ──────────────────────────────────────────────────────────────

  @Get('orders')
  @UseGuards(AdminAuthGuard)
  async orders(@Req() req, @Res() res, @Query('page') page = '1', @Query('status') status?: string) {
    const result = await this.appService.getOrders(Number(page), status);
    return res.render('pages/orders', {
      title: 'Órdenes',
      result,
      adminUser: req.session.adminUser,
      activePage: 'orders',
    });
  }

  // ─── Payments ────────────────────────────────────────────────────────────

  @Get('payments')
  @UseGuards(AdminAuthGuard)
  async payments(
    @Req() req, @Res() res,
    @Query('page') page = '1',
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.appService.getPayments(Number(page), status, provider, from, to);
    return res.render('pages/payments', {
      title: 'Pagos',
      result,
      status, provider, from, to,
      adminUser: req.session.adminUser,
      activePage: 'payments',
    });
  }

  // ─── Commissions ─────────────────────────────────────────────────────────

  @Get('commissions')
  @UseGuards(AdminAuthGuard)
  async commissions(@Req() req, @Res() res, @Query('page') page = '1') {
    const [config, records] = await Promise.all([
      this.appService.getCommissionsConfig(),
      this.appService.getCommissionsRecords(Number(page)),
    ]);
    return res.render('pages/commissions', {
      title: 'Comisiones',
      config,
      records,
      adminUser: req.session.adminUser,
      activePage: 'commissions',
    });
  }

  @Post('commissions/config/global')
  @UseGuards(AdminAuthGuard)
  async updateGlobalRate(@Body() body: { ratePercent: string }, @Req() req, @Res() res) {
    await this.appService.upsertGlobalRate(Number(body.ratePercent), req.session.adminUser);
    return res.redirect('/commissions');
  }

  @Post('commissions/config/seller')
  @UseGuards(AdminAuthGuard)
  async updateSellerRate(@Body() body: { sellerId: string; ratePercent: string }, @Req() req, @Res() res) {
    await this.appService.upsertSellerRate(body.sellerId, Number(body.ratePercent), req.session.adminUser);
    return res.redirect('/commissions');
  }

  @Post('commissions/config/:id/delete')
  @UseGuards(AdminAuthGuard)
  async deleteCommissionConfig(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.deleteCommissionConfig(id);
    return res.redirect('/commissions');
  }

  @Post('commissions/records/:id/mark-collected')
  @UseGuards(AdminAuthGuard)
  async markCollected(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.markCommissionCollected(id);
    return res.redirect('/commissions');
  }

  // ─── Reports ─────────────────────────────────────────────────────────────

  @Get('reports')
  @UseGuards(AdminAuthGuard)
  async reports(@Req() req, @Res() res, @Query('type') type = 'financial', @Query('from') from?: string, @Query('to') to?: string) {
    const report = await this.appService.getReport(type, from, to);
    return res.render('pages/reports', {
      title: 'Reportes',
      report,
      reportType: type,
      from, to,
      adminUser: req.session.adminUser,
      activePage: 'reports',
    });
  }

  @Get('reports/download/:type')
  @UseGuards(AdminAuthGuard)
  async downloadReport(@Param('type') type: string, @Query('from') from: string, @Query('to') to: string, @Req() req, @Res() res) {
    const apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
    const apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';
    const qs = new URLSearchParams({ format: 'csv' });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const apiRes = await fetch(`${apiUrl}/api/v1/admin/reports/${type}?${qs}`, {
      headers: { 'X-Admin-Key': apiKey },
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    const text = await apiRes.text();
    return res.send(text);
  }

  // ─── Configuration ───────────────────────────────────────────────────────

  @Get('configuration/platform')
  @UseGuards(AdminAuthGuard)
  async platformConfig(@Req() req, @Res() res, @Query('saved') saved?: string) {
    const config = await this.appService.getPlatformConfig();
    return res.render('pages/platform-config', {
      title: 'Configuración de Plataforma',
      config,
      saved: saved === '1',
      adminUser: req.session.adminUser,
      activePage: 'platform-config',
    });
  }

  @Post('configuration/platform')
  @UseGuards(AdminAuthGuard)
  async savePlatformConfig(@Body() body: any, @Req() req, @Res() res) {
    const updates: Record<string, string> = body.updates ?? {};
    await this.appService.updatePlatformConfig(updates, req.session.adminUser);
    return res.redirect('/configuration/platform?saved=1');
  }

  @Get('configuration/cfdi')
  @UseGuards(AdminAuthGuard)
  async cfdiConfig(@Req() req, @Res() res, @Query('saved') saved?: string) {
    const config = await this.appService.getCfdiConfig();
    return res.render('pages/cfdi-config', {
      title: 'Configuración CFDI',
      config,
      saved: saved === '1',
      adminUser: req.session.adminUser,
      activePage: 'cfdi',
    });
  }

  @Post('configuration/cfdi')
  @UseGuards(AdminAuthGuard)
  async saveCfdiConfig(@Body() body: any, @Req() req, @Res() res) {
    await this.appService.updateCfdiConfig(
      { rfcEmisor: body.rfcEmisor, pacUrl: body.pacUrl, pacApiKey: body.pacApiKey || undefined },
      req.session.adminUser,
    );
    return res.redirect('/configuration/cfdi?saved=1');
  }

  @Get('settings')
  @UseGuards(AdminAuthGuard)
  async settings(@Req() req, @Res() res, @Query('saved') saved?: string) {
    const [paymentConfig, smtpConfig, storageConfig] = await Promise.all([
      this.appService.getPaymentConfig(),
      this.appService.getSmtpConfig(),
      this.appService.getStorageConfig(),
    ]);
    return res.render('pages/settings', {
      title: 'Configuración',
      config: paymentConfig,
      smtpConfig,
      storageConfig,
      saved: saved === '1',
      adminUser: req.session.adminUser,
      activePage: 'settings',
      allProviders: [
        { id: 'MERCADO_PAGO', label: 'Mercado Pago', desc: 'Tarjeta, OXXO, Saldo MP' },
        { id: 'PAYPAL', label: 'PayPal', desc: 'Tarjeta, Saldo PayPal (WPS)' },
        { id: 'STRIPE', label: 'Stripe', desc: 'Tarjeta internacional' },
        { id: 'HEY_BANCO', label: 'Hey Banco', desc: 'Banco digital mexicano (Banregio)' },
      ],
    });
  }

  @Post('settings/payment-config')
  @UseGuards(AdminAuthGuard)
  async savePaymentConfig(@Body() body: any, @Res() res) {
    const providers = Array.isArray(body.providers)
      ? body.providers
      : body.providers
      ? [body.providers]
      : [];
    await this.appService.updatePaymentConfig(providers, body.primaryCardProvider || 'MERCADO_PAGO');
    return res.redirect('/settings?saved=1');
  }

  @Post('settings/smtp')
  @UseGuards(AdminAuthGuard)
  async saveSmtpConfig(@Body() body: any, @Req() req, @Res() res) {
    const updates: Record<string, string> = {};
    if (body.SMTP_HOST) updates['SMTP_HOST'] = body.SMTP_HOST;
    if (body.SMTP_PORT) updates['SMTP_PORT'] = body.SMTP_PORT;
    if (body.SMTP_USER) updates['SMTP_USER'] = body.SMTP_USER;
    if (body.SMTP_PASSWORD) updates['SMTP_PASSWORD'] = body.SMTP_PASSWORD;
    if (body.SMTP_FROM) updates['SMTP_FROM'] = body.SMTP_FROM;
    await this.appService.updateSmtpConfig(updates, req.session.adminUser);
    return res.redirect('/settings?saved=1');
  }

  @Post('settings/storage')
  @UseGuards(AdminAuthGuard)
  async saveStorageConfig(@Body() body: any, @Req() req, @Res() res) {
    const updates: Record<string, string> = {};
    const keys = ['STORAGE_PROVIDER', 'STORAGE_BUCKET', 'STORAGE_REGION', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'];
    for (const k of keys) if (body[k]) updates[k] = body[k];
    await this.appService.updateStorageConfig(updates, req.session.adminUser);
    return res.redirect('/settings?saved=1');
  }

  // ─── Refunds ─────────────────────────────────────────────────────────────

  @Get('refunds')
  @UseGuards(AdminAuthGuard)
  async refunds(@Req() req, @Res() res) {
    return res.render('pages/refunds', {
      title: 'Reembolsos',
      adminUser: req.session.adminUser,
      activePage: 'refunds',
    });
  }

  @Post('refunds/create')
  @UseGuards(AdminAuthGuard)
  async createRefund(@Body() body: { orderId: string; amount: string; reason: string }, @Req() req, @Res() res) {
    await this.appService.createRefund(body.orderId, parseFloat(body.amount), body.reason);
    return res.redirect('/refunds');
  }

  @Post('refunds/:id/status')
  @UseGuards(AdminAuthGuard)
  async updateRefundStatus(@Param('id') id: string, @Body() body: { status: string }, @Req() req, @Res() res) {
    await this.appService.updateRefundStatus(id, body.status);
    return res.redirect('/refunds');
  }

  // ─── Reconciliation ───────────────────────────────────────────────────────

  @Get('reconciliation')
  @UseGuards(AdminAuthGuard)
  async reconciliation(@Req() req, @Res() res) {
    return res.render('pages/reconciliation', {
      title: 'Conciliación',
      adminUser: req.session.adminUser,
      activePage: 'reconciliation',
    });
  }

  @Get('reconciliation/export')
  @UseGuards(AdminAuthGuard)
  async reconciliationExport(
    @Query('provider') provider: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Req() req, @Res() res,
  ) {
    const csv = await this.appService.exportReconciliation(provider, dateFrom, dateTo);
    if (!csv) return res.status(502).send('Error al exportar');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reconciliation-${provider}-${dateFrom}.csv`);
    return res.send(csv);
  }

  // ─── SEO ─────────────────────────────────────────────────────────────────

  @Get('seo')
  @UseGuards(AdminAuthGuard)
  async seo(@Req() req, @Res() res) {
    return res.render('pages/seo', {
      title: 'SEO',
      adminUser: req.session.adminUser,
      activePage: 'seo',
    });
  }

  @Post('seo/:page')
  @UseGuards(AdminAuthGuard)
  async updateSeo(
    @Param('page') page: string,
    @Body() body: { title?: string; description?: string },
    @Req() req, @Res() res,
  ) {
    await this.appService.updateSeoConfig(page, body as Record<string, string>);
    return res.redirect('/seo');
  }

  // ─── CMS ─────────────────────────────────────────────────────────────────

  @Get('cms')
  @UseGuards(AdminAuthGuard)
  async cms(@Req() req, @Res() res) {
    return res.render('pages/cms', {
      title: 'CMS',
      adminUser: req.session.adminUser,
      activePage: 'cms',
    });
  }

  @Post('cms/:key')
  @UseGuards(AdminAuthGuard)
  async updateCms(@Param('key') key: string, @Body() body: { value: string }, @Req() req, @Res() res) {
    await this.appService.updateCmsContent(key, body.value);
    return res.redirect('/cms');
  }

  // ─── Disputes ────────────────────────────────────────────────────────────

  @Get('disputes')
  @UseGuards(AdminAuthGuard)
  async disputes(@Req() req, @Res() res, @Query('page') page = '1') {
    const result = await this.appService.getDisputes(Number(page));
    return res.render('pages/disputes', {
      title: 'Disputas',
      result,
      adminUser: req.session.adminUser,
      activePage: 'disputes',
    });
  }

  @Get('disputes/:id')
  @UseGuards(AdminAuthGuard)
  async disputeDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const dispute = await this.appService.getDisputeDetail(id);
    return res.render('pages/dispute-detail', {
      title: 'Detalle de Disputa',
      dispute,
      adminUser: req.session.adminUser,
      activePage: 'disputes',
    });
  }

  @Post('disputes/:id/resolve-buyer')
  @UseGuards(AdminAuthGuard)
  async resolveDisputeBuyer(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req, @Res() res,
  ) {
    await this.appService.resolveDisputeBuyer(id, body.reason, req.session.adminUser);
    return res.redirect('/disputes');
  }

  @Post('disputes/:id/resolve-seller')
  @UseGuards(AdminAuthGuard)
  async resolveDisputeSeller(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req, @Res() res,
  ) {
    await this.appService.resolveDisputeSeller(id, body.reason, req.session.adminUser);
    return res.redirect('/disputes');
  }

  // ─── Audit ───────────────────────────────────────────────────────────────

  @Get('audit')
  @UseGuards(AdminAuthGuard)
  async audit(
    @Req() req, @Res() res,
    @Query('page') page = '1',
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.appService.getAuditLogs(Number(page), { userId, module, action, from, to });
    return res.render('pages/audit', {
      title: 'Auditoría',
      result,
      userId, module, action, from, to,
      adminUser: req.session.adminUser,
      activePage: 'audit',
    });
  }

  @Get('audit/export')
  @UseGuards(AdminAuthGuard)
  async exportAudit(
    @Req() req, @Res() res,
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
    const apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';
    const qs = new URLSearchParams({ format: 'csv', limit: '10000' });
    if (userId) qs.set('userId', userId);
    if (module) qs.set('module', module);
    if (action) qs.set('action', action);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const apiRes = await fetch(`${apiUrl}/api/v1/admin/audit-logs?${qs}`, {
      headers: { 'X-Admin-Key': apiKey },
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit.csv');
    return res.send(await apiRes.text());
  }

  // ─── Moderation ──────────────────────────────────────────────────────────

  @Get('moderation')
  @UseGuards(AdminAuthGuard)
  async moderation(@Req() req, @Res() res, @Query('page') page = '1') {
    const result = await this.appService.getModerationQueue(Number(page));
    return res.render('pages/moderation', {
      title: 'Moderación',
      result,
      adminUser: req.session.adminUser,
      activePage: 'moderation',
    });
  }

  @Post('moderation/:id/approve')
  @UseGuards(AdminAuthGuard)
  async approveModeration(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.approveModeration(id, req.session.adminUser);
    return res.redirect('/moderation');
  }

  @Post('moderation/:id/reject')
  @UseGuards(AdminAuthGuard)
  async rejectModeration(@Param('id') id: string, @Body() body: { reason_code: string; notes?: string }, @Req() req, @Res() res) {
    await this.appService.rejectModeration(id, body.reason_code, body.notes, req.session.adminUser);
    return res.redirect('/moderation');
  }

  // ─── KYC ─────────────────────────────────────────────────────────────────

  @Get('kyc')
  @UseGuards(AdminAuthGuard)
  async kyc(@Req() req, @Res() res, @Query('page') page = '1', @Query('status') status?: string) {
    const result = await this.appService.getKycQueue(Number(page), status || 'PENDING');
    return res.render('pages/kyc', {
      title: 'KYC',
      result,
      status: status || 'PENDING',
      adminUser: req.session.adminUser,
      activePage: 'kyc',
    });
  }

  @Get('kyc/:id')
  @UseGuards(AdminAuthGuard)
  async kycDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const submission = await this.appService.getKycSubmission(id);
    return res.render('pages/kyc-detail', {
      title: 'Detalle KYC',
      submission,
      adminUser: req.session.adminUser,
      activePage: 'kyc',
    });
  }

  @Post('kyc/:id/approve')
  @UseGuards(AdminAuthGuard)
  async approveKyc(@Param('id') id: string, @Req() req, @Res() res) {
    await this.appService.approveKyc(id, req.session.adminUser);
    return res.redirect('/kyc');
  }

  @Post('kyc/:id/reject')
  @UseGuards(AdminAuthGuard)
  async rejectKyc(@Param('id') id: string, @Body() body: { reason: string }, @Req() req, @Res() res) {
    await this.appService.rejectKyc(id, body.reason, req.session.adminUser);
    return res.redirect('/kyc');
  }

  @Post('kyc/:id/request-correction')
  @UseGuards(AdminAuthGuard)
  async requestKycCorrection(@Param('id') id: string, @Body() body: { notes: string }, @Req() req, @Res() res) {
    await this.appService.requestKycCorrection(id, body.notes, req.session.adminUser);
    return res.redirect('/kyc');
  }

  // ─── CFDI ────────────────────────────────────────────────────────────────

  @Get('cfdi')
  @UseGuards(AdminAuthGuard)
  async cfdi(@Req() req, @Res() res, @Query('page') page = '1', @Query('status') status?: string) {
    const result = await this.appService.getCfdiList(Number(page), status);
    return res.render('pages/cfdi', {
      title: 'CFDI',
      result,
      status,
      adminUser: req.session.adminUser,
      activePage: 'cfdi',
    });
  }

  @Post('cfdi/:orderId/generate')
  @UseGuards(AdminAuthGuard)
  async generateCfdi(@Param('orderId') orderId: string, @Req() req, @Res() res) {
    await this.appService.generateCfdi(orderId);
    return res.redirect('/cfdi');
  }

  @Post('cfdi/:orderId/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelCfdi(@Param('orderId') orderId: string, @Req() req, @Res() res) {
    await this.appService.cancelCfdi(orderId);
    return res.redirect('/cfdi');
  }

  @Get('cfdi/:orderId/download/:format')
  @UseGuards(AdminAuthGuard)
  async downloadCfdi(@Param('orderId') orderId: string, @Param('format') format: string, @Req() req, @Res() res) {
    const apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';
    const apiKey = process.env.ADMIN_API_KEY || 'dev-admin-key';
    const apiRes = await fetch(`${apiUrl}/api/v1/admin/cfdi/${orderId}/download/${format}`, {
      headers: { 'X-Admin-Key': apiKey },
    });
    const contentType = format === 'pdf' ? 'application/pdf' : 'application/xml';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=cfdi-${orderId}.${format}`);
    const buffer = await apiRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  @Get('notifications')
  @UseGuards(AdminAuthGuard)
  async notifications(@Req() req, @Res() res, @Query('sent') sent?: string, @Query('page') page = '1') {
    const campaigns = await this.appService.getCampaigns(Number(page));
    return res.render('pages/notifications', {
      title: 'Notificaciones',
      campaigns,
      sent: sent === '1',
      adminUser: req.session.adminUser,
      activePage: 'notifications',
    });
  }

  @Post('notifications/send')
  @UseGuards(AdminAuthGuard)
  async sendNotification(@Body() body: any, @Req() req, @Res() res) {
    const channels = Array.isArray(body['channels[]'])
      ? body['channels[]']
      : body['channels[]'] ? [body['channels[]']] : [];
    await this.appService.sendCampaign({
      segment: body.segment,
      title: body.title,
      body: body.body,
      channels,
      adminUser: req.session.adminUser,
    });
    return res.redirect('/notifications?sent=1');
  }
}
