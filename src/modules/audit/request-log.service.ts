import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CreateRequestLogInput } from './audit.types';

/**
 * RequestLogService
 *
 * Manages HTTP request/response logging for diagnostics and monitoring.
 * In production, logs may be sampled or filtered to reduce storage.
 *
 * Reference: 03-modelo-registro-db.md Section 3.3
 */
@Injectable()
export class RequestLogService {
  private readonly logger = new Logger(RequestLogService.name);
  private readonly serviceName = 'ironloot-api';
  private readonly env: string;
  private readonly isProd: boolean;
  private readonly isEnabled: boolean;

  // Sample rate for production (1 = log all, 0.1 = log 10%)
  private readonly sampleRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.env = this.configService.get<string>('NODE_ENV', 'development');
    this.isProd = this.env === 'production';

    // In prod, sample requests to reduce storage
    this.sampleRate = this.isProd ? 0.1 : 1;

    // Can be disabled entirely via config
    this.isEnabled = this.configService.get<boolean>('REQUEST_LOGGING_ENABLED', true);
  }

  /**
   * Record a request log
   *
   * @param input - Request details
   * @returns Created log ID or empty if skipped
   */
  async record(input: CreateRequestLogInput): Promise<string> {
    // Check if logging is enabled
    if (!this.isEnabled) return '';

    // Apply sampling in production
    if (this.isProd && Math.random() > this.sampleRate) {
      // Skip this request based on sample rate
      // But always log errors (status >= 400)
      if (input.httpStatus < 400) {
        return '';
      }
    }

    try {
      const log = await this.prisma.requestLog.create({
        data: {
          traceId: input.traceId,
          env: this.env,
          service: this.serviceName,
          httpMethod: input.httpMethod,
          httpPath: input.httpPath,
          httpStatus: input.httpStatus,
          durationMs: input.durationMs,
          requestSizeBytes: input.requestSizeBytes,
          responseSizeBytes: input.responseSizeBytes,
          actorUserId: input.actorUserId,
          actorState: input.actorState,
          clientIp: this.isProd ? undefined : input.clientIp, // Privacy in prod
          userAgent: this.truncateUserAgent(input.userAgent),
          clientApp: input.clientApp,
          entityType: input.entityType,
          entityId: input.entityId,
        },
      });

      return log.id;
    } catch (error) {
      // Log to console but don't throw - request logging should not break requests
      this.logger.warn(`Failed to record request log: ${(error as Error).message}`);
      return '';
    }
  }

  /**
   * Query logs by trace ID
   */
  async findByTraceId(traceId: string): Promise<any[]> {
    return this.prisma.requestLog.findMany({
      where: { traceId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Query logs by path
   * Useful for analyzing specific endpoints
   */
  async findByPath(httpPath: string, limit = 100): Promise<any[]> {
    return this.prisma.requestLog.findMany({
      where: { httpPath },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Query slow requests
   * Useful for performance analysis
   */
  async findSlowRequests(minDurationMs: number, limit = 100): Promise<any[]> {
    return this.prisma.requestLog.findMany({
      where: {
        durationMs: {
          gte: minDurationMs,
        },
      },
      orderBy: { durationMs: 'desc' },
      take: limit,
    });
  }

  /**
   * Query error responses
   */
  async findErrors(limit = 100): Promise<any[]> {
    return this.prisma.requestLog.findMany({
      where: {
        httpStatus: {
          gte: 400,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get request statistics for a time period
   */
  async getStats(fromDate: Date, toDate: Date): Promise<{
    totalRequests: number;
    avgDurationMs: number;
    errorRate: number;
    byPath: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const logs = await this.prisma.requestLog.findMany({
      where: {
        timestamp: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        httpPath: true,
        httpStatus: true,
        durationMs: true,
      },
    });

    if (logs.length === 0) {
      return {
        totalRequests: 0,
        avgDurationMs: 0,
        errorRate: 0,
        byPath: {},
        byStatus: {},
      };
    }

    const byPath: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalDuration = 0;
    let errorCount = 0;

    for (const log of logs) {
      byPath[log.httpPath] = (byPath[log.httpPath] || 0) + 1;
      byStatus[log.httpStatus.toString()] = (byStatus[log.httpStatus.toString()] || 0) + 1;
      totalDuration += log.durationMs;
      if (log.httpStatus >= 400) errorCount++;
    }

    return {
      totalRequests: logs.length,
      avgDurationMs: Math.round(totalDuration / logs.length),
      errorRate: errorCount / logs.length,
      byPath,
      byStatus,
    };
  }

  /**
   * Cleanup old logs
   * Should be called by a scheduled job
   */
  async cleanup(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.requestLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} request logs older than ${olderThanDays} days`);
    return result.count;
  }

  // ===========================================
  // HELPERS
  // ===========================================

  private truncateUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    return userAgent.length > 300 ? userAgent.substring(0, 300) : userAgent;
  }
}
