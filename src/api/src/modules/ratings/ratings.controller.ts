import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, AuthenticatedUser, Public } from '../auth/decorators';

/**
 * PT-163 — Peticiones por minuto y por IP a la reputacion publica.
 *
 * Configurable por entorno a proposito: un numero enterrado en el codigo no se puede subir cuando el
 * trafico legitimo crece ni bajar cuando aparece un raspador, y acabaria comentado.
 */
const RATINGS_PUBLIC_LIMIT = Number(process.env.RATINGS_PUBLIC_RATE_LIMIT ?? 10);
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto';
import { Rating } from '@prisma/client';
import { Log, AuditedAction } from '../../common/observability/decorators';
import { AuditEventType, EntityType } from '../../common/observability/constants';

@ApiTags('ratings')
@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('ratings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rate a transaction' })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  @AuditedAction(AuditEventType.RATING_SUBMITTED, EntityType.RATING, (args, result) => result.id, [
    'score',
  ])
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRatingDto): Promise<Rating> {
    return this.ratingsService.create(user.id, dto);
  }

  /**
   * PT-163 (R-017) — La reputación se mira ANTES de registrarse.
   *
   * `JwtAuthGuard` es guarda **global** (`app.module.ts:156`): todo está protegido por defecto y
   * `@Public()` es la única salida. Así que esta ruta exigía sesión, y es exactamente el dato que un
   * comprador consulta antes de tener cuenta. **La protección impedía el uso que justifica el dato.**
   *
   * ## Por qué abierta y con límite, y no una de las otras dos
   *
   * Las tres alternativas están en el `ENRICHMENT` de PT-156. Se elige la intermedia:
   *
   *   - **Abierta sin más** deja el raspado de reputación trivial. El límite global (100/min) no lo
   *     impide de verdad.
   *   - **Agregado público con detalle privado** obliga a definir «cuánto agregado es suficiente» y
   *     a mantener un endpoint más, para un problema que aún no se ha observado.
   *
   * Un límite por IP **levanta el listón, no cierra la puerta**: quien rote direcciones sigue
   * pudiendo raspar. Se dice aquí para que nadie lo lea como una defensa que no es. Si el raspado
   * llega a observarse, la alternativa C sigue disponible y este cambio no la estorba.
   *
   * ## Lo que NO cambia
   *
   * La respuesta es la misma que ya se servía a un usuario con sesión: `findAllByTarget` no se toca.
   * No se expone ningún dato nuevo — sólo deja de exigirse una sesión para leer lo que ya era
   * legible.
   */
  @Get('users/:userId/ratings')
  @Public()
  @Throttle({ default: { limit: RATINGS_PUBLIC_LIMIT, ttl: 60000 } })
  @ApiOperation({
    summary: 'Get ratings for a user (public)',
    description:
      'Publico a proposito: la reputacion de un vendedor es lo que se consulta ANTES de registrarse. ' +
      'Con limite de tasa propio, mas estricto que el global.',
  })
  @ApiResponse({ status: 200, description: 'List of ratings' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  @Log()
  findAllByTarget(@Param('userId', ParseUUIDPipe) userId: string): Promise<Rating[]> {
    return this.ratingsService.findAllByTarget(userId);
  }
}
