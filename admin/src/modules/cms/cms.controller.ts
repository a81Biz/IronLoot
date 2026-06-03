import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { CmsService } from './cms.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('cms')
  @UseGuards(AdminAuthGuard)
  async cms(@Req() req, @Res() res) {
    return res.render('pages/cms', {
      title: 'CMS',
      adminUser: req.session.adminUser,
      activePage: 'cms',
    });
  }

  @Post('cms/:key')
  @UseGuards(AdminAuthGuard)
  async updateCms(
    @Param('key') key: string,
    @Body() body: { value: string },
    @Req() req,
    @Res() res,
  ) {
    await this.cmsService.updateCmsContent(key, body.value);
    return res.redirect('/cms');
  }
}
