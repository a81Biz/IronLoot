import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

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
  async createRefund(
    @Body() body: { orderId: string; amount: string; reason: string },
    @Req() req,
    @Res() res,
  ) {
    await this.refundsService.createRefund(body.orderId, parseFloat(body.amount), body.reason);
    return res.redirect('/refunds');
  }

  @Post('refunds/:id/status')
  @UseGuards(AdminAuthGuard)
  async updateRefundStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req,
    @Res() res,
  ) {
    await this.refundsService.updateRefundStatus(id, body.status);
    return res.redirect('/refunds');
  }
}
