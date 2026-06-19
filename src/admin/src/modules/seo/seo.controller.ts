import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { SeoService } from './seo.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('seo')
  @UseGuards(AdminAuthGuard)
  async seo(@Req() req, @Res() res) {
    return res.render('pages/seo', {
      title: 'SEO',
      adminUser: req.session.adminUser,
      activePage: 'seo',
    });
  }

  @Post('seo/:page')
  @UseGuards(AdminAuthGuard)
  async updateSeo(
    @Param('page') page: string,
    @Body() body: { title?: string; description?: string },
    @Req() req,
    @Res() res,
  ) {
    await this.seoService.updateSeoConfig(page, body as Record<string, string>);
    return res.redirect('/seo');
  }
}
