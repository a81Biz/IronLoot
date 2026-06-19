import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get('commissions')
  @UseGuards(AdminAuthGuard)
  async commissions(@Req() req, @Res() res, @Query('page') page = '1') {
    const [config, records] = await Promise.all([
      this.commissionsService.getCommissionsConfig(),
      this.commissionsService.getCommissionsRecords(Number(page)),
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
  async updateGlobalRate(
    @Body() body: { ratePercent: string },
    @Req() req,
    @Res() res,
  ) {
    await this.commissionsService.upsertGlobalRate(Number(body.ratePercent), req.session.adminUser);
    return res.redirect('/commissions');
  }

  @Post('commissions/config/seller')
  @UseGuards(AdminAuthGuard)
  async updateSellerRate(
    @Body() body: { sellerId: string; ratePercent: string },
    @Req() req,
    @Res() res,
  ) {
    await this.commissionsService.upsertSellerRate(body.sellerId, Number(body.ratePercent), req.session.adminUser);
    return res.redirect('/commissions');
  }

  @Post('commissions/config/:id/delete')
  @UseGuards(AdminAuthGuard)
  async deleteCommissionConfig(@Param('id') id: string, @Req() req, @Res() res) {
    await this.commissionsService.deleteCommissionConfig(id);
    return res.redirect('/commissions');
  }

  @Post('commissions/records/:id/mark-collected')
  @UseGuards(AdminAuthGuard)
  async markCollected(@Param('id') id: string, @Req() req, @Res() res) {
    await this.commissionsService.markCommissionCollected(id);
    return res.redirect('/commissions');
  }
}
