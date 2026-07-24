import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { SeoService } from './seo.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('seo')
  @UseGuards(AdminAuthGuard)
  async seo(@Req() req, @Res() res) {
    // PT-057: resolver la config en servidor (antes fetch client-side → 404).
    const configs = await this.seoService.getAllSeo();
    const pages = ['home', 'auctions', 'about', 'terms', 'privacy'];
    const existing = Object.fromEntries(configs.map((c) => [c.page, c]));
    const blocks = pages.map((page) => ({
      page,
      title: existing[page]?.title ?? '',
      description: existing[page]?.description ?? '',
    }));
    return res.render('pages/seo', {
      title: 'SEO',
      adminUser: req.session.adminUser,
      activePage: 'seo',
      blocks,
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
