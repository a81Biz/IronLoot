import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('payments')
  @UseGuards(AdminAuthGuard)
  async payments(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.paymentsService.getPayments(Number(page), status, provider, from, to);
    return res.render('pages/payments', {
      title: 'Pagos',
      result,
      status, provider, from, to,
      adminUser: req.session.adminUser,
      activePage: 'payments',
    });
  }
}
