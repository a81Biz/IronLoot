import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  // ─── Platform ──────────────────────────────────────────────────────────────

  @Get('configuration/platform')
  @UseGuards(AdminAuthGuard)
  async platformConfig(@Req() req, @Res() res, @Query('saved') saved?: string) {
    const config = await this.configurationService.getPlatformConfig();
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
    await this.configurationService.updatePlatformConfig(updates, req.session.adminUser);
    return res.redirect('/configuration/platform?saved=1');
  }

  // ─── CFDI ──────────────────────────────────────────────────────────────────

  @Get('configuration/cfdi')
  @UseGuards(AdminAuthGuard)
  async cfdiConfig(@Req() req, @Res() res, @Query('saved') saved?: string) {
    const config = await this.configurationService.getCfdiConfig();
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
    await this.configurationService.updateCfdiConfig(
      { rfcEmisor: body.rfcEmisor, pacUrl: body.pacUrl, pacApiKey: body.pacApiKey || undefined },
      req.session.adminUser,
    );
    return res.redirect('/configuration/cfdi?saved=1');
  }

  // ─── Settings (payment, SMTP, storage) ────────────────────────────────────

  @Get('settings')
  @UseGuards(AdminAuthGuard)
  async settings(@Req() req, @Res() res, @Query('saved') saved?: string) {
    const [paymentConfig, smtpConfig, storageConfig] = await Promise.all([
      this.configurationService.getPaymentConfig(),
      this.configurationService.getSmtpConfig(),
      this.configurationService.getStorageConfig(),
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
    await this.configurationService.updatePaymentConfig(providers, body.primaryCardProvider || 'MERCADO_PAGO');
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
    await this.configurationService.updateSmtpConfig(updates, req.session.adminUser);
    return res.redirect('/settings?saved=1');
  }

  @Post('settings/storage')
  @UseGuards(AdminAuthGuard)
  async saveStorageConfig(@Body() body: any, @Req() req, @Res() res) {
    const updates: Record<string, string> = {};
    const keys = ['STORAGE_PROVIDER', 'STORAGE_BUCKET', 'STORAGE_REGION', 'STORAGE_ACCESS_KEY', 'STORAGE_SECRET_KEY'];
    for (const k of keys) if (body[k]) updates[k] = body[k];
    await this.configurationService.updateStorageConfig(updates, req.session.adminUser);
    return res.redirect('/settings?saved=1');
  }
}
