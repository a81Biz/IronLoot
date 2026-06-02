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
    const stats = await this.appService.getStats();
    return res.render('pages/dashboard', {
      title: 'Dashboard',
      stats,
      adminUser: req.session.adminUser,
      activePage: 'dashboard',
    });
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

  @Post('auctions/:id/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelAuction(@Param('id') id: string, @Res() res) {
    await this.appService.cancelAuction(id);
    return res.redirect('/auctions');
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
  async payments(@Req() req, @Res() res, @Query('page') page = '1') {
    const result = await this.appService.getPayments(Number(page));
    return res.render('pages/payments', {
      title: 'Pagos',
      result,
      adminUser: req.session.adminUser,
      activePage: 'payments',
    });
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

  // ─── Audit ───────────────────────────────────────────────────────────────

  @Get('audit')
  @UseGuards(AdminAuthGuard)
  async audit(@Req() req, @Res() res, @Query('page') page = '1') {
    const result = await this.appService.getAuditLogs(Number(page));
    return res.render('pages/audit', {
      title: 'Auditoría',
      result,
      adminUser: req.session.adminUser,
      activePage: 'audit',
    });
  }

  // ─── Settings ────────────────────────────────────────────────────────────

  @Get('settings')
  @UseGuards(AdminAuthGuard)
  async settings(@Req() req, @Res() res) {
    const config = await this.appService.getPaymentConfig();
    return res.render('pages/settings', {
      title: 'Configuración',
      config,
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
    // Checkboxes send array or single value
    const providers = Array.isArray(body.providers)
      ? body.providers
      : body.providers
      ? [body.providers]
      : [];

    await this.appService.updatePaymentConfig(providers, body.primaryCardProvider || 'MERCADO_PAGO');
    return res.redirect('/settings?saved=1');
  }
}
