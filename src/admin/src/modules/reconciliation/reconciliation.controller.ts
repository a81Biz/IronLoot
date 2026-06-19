import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ReconciliationService } from './reconciliation.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

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
    @Req() req,
    @Res() res,
  ) {
    const csv = await this.reconciliationService.exportReconciliation(provider, dateFrom, dateTo);
    if (!csv) return res.status(502).send('Error al exportar');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reconciliation-${provider}-${dateFrom}.csv`);
    return res.send(csv);
  }
}
