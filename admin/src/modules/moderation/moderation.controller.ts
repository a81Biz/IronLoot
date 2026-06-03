import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('moderation')
  @UseGuards(AdminAuthGuard)
  async moderation(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
  ) {
    const result = await this.moderationService.getModerationQueue(Number(page));
    return res.render('pages/moderation', {
      title: 'Moderación',
      result,
      adminUser: req.session.adminUser,
      activePage: 'moderation',
    });
  }

  @Post('moderation/:id/approve')
  @UseGuards(AdminAuthGuard)
  async approveModeration(@Param('id') id: string, @Req() req, @Res() res) {
    await this.moderationService.approveModeration(id, req.session.adminUser);
    return res.redirect('/moderation');
  }

  @Post('moderation/:id/reject')
  @UseGuards(AdminAuthGuard)
  async rejectModeration(
    @Param('id') id: string,
    @Body() body: { reason_code: string; notes?: string },
    @Req() req,
    @Res() res,
  ) {
    await this.moderationService.rejectModeration(id, body.reason_code, body.notes, req.session.adminUser);
    return res.redirect('/moderation');
  }
}
