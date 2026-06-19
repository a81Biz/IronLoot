import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Export must be registered before the list route to avoid path conflicts
  @Get('audit/export')
  @UseGuards(AdminAuthGuard)
  async exportAudit(
    @Res() res,
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.auditService.exportCsv({ userId, module, action, from, to });
    if (!csv) return res.status(502).send('Error al exportar');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit.csv');
    return res.send(csv);
  }

  @Get('audit')
  @UseGuards(AdminAuthGuard)
  async audit(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('userId') userId?: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.auditService.getLogs(Number(page), { userId, module, action, from, to });
    return res.render('pages/audit', {
      title: 'Auditoría',
      result,
      userId,
      module,
      action,
      from,
      to,
      adminUser: req.session.adminUser,
      activePage: 'audit',
    });
  }
}
