import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { CmsService } from "./cms.service";
import { AdminAuthGuard } from "../../auth/auth.guard";

@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get("cms")
  @UseGuards(AdminAuthGuard)
  async cms(@Req() req, @Res() res) {
    // PT-052: resolve content server-side and render it (was a broken client-side fetch).
    const items = await this.cmsService.getAllContent();
    const defaultKeys = [
      "home.hero.title",
      "home.hero.subtitle",
      "home.about.text",
      "home.banner.url",
    ];
    const existing = Object.fromEntries(items.map((i) => [i.key, i]));
    const keys = [...new Set([...defaultKeys, ...items.map((i) => i.key)])];
    const blocks = keys.map((key) => ({
      key,
      value: existing[key]?.value ?? "",
      type: existing[key]?.type ?? "TEXT",
    }));
    return res.render("pages/cms", {
      title: "CMS",
      adminUser: req.session.adminUser,
      activePage: "cms",
      blocks,
    });
  }

  @Post("cms/:key")
  @UseGuards(AdminAuthGuard)
  async updateCms(
    @Param("key") key: string,
    @Body() body: { value: string },
    @Req() req,
    @Res() res,
  ) {
    await this.cmsService.updateCmsContent(key, body.value);
    return res.redirect("/cms");
  }
}
