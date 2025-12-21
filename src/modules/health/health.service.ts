import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

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
  private async checkRedis(): Promise<DependencyStatus> {
    // TODO: Implement with Redis client
    // try {
    //   const start = Date.now();
    //   await this.redis.ping();
    //   return { status: 'up', latency: Date.now() - start };
    // } catch (error) {
    //   return { status: 'down', message: error.message };
    // }
    return { status: 'unknown', message: 'Redis check not implemented' };
  }
}
