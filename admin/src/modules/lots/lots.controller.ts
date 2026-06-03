import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { LotsService } from './lots.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get('lots')
  @UseGuards(AdminAuthGuard)
  async lots(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('blocked') blocked?: string,
  ) {
    const result = await this.lotsService.getLots(Number(page), blocked);
    return res.render('pages/lots', {
      title: 'Lotes',
      result,
      blocked,
      adminUser: req.session.adminUser,
      activePage: 'lots',
    });
  }

  @Get('lots/:id')
  @UseGuards(AdminAuthGuard)
  async lotDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const lot = await this.lotsService.getLot(id);
    return res.render('pages/lot-detail', {
      title: 'Detalle de lote',
      lot,
      adminUser: req.session.adminUser,
      activePage: 'lots',
    });
  }

  @Post('lots/:id/block')
  @UseGuards(AdminAuthGuard)
  async blockLot(@Param('id') id: string, @Req() req, @Res() res) {
    await this.lotsService.blockLot(id, req.session.adminUser);
    return res.redirect(`/lots/${id}`);
  }

  @Post('lots/:id/unblock')
  @UseGuards(AdminAuthGuard)
  async unblockLot(@Param('id') id: string, @Req() req, @Res() res) {
    await this.lotsService.unblockLot(id, req.session.adminUser);
    return res.redirect(`/lots/${id}`);
  }

  @Post('lots/:id/update')
  @UseGuards(AdminAuthGuard)
  async updateLot(@Param('id') id: string, @Body() body: any, @Req() req, @Res() res) {
    await this.lotsService.updateLot(id, { adminNotes: body.adminNotes });
    return res.redirect(`/lots/${id}`);
  }

  @Post('lots/:id/update-category')
  @UseGuards(AdminAuthGuard)
  async updateLotCategory(@Param('id') id: string, @Body() body: any, @Req() req, @Res() res) {
    if (body.categoryId) {
      await this.lotsService.updateLot(id, { adminNotes: `Category changed to: ${body.categoryId}` });
    }
    return res.redirect(`/lots/${id}`);
  }
}
