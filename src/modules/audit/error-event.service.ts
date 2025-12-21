import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { CreateErrorEventInput, ErrorSeverity, ErrorEventQuery } from './audit.types';

/**
 * ErrorEventService
 *
 * Manages error event persistence for the application.
 * All errors (business and technical) should be recorded through this service.
 *
 * Reference: 03-modelo-registro-db.md Section 3.2
 */
@Injectable()
export class ErrorEventService {
  private readonly logger = new Logger(ErrorEventService.name);
  private readonly serviceName = 'ironloot-api';
  private readonly env: string;
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.env = this.configService.get<string>('NODE_ENV', 'development');
    this.isProd = this.env === 'production';
  }

  /**
   * Record an error event
   *
   * @param input - Error details
   * @returns Created error event ID
   */
  async record(input: CreateErrorEventInput): Promise<string> {
    try {
      // Sanitize stack trace in production
      const sanitizedStack = this.isProd ? this.truncateStack(input.stack) : input.stack;

      // Sanitize details - remove sensitive fields
      const sanitizedDetails = this.sanitizeDetails(input.details);

      const errorEvent = await this.prisma.errorEvent.create({
        data: {
          traceId: input.traceId,
          env: this.env,
          service: this.serviceName,
          errorCode: input.errorCode,
          message: this.sanitizeMessage(input.message),
          severity: input.severity,
          httpStatus: input.httpStatus,
          isBusinessError: input.isBusinessError,
          httpMethod: input.httpMethod,
          httpPath: input.httpPath,
          httpQuery: this.isProd ? undefined : input.httpQuery, // Don't log query in prod
          clientIp: this.isProd ? undefined : input.clientIp, // Privacy in prod
          userAgent: this.truncateUserAgent(input.userAgent),
          actorUserId: input.actorUserId,
          entityType: input.entityType,
          entityId: input.entityId,
          details: sanitizedDetails,
          stack: sanitizedStack,
        },
      });

      return errorEvent.id;
    } catch (error) {
      // Log to console as fallback - error recording should never fail silently
      this.logger.error(`Failed to record error event: ${(error as Error).message}`, {
        originalError: input.errorCode,
        traceId: input.traceId,
      });
      return '';
    }
  }

  /**
   * Record a business error
   * For expected errors like validation failures, business rule violations
   */
  async recordBusinessError(
    input: Omit<CreateErrorEventInput, 'isBusinessError' | 'severity'>,
  ): Promise<string> {
    return this.record({
      ...input,
      isBusinessError: true,
      severity: ErrorSeverity.WARN,
    });
  }

  /**
   * Record a technical/system error
   * For unexpected errors, exceptions, infrastructure issues
   */
  async recordSystemError(
    input: Omit<CreateErrorEventInput, 'isBusinessError' | 'severity'>,
  ): Promise<string> {
    return this.record({
      ...input,
      isBusinessError: false,
      severity: ErrorSeverity.ERROR,
    });
  }

  /**
   * Query errors by trace ID
   * Useful for debugging a specific request
   */
  async findByTraceId(traceId: string): Promise<any[]> {
    return this.prisma.errorEvent.findMany({
      where: { traceId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Query errors by error code
   * Useful for analyzing recurring issues
   */
  async findByErrorCode(errorCode: string, limit = 100): Promise<any[]> {
    return this.prisma.errorEvent.findMany({
      where: { errorCode },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Query errors by HTTP status
   * Useful for monitoring specific error types
   */
  async findByHttpStatus(httpStatus: number, limit = 100): Promise<any[]> {
    return this.prisma.errorEvent.findMany({
      where: { httpStatus },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Advanced query with filters
   */
  async query(filters: ErrorEventQuery): Promise<any[]> {
    const where: any = {};

    if (filters.traceId) where.traceId = filters.traceId;
    if (filters.errorCode) where.errorCode = filters.errorCode;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.httpStatus) where.httpStatus = filters.httpStatus;

    if (filters.fromDate || filters.toDate) {
      where.timestamp = {};
      if (filters.fromDate) where.timestamp.gte = filters.fromDate;
      if (filters.toDate) where.timestamp.lte = filters.toDate;
    }

    return this.prisma.errorEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
    });
  }

  /**
   * Get error statistics for a time period
   */
  async getStats(fromDate: Date, toDate: Date): Promise<{
    total: number;
    byCode: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const errors = await this.prisma.errorEvent.findMany({
      where: {
        timestamp: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        errorCode: true,
        httpStatus: true,
      },
    });

    const byCode: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const error of errors) {
      byCode[error.errorCode] = (byCode[error.errorCode] || 0) + 1;
      if (error.httpStatus) {
        byStatus[error.httpStatus.toString()] =
          (byStatus[error.httpStatus.toString()] || 0) + 1;
      }
    }

    return {
      total: errors.length,
      byCode,
      byStatus,
    };
  }

  // ===========================================
  // SANITIZATION HELPERS
  // ===========================================

  /**
   * Truncate stack trace for production
   * Keep only the first few frames
   */
  private truncateStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    if (!this.isProd) return stack;

    const lines = stack.split('\n');
    return lines.slice(0, 5).join('\n') + '\n... (truncated)';
  }

  /**
   * Truncate user agent to reasonable length
   */
  private truncateUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;
    return userAgent.length > 500 ? userAgent.substring(0, 500) : userAgent;
  }

  /**
   * Remove sensitive fields from details object
   */
  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> {
    if (!details) return {};

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'authorization',
      'cookie',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
    ];

    const sanitized = { ...details };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize error message
   * Remove potential sensitive data from error messages
   */
  private sanitizeMessage(message: string): string {
    // Remove potential email patterns
    let sanitized = message.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

    // Remove potential tokens/keys (long alphanumeric strings)
    sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[TOKEN]');

    return sanitized;
  }
}
