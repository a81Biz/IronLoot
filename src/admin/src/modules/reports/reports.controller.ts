import { Controller, Get, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Download must be registered before the list route to avoid path conflicts
  @Get('reports/download/:type')
  @UseGuards(AdminAuthGuard)
  async downloadReport(
    @Param('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res,
  ) {
    const csv = await this.reportsService.downloadCsv(type, from, to);
    if (!csv) return res.status(502).send('Error al descargar reporte');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    return res.send(csv);
  }

  @Get('reports')
  @UseGuards(AdminAuthGuard)
  async reports(
    @Req() req,
    @Res() res,
    @Query('type') type = 'financial',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const report = await this.reportsService.getReport(type, from, to);
    return res.render('pages/reports', {
      title: 'Reportes',
      report,
      reportType: type,
      from,
      to,
      adminUser: req.session.adminUser,
      activePage: 'reports',
    });
  }
}
