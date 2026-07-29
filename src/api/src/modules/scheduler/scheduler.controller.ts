import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { DevelopmentOnlyGuard } from '../../common/guards/development-only.guard';
import { PrismaService } from '../../database/prisma.service';

/**
 * PT-174 — Disparadores de los cron, **sólo en desarrollo**.
 *
 * ## Por qué existe
 *
 * `releaseMaturedSettlements` corre cada 30 minutos. La fase de QA que recorre la cadena completa
 * —cierre → envío → recepción → liberación → retiro— tendría que esperar media hora en medio, y eso es
 * exactamente lo que hace que nadie la ejecute.
 *
 * La alternativa que había en la suite era peor: `60-withdrawal.js` **siembra** el resultado con un
 * `INSERT` directo, replicando a mano lo que el sistema hace. Una prueba que reproduce el camino en vez
 * de recorrerlo no prueba el camino.
 *
 * **Esto es la diferencia entre configurar y falsear**: con `SETTLEMENT_HOLDBACK_HOURS=0` y este
 * disparador, la fase recorre el código real y sólo se salta el reloj.
 *
 * ## Por qué es seguro
 *
 * `DevelopmentOnlyGuard` **lanza `ForbiddenException` si `NODE_ENV=production`**. No es una convención ni
 * un comentario: es una guarda a nivel de clase, la misma que protege `diagnostics`. Y lleva
 * `ApiBearerAuth` porque el guard global de JWT sigue aplicando — un disparador sin autenticar sería una
 * puerta abierta en cualquier entorno que no fuese producción.
 */
@ApiTags('scheduler')
@ApiBearerAuth('access-token')
@UseGuards(DevelopmentOnlyGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly scheduler: AuctionSchedulerService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('release-settlements')
  @ApiOperation({
    summary: 'Ejecuta ya la liberación de liquidaciones maduras (sólo desarrollo)',
    description:
      'Dispara `releaseMaturedSettlements` sin esperar el cron de 30 min. Devuelve cuántos pedidos ' +
      'quedaban sin liquidar antes y después, para que quien lo llame pueda comprobar el efecto.',
  })
  @ApiResponse({ status: 201, description: 'Liberación ejecutada' })
  @ApiResponse({ status: 403, description: 'No disponible en producción' })
  async releaseSettlements(): Promise<{
    pendientesAntes: number;
    pendientesDespues: number;
    liberados: number;
  }> {
    // Se cuenta antes y después en vez de devolver un `ok: true`. Un disparador que sólo dice «hecho»
    // obliga a quien lo llama a adivinar si hizo algo, y esa es la clase de silencio que este
    // repositorio ya ha pagado varias veces.
    const where = { sellerSettledAt: null, sellerNet: { not: null } };

    const pendientesAntes = await this.prisma.order.count({ where });
    await this.scheduler.releaseMaturedSettlements();
    const pendientesDespues = await this.prisma.order.count({ where });

    return {
      pendientesAntes,
      pendientesDespues,
      liberados: pendientesAntes - pendientesDespues,
    };
  }
}
