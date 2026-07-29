import {
  Controller,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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

  @Post('expire-auction/:id')
  @ApiOperation({
    summary: 'Adelanta el fin de una subasta y ejecuta el cierre (sólo desarrollo)',
    description:
      'Pone `endsAt` en el pasado inmediato y corre `closeExpiredAuctions`. Existe porque una subasta ' +
      'dura como mínimo una hora por regla de negocio (`create-auction.dto.ts`), y ninguna prueba puede ' +
      'esperar eso. Adelanta el reloj; el cierre lo hace el código real.',
  })
  @ApiResponse({ status: 201, description: 'Subasta expirada y cierre ejecutado' })
  @ApiResponse({ status: 403, description: 'No disponible en producción' })
  async expireAuction(@Param('id', ParseUUIDPipe) id: string): Promise<{
    estadoAntes: string;
    estadoDespues: string;
  }> {
    // PT-175 — **Adelantar el reloj no es falsear el resultado.**
    //
    // Una subasta dura >= 1 h por regla de negocio, asi que la fase de QA que recorre la cadena completa
    // no puede esperar a que venza. Lo unico que se toca es `endsAt`; **el cierre lo hace
    // `closeExpiredAuctions()` de verdad** — con su cerrojo distribuido, su transaccion, la creacion del
    // pedido, la captura de fondos retenidos, la comision y los avisos.
    //
    // La alternativa que habia en la suite era sembrar el resultado con un `INSERT`: escribir a mano el
    // pedido y el asiento que el sistema deberia haber creado. Eso no prueba el camino, lo reproduce.
    const antes = await this.prisma.auction.findUnique({ where: { id }, select: { status: true } });
    if (!antes) throw new NotFoundException('Auction not found');

    await this.prisma.auction.update({
      where: { id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });

    await this.scheduler.closeExpiredAuctions();

    const despues = await this.prisma.auction.findUnique({
      where: { id },
      select: { status: true },
    });

    return { estadoAntes: antes.status, estadoDespues: despues?.status ?? 'DESAPARECIDA' };
  }

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
