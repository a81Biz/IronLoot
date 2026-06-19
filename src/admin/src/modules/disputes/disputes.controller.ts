import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { DisputesService } from './disputes.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('disputes')
  @UseGuards(AdminAuthGuard)
  async disputes(@Req() req, @Res() res, @Query('page') page = '1') {
    const result = await this.disputesService.getDisputes(Number(page));
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
    const dispute = await this.disputesService.getDisputeDetail(id);
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
    @Req() req,
    @Res() res,
  ) {
    await this.disputesService.resolveDisputeBuyer(id, body.reason, req.session.adminUser);
    return res.redirect('/disputes');
  }

  @Post('disputes/:id/resolve-seller')
  @UseGuards(AdminAuthGuard)
  async resolveDisputeSeller(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
    @Res() res,
  ) {
    await this.disputesService.resolveDisputeSeller(id, body.reason, req.session.adminUser);
    return res.redirect('/disputes');
  }
}
