import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @UseGuards(AdminAuthGuard)
  async notifications(
    @Req() req,
    @Res() res,
    @Query('sent') sent?: string,
    @Query('page') page = '1',
  ) {
    const campaigns = await this.notificationsService.getCampaigns(Number(page));
    return res.render('pages/notifications', {
      title: 'Notificaciones',
      campaigns,
      sent: sent === '1',
      adminUser: req.session.adminUser,
      activePage: 'notifications',
    });
  }

  @Post('notifications/send')
  @UseGuards(AdminAuthGuard)
  async sendNotification(@Body() body: any, @Req() req, @Res() res) {
    const channels = Array.isArray(body['channels[]'])
      ? body['channels[]']
      : body['channels[]'] ? [body['channels[]']] : [];
    await this.notificationsService.sendCampaign({
      segment: body.segment,
      title: body.title,
      body: body.body,
      channels,
      adminUser: req.session.adminUser,
    });
    return res.redirect('/notifications?sent=1');
  }
}
