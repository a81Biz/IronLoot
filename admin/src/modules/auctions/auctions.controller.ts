import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuctionsAdminService } from './auctions.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class AuctionsAdminController {
  constructor(private readonly auctionsAdminService: AuctionsAdminService) {}

  @Get('auctions')
  @UseGuards(AdminAuthGuard)
  async auctions(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('status') status?: string,
  ) {
    const result = await this.auctionsAdminService.getAuctions(Number(page), status);
    return res.render('pages/auctions', {
      title: 'Subastas',
      result,
      status,
      adminUser: req.session.adminUser,
      activePage: 'auctions',
    });
  }

  @Get('auctions/:id')
  @UseGuards(AdminAuthGuard)
  async auctionDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const auction = await this.auctionsAdminService.getAuction(id);
    return res.render('pages/auction-detail', {
      title: 'Detalle de subasta',
      auction,
      adminUser: req.session.adminUser,
      activePage: 'auctions',
    });
  }

  @Post('auctions/:id/cancel')
  @UseGuards(AdminAuthGuard)
  async cancelAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.auctionsAdminService.cancelAuction(id);
    return res.redirect('/auctions');
  }

  @Post('auctions/:id/approve')
  @UseGuards(AdminAuthGuard)
  async approveAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.auctionsAdminService.approveAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/reject')
  @UseGuards(AdminAuthGuard)
  async rejectAuction(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
    @Res() res,
  ) {
    await this.auctionsAdminService.rejectAuction(id, body.reason, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/suspend')
  @UseGuards(AdminAuthGuard)
  async suspendAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.auctionsAdminService.suspendAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/force-close')
  @UseGuards(AdminAuthGuard)
  async forceCloseAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.auctionsAdminService.forceCloseAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }

  @Post('auctions/:id/reopen')
  @UseGuards(AdminAuthGuard)
  async reopenAuction(@Param('id') id: string, @Req() req, @Res() res) {
    await this.auctionsAdminService.reopenAuction(id, req.session.adminUser);
    return res.redirect(`/auctions/${id}`);
  }
}
