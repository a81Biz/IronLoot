import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { ThrottlerRedisService } from '../../common/redis/throttler-redis.module';

/**
 * PT-178 — Tope para el `PING` de Redis.
 *
 * Dos segundos: suficiente para un Redis lento y poco para que un monitor se quede esperando. Un
 * endpoint de salud que tarda es un endpoint de salud que nadie consulta.
 */
const PING_TIMEOUT_MS = 2000;

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  dependencies?: {
    database?: DependencyStatus;
    redis?: DependencyStatus;
  };
}

interface DependencyStatus {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  message?: string;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    // PT-178 — El cliente que sostiene el rate limiting, no uno nuevo: se observa la dependencia real.
    private readonly redis: ThrottlerRedisService,
  ) {}

  /**
   * Basic health check
   * Returns immediately without checking dependencies
   */
  check(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  /**
   * Detailed health check
   * Checks all dependencies and returns their status
   */
  async checkDetailed(): Promise<HealthStatus> {
    const basicHealth = this.check();

    // TODO: Implement actual database and Redis checks when Prisma is set up
    const dependencies = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    // Determine overall status
    const allUp = Object.values(dependencies).every((dep) => dep.status === 'up');
    const anyDown = Object.values(dependencies).some((dep) => dep.status === 'down');

    return {
      ...basicHealth,
      status: anyDown ? 'unhealthy' : allUp ? 'healthy' : 'degraded',
      dependencies,
    };
  }

  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<DependencyStatus> {
    return this.prisma.healthCheck();
  }

  /**
   * Check Redis connection
   */
  /**
   * PT-178 (H-026) — Redis se comprueba de verdad.
   *
   * Esto devolvía `{ status: 'unknown', message: 'Redis check not implemented' }` fijo. Como el estado
   * agregado es `allUp ? 'healthy' : 'degraded'`, **`healthy` era inalcanzable**: el endpoint reportaba
   * un problema inexistente en cada consulta. Y lo que lo hacía un hallazgo y no una tarea pendiente:
   * **si Redis se caía de verdad decía exactamente lo mismo**, así que una caída real era
   * indistinguible del funcionamiento normal en el único endpoint que existe para diagnosticarla.
   *
   * De Redis dependen las colas, el rate limiting, el cerrojo distribuido y las sesiones de ADMIN.
   * RULE-17 protegió el arranque; esto cubre la degradación **en caliente**.
   *
   * **Se hace `PING` sobre el cliente que el sistema ya usa**, no sobre uno propio: uno nuevo podría
   * estar sano mientras el que sostiene el rate limiting está roto, y el endpoint diría «up» sobre algo
   * que no es lo que importa.
   *
   * **Con tope de tiempo.** Un endpoint de diagnóstico que se queda esperando es peor que uno que dice
   * «no lo sé»: el monitor que lo consulta se queda colgado también.
   */
  private async checkRedis(): Promise<DependencyStatus> {
    const start = Date.now();

    try {
      await Promise.race([
        this.redis.client.ping(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`PING sin respuesta en ${PING_TIMEOUT_MS} ms`)),
            PING_TIMEOUT_MS,
          ),
        ),
      ]);

      return { status: 'up', latency: Date.now() - start };
    } catch (error) {
      // Se dice el motivo. Un `down` sin causa obliga a quien lo lee a adivinar entre «no arranca»,
      // «no responde» y «responde mal», que son tres problemas con tres soluciones distintas.
      return { status: 'down', message: (error as Error).message };
    }
  }
}
