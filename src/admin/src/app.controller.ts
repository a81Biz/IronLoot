import {
  Controller,
  Get,
  Post,
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
  private readonly apiUrl = process.env.ADMIN_API_URL || 'http://localhost:3000';

  constructor(private readonly appService: AppService) {}

  // ─── Auth ────────────────────────────────────────────────────────────────

  @Get('login')
  loginPage(@Req() req, @Res() res) {
    if (req.session?.isAdmin) return res.redirect('/');
    const requiresTotp = !!process.env.ADMIN_TOTP_SECRET;
    return res.render('pages/login', { title: 'Iron Loot Admin', requiresTotp });
  }

  @Post('login')
  @HttpCode(200)
  async loginAction(
    @Body() body: { username: string; password: string; totp?: string },
    @Req() req,
    @Res() res,
  ) {
    const requiresTotp = !!process.env.ADMIN_TOTP_SECRET;

    try {
      const apiRes = await fetch(`${this.apiUrl}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: body.username, password: body.password, totp: body.totp }),
      });

      if (apiRes.ok) {
        req.session.isAdmin = true;
        req.session.adminUser = body.username;
        return res.redirect('/');
      }

      let errorMsg = 'Credenciales incorrectas';
      try {
        const json = (await apiRes.json()) as { message?: string };
        if (typeof json.message === 'string' && json.message.toLowerCase().includes('totp')) {
          errorMsg = 'Código TOTP inválido o requerido';
        }
      } catch {
        // ignore parse error
      }

      return res.render('pages/login', {
        title: 'Iron Loot Admin',
        error: errorMsg,
        requiresTotp,
      });
    } catch {
      return res.render('pages/login', {
        title: 'Iron Loot Admin',
        error: 'Error de conexión con el servidor',
        requiresTotp,
      });
    }
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
}
