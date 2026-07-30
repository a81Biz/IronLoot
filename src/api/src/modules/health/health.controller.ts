import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, HealthStatus } from './health.service';
import { Public } from '../auth/decorators';

@ApiTags('health')
@Controller('health')
@Public() // Health endpoints are public
/**
 * PT-178 (H-026) — **La salud no pasa por el limitador, porque el limitador usa Redis.**
 *
 * Medido el 2026-07-29 al comprobar el arreglo: con `ironloot-redis` parado, `GET /health/detailed`
 * **no responde**. El `ThrottlerGuard` es global y su almacenamiento es Redis (PT-030), asi que toda
 * peticion consulta Redis **antes** de llegar al controlador. El contenedor pasa a `unhealthy` y el
 * endpoint que existe para diagnosticar la caida es justo el que la caida silencia.
 *
 * **Un endpoint de salud no puede depender de lo que vigila.** Sin esto, el arreglo de H-026 solo
 * funcionaria mientras Redis este en pie — es decir, cuando no hace falta.
 */
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Basic health check endpoint
   * Used by load balancers and monitoring systems
   */
  @Get()
  @ApiOperation({ summary: 'Health check básico' })
  @ApiResponse({ status: 200, description: 'Servicio operativo' })
  check(): HealthStatus {
    return this.healthService.check();
  }

  /**
   * Detailed health check with dependency status
   * Used for diagnostics and debugging
   */
  @Get('detailed')
  @ApiOperation({ summary: 'Health check detallado' })
  @ApiResponse({ status: 200, description: 'Estado detallado del servicio' })
  async checkDetailed(): Promise<HealthStatus> {
    return this.healthService.checkDetailed();
  }
}
