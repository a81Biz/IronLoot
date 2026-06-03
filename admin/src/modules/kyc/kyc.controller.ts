import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { KycService } from './kyc.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('kyc')
  @UseGuards(AdminAuthGuard)
  async kyc(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('status') status?: string,
  ) {
    const result = await this.kycService.getKycQueue(Number(page), status || 'PENDING');
    return res.render('pages/kyc', {
      title: 'KYC',
      result,
      status: status || 'PENDING',
      adminUser: req.session.adminUser,
      activePage: 'kyc',
    });
  }

  @Get('kyc/:id')
  @UseGuards(AdminAuthGuard)
  async kycDetail(@Param('id') id: string, @Req() req, @Res() res) {
    const submission = await this.kycService.getKycSubmission(id);
    return res.render('pages/kyc-detail', {
      title: 'Detalle KYC',
      submission,
      adminUser: req.session.adminUser,
      activePage: 'kyc',
    });
  }

  @Post('kyc/:id/approve')
  @UseGuards(AdminAuthGuard)
  async approveKyc(@Param('id') id: string, @Req() req, @Res() res) {
    await this.kycService.approveKyc(id, req.session.adminUser);
    return res.redirect('/kyc');
  }

  @Post('kyc/:id/reject')
  @UseGuards(AdminAuthGuard)
  async rejectKyc(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req,
    @Res() res,
  ) {
    await this.kycService.rejectKyc(id, body.reason, req.session.adminUser);
    return res.redirect('/kyc');
  }

  @Post('kyc/:id/request-correction')
  @UseGuards(AdminAuthGuard)
  async requestKycCorrection(
    @Param('id') id: string,
    @Body() body: { notes: string },
    @Req() req,
    @Res() res,
  ) {
    await this.kycService.requestKycCorrection(id, body.notes, req.session.adminUser);
    return res.redirect('/kyc');
  }
}
