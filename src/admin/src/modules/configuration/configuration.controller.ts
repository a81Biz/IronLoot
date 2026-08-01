import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigurationService } from "./configuration.service";
import { AdminAuthGuard } from "../../auth/auth.guard";

@Controller()
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  // ─── Platform ──────────────────────────────────────────────────────────────

  @Get("configuration/platform")
  @UseGuards(AdminAuthGuard)
  async platformConfig(@Req() req, @Res() res, @Query("saved") saved?: string) {
    const config = await this.configurationService.getPlatformConfig();
    return res.render("pages/platform-config", {
      title: "Configuración de Plataforma",
      config,
      saved: saved === "1",
      adminUser: req.session.adminUser,
      activePage: "platform-config",
    });
  }

  @Post("configuration/platform")
  @UseGuards(AdminAuthGuard)
  async savePlatformConfig(@Body() body: any, @Req() req, @Res() res) {
    const updates: Record<string, string> = body.updates ?? {};
    await this.configurationService.updatePlatformConfig(
      updates,
      req.session.adminUser,
    );
    return res.redirect("/configuration/platform?saved=1");
  }

  // ─── CFDI ──────────────────────────────────────────────────────────────────

  @Get("configuration/cfdi")
  @UseGuards(AdminAuthGuard)
  async cfdiConfig(
    @Req() req,
    @Res() res,
    @Query("saved") saved?: string,
    @Query("error") error?: string,
  ) {
    const config = await this.configurationService.getCfdiConfig();
    return res.render("pages/cfdi-config", {
      title: "Configuración CFDI",
      config,
      saved: saved === "1",
      error,
      adminUser: req.session.adminUser,
      activePage: "cfdi",
    });
  }

  @Post("configuration/cfdi")
  @UseGuards(AdminAuthGuard)
  async saveCfdiConfig(@Body() body: any, @Req() req, @Res() res) {
    // PT-237 — **Si el API rechaza, la pantalla lo dice; no redirige con `saved=1`.**
    //
    // Antes redirigia siempre, asi que un rechazo del API —hoy los hay: activar sin PAC integrado, o
    // elegir un PAC que no existe— se leia como «Guardado». Es `RULE-41`: una accion anuncia su
    // resultado, y el peor resultado posible es anunciar el contrario del que ocurrio.
    try {
      await this.configurationService.updateCfdiConfig(
        {
          enabled: body.enabled === "on" || body.enabled === "true",
          rfcEmisor: body.rfcEmisor,
          pacProvider: body.pacProvider,
          pacUrl: body.pacUrl,
          pacApiKey: body.pacApiKey || undefined,
        },
        req.session.adminUser,
      );
    } catch (e) {
      const motivo =
        (e as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (e as Error)?.message ??
        "No se pudo guardar la configuracion";
      return res.redirect(
        `/configuration/cfdi?error=${encodeURIComponent(motivo)}`,
      );
    }
    return res.redirect("/configuration/cfdi?saved=1");
  }

  // ─── Settings (payment, SMTP, storage) ────────────────────────────────────

  @Get("settings")
  @UseGuards(AdminAuthGuard)
  async settings(@Req() req, @Res() res, @Query("saved") saved?: string) {
    const [paymentConfig, storageConfig] = await Promise.all([
      this.configurationService.getPaymentConfig(),
      this.configurationService.getStorageConfig(),
    ]);
    return res.render("pages/settings", {
      title: "Configuración",
      config: paymentConfig,
      storageConfig,
      saved: saved === "1",
      adminUser: req.session.adminUser,
      activePage: "settings",
      allProviders: [
        {
          id: "MERCADO_PAGO",
          label: "Mercado Pago",
          desc: "Tarjeta, OXXO, Saldo MP",
        },
        { id: "PAYPAL", label: "PayPal", desc: "Tarjeta, Saldo PayPal (WPS)" },
        { id: "STRIPE", label: "Stripe", desc: "Tarjeta internacional" },
        {
          id: "HEY_BANCO",
          label: "Hey Banco",
          desc: "Banco digital mexicano (Banregio)",
        },
      ],
    });
  }

  @Post("settings/payment-config")
  @UseGuards(AdminAuthGuard)
  async savePaymentConfig(@Body() body: any, @Res() res) {
    const providers = Array.isArray(body.providers)
      ? body.providers
      : body.providers
        ? [body.providers]
        : [];
    await this.configurationService.updatePaymentConfig(
      providers,
      body.primaryCardProvider || "MERCADO_PAGO",
    );
    return res.redirect("/settings?saved=1");
  }

  // PT-191 (AUD-027) — **Aqui habia un formulario SMTP que no configuraba nada.**
  //
  // Guardaba host, puerto, usuario, contrasena y remitente en `SystemConfig` y respondia «saved=1». El mailer
  // construye su transporte con **`MAIL_*` del entorno**, asi que cambiarlos no tenia efecto **nunca**. Se
  // retira en vez de cablearse porque el transporte se crea al arrancar: un override ahi no seria runtime sino
  // «al proximo reinicio». El motivo largo esta en `system-config.service.ts`.

  @Post("settings/storage")
  @UseGuards(AdminAuthGuard)
  async saveStorageConfig(@Body() body: any, @Req() req, @Res() res) {
    const updates: Record<string, string> = {};
    const keys = [
      "STORAGE_PROVIDER",
      "STORAGE_BUCKET",
      "STORAGE_REGION",
      "STORAGE_ACCESS_KEY",
      "STORAGE_SECRET_KEY",
    ];
    for (const k of keys) if (body[k]) updates[k] = body[k];
    await this.configurationService.updateStorageConfig(
      updates,
      req.session.adminUser,
    );
    return res.redirect("/settings?saved=1");
  }
}
