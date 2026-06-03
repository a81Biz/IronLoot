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
}
