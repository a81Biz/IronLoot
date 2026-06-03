import { Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { CfdiService } from './cfdi.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class CfdiController {
  constructor(private readonly cfdiService: CfdiService) {}

  @Get('cfdi')
  @UseGuards(AdminAuthGuard)
  async cfdi(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('status') status?: string,
  ) {
    const result = await this.cfdiService.getCfdiList(Number(page), status);
    return res.render('pages/cfdi', {
      title: 'CFDI',
      result,
      status,
      adminUser: req.session.adminUser,
      activePage: 'cfdi',
    });
  }

  @Post('cfdi/:orderId/generate')
  @UseGuards(AdminAuthGuard)
  async generateCfdi(@Param('orderId') orderId: string, @Req() req, @Res() res) {
    await this.cfdiService.generateCfdi(orderId);
    return res.redirect('/cfdi');
  }

  @Post('cfdi/:orderId/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelCfdi(@Param('orderId') orderId: string, @Req() req, @Res() res) {
    await this.cfdiService.cancelCfdi(orderId);
    return res.redirect('/cfdi');
  }

  @Get('cfdi/:orderId/download/:format')
  @UseGuards(AdminAuthGuard)
  async downloadCfdi(
    @Param('orderId') orderId: string,
    @Param('format') format: string,
    @Req() req,
    @Res() res,
  ) {
    const result = await this.cfdiService.downloadCfdi(orderId, format);
    if (!result) return res.status(502).send('Error al descargar CFDI');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=cfdi-${orderId}.${format}`);
    return res.send(result.buffer);
  }
}
