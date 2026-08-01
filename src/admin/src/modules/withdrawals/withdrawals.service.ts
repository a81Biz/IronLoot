import { Injectable } from "@nestjs/common";
import { AdminApiClient } from "../../shared/admin-api-client.service";

/**
 * PT-216 (R-027 · H-UI-008) — **La cola de retiros que el manual describía y no existía.**
 *
 * `docs-v2/7-ux/Manual-de-Administrador.md §3` documenta el procedimiento en cinco pasos **con
 * pantalla**:
 *
 * > *«`GET /admin/withdrawals[?status=REQUESTED]` → cola de solicitudes. Cada una muestra vendedor,
 * > monto y método (CLABE + titular).»*
 *
 * `grep -rn "withdraw" src/admin` devolvía **cero resultados**: ni ruta, ni vista, ni entrada de menú.
 * El administrador tendría que operar por API a mano para pagar a los vendedores.
 *
 * Y no es un procedimiento accesorio: `RN-66` dice que **la aprobación de un retiro es siempre manual**
 * y que el admin marca `PAID` sólo tras confirmar el SPEI. Sin esta pantalla, el dinero del vendedor se
 * queda en `REQUESTED` con los fondos ya reservados de su disponible (`RN-65`).
 */
@Injectable()
export class WithdrawalsService {
  constructor(private readonly apiClient: AdminApiClient) {}

  /**
   * La cola, opcionalmente filtrada por estado.
   *
   * El API devuelve un **array plano**. Se normaliza aquí a `{ items }` por el mismo motivo que PT-204
   * lo hizo en los SSR: una plantilla que recorra la forma equivocada no falla, pinta su estado vacío.
   */
  async listarCola(status?: string): Promise<{ items: any[] }> {
    const qs = status ? `?status=${encodeURIComponent(status)}` : "";
    const respuesta = await this.apiClient.call<unknown>(
      "GET",
      `/admin/withdrawals${qs}`,
    );

    if (Array.isArray(respuesta)) return { items: respuesta };
    if (respuesta && typeof respuesta === "object") {
      const obj = respuesta as Record<string, unknown>;
      if (Array.isArray(obj.items)) return { items: obj.items };
      if (Array.isArray(obj.data)) return { items: obj.data };
    }
    return { items: [] };
  }

  aprobar(id: string, adminUser: string) {
    return this.apiClient.call("PATCH", `/admin/withdrawals/${id}/approve`, {
      adminUser,
    });
  }

  rechazar(id: string, adminUser: string, reason: string) {
    return this.apiClient.call("PATCH", `/admin/withdrawals/${id}/reject`, {
      adminUser,
      reason,
    });
  }

  /**
   * `APPROVED → PAID`, con la referencia del SPEI.
   *
   * `RN-66` es explícita: se marca `PAID` **sólo tras** confirmar la transferencia. La referencia no es
   * decorativa — es lo que permite reconciliar después, y por eso el formulario la exige.
   */
  marcarPagado(id: string, adminUser: string, reference: string) {
    return this.apiClient.call("PATCH", `/admin/withdrawals/${id}/mark-paid`, {
      adminUser,
      reference,
    });
  }
}
