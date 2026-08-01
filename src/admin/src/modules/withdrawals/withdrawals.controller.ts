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
import { WithdrawalsService } from "./withdrawals.service";
import { AdminAuthGuard } from "../../auth/auth.guard";

/**
 * PT-216 (R-027 · H-UI-008) — La cola de retiros del backoffice.
 *
 * Las tres acciones son `POST` con redirección y no `fetch`, como el resto del panel: ADMIN usa sesión
 * server-side y su CSP no permite JS en línea. Cada una vuelve a la cola con el filtro puesto, que es lo
 * que un operador espera cuando está vaciando una lista.
 */
@Controller()
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Get("withdrawals")
  @UseGuards(AdminAuthGuard)
  async cola(@Req() req, @Res() res) {
    const statusFilter = (req.query.status as string) || "";
    const { items } = await this.withdrawalsService.listarCola(statusFilter);

    return res.render("pages/withdrawals", {
      title: "Retiros",
      adminUser: req.session.adminUser,
      activePage: "withdrawals",
      withdrawals: items,
      statusFilter,
      // Se pasa el mensaje de la acción anterior por query: es la unica forma de dar respuesta en un
      // flujo POST-redirect-GET sin JavaScript.
      aviso: (req.query.aviso as string) || "",
    });
  }

  @Post("withdrawals/:id/approve")
  @UseGuards(AdminAuthGuard)
  async aprobar(@Param("id") id: string, @Req() req, @Res() res) {
    await this.withdrawalsService.aprobar(id, req.session.adminUser ?? "admin");
    return res.redirect(
      "/withdrawals?aviso=" +
        encodeURIComponent(
          "Aprobado. Ejecuta la transferencia SPEI y despues marcalo como pagado.",
        ),
    );
  }

  @Post("withdrawals/:id/reject")
  @UseGuards(AdminAuthGuard)
  async rechazar(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @Req() req,
    @Res() res,
  ) {
    await this.withdrawalsService.rechazar(
      id,
      req.session.adminUser ?? "admin",
      body.reason ?? "",
    );
    return res.redirect(
      "/withdrawals?aviso=" +
        encodeURIComponent(
          "Rechazado. El importe se reintegra al vendedor (RN-66).",
        ),
    );
  }

  @Post("withdrawals/:id/mark-paid")
  @UseGuards(AdminAuthGuard)
  async marcarPagado(
    @Param("id") id: string,
    @Body() body: { reference?: string },
    @Req() req,
    @Res() res,
  ) {
    await this.withdrawalsService.marcarPagado(
      id,
      req.session.adminUser ?? "admin",
      body.reference ?? "",
    );
    return res.redirect(
      "/withdrawals?aviso=" + encodeURIComponent("Marcado como pagado."),
    );
  }
}
