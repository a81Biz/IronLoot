import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('health')
@Controller('health')
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
