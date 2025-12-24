import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  GlobalExceptionFilter,
  ObservabilityInterceptor,
  AuditEventType,
  EntityType,
  ActorType,
  AuditResult,
  ErrorSeverity,
} from '../../common/observability';

/**
 * AuditPersistenceService
 *
 * Handles persistence of audit events, error events, and request logs to the database.
 * Connects with ObservabilityModule's filter and interceptor to receive events.
 *
 * Reference: 03-modelo-registro-db.md
 */
@Injectable()
export class AuditPersistenceService implements OnModuleInit {
  private readonly serviceName = 'ironloot-api';
  private readonly env: string;
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly logger: StructuredLogger,
    private readonly exceptionFilter: GlobalExceptionFilter,
    private readonly interceptor: ObservabilityInterceptor,
  ) {
    this.env = this.config.get<string>('NODE_ENV', 'development');
    this.isProd = this.env === 'production';
  }

  /**
   * Wire up persistence callbacks to observability module
   */
  async onModuleInit(): Promise<void> {
    try {
      // Wire up error persistence
      this.exceptionFilter.setPersistFn(this.persistError.bind(this));
      this.logger.info('Error persistence connected', { context: 'AuditPersistence' });

      // Wire up audit and request log persistence
      this.interceptor.setAuditPersistFn(this.persistAuditEvent.bind(this));
      this.interceptor.setRequestLogPersistFn(this.persistRequestLog.bind(this));
      this.logger.info('Audit persistence connected', { context: 'AuditPersistence' });
    } catch (error) {
      this.logger.warn('Failed to wire up persistence callbacks', {
        context: 'AuditPersistence',
        error: error as Error,
      });
    }
  }

  // ===========================================
  // AUDIT EVENTS
  // ===========================================

  /**
   * Persist an audit event
   */
  async persistAuditEvent(data: {
    eventType: AuditEventType;
    traceId: string;
    actorType: ActorType;
    actorUserId?: string;
    entityType: EntityType;
    entityId: string;
    result: AuditResult;
    reasonCode?: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          eventType: data.eventType,
          traceId: data.traceId,
          env: this.env,
          service: this.serviceName,
          actorType: data.actorType,
          actorUserId: data.actorUserId,
          entityType: data.entityType,
          entityId: data.entityId,
          result: data.result,
          reasonCode: data.reasonCode,
          payload: (data.payload || {}) as Prisma.InputJsonValue,
          payloadVersion: 1,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to persist audit event', {
        context: 'AuditPersistence',
        error: error as Error,
        data: { eventType: data.eventType, entityType: data.entityType },
      });
    }
  }

  /**
   * Record audit event directly (for use in services)
   */
  async recordAudit(
    traceId: string,
    eventType: AuditEventType,
    entityType: EntityType,
    entityId: string,
    result: AuditResult,
    options?: {
      actorUserId?: string;
      reasonCode?: string;
      payload?: Record<string, unknown>;
    },
  ): Promise<string | null> {
    try {
      const event = await this.prisma.auditEvent.create({
        data: {
          eventType,
          traceId,
          env: this.env,
          service: this.serviceName,
          actorType: options?.actorUserId ? ActorType.USER : ActorType.SYSTEM,
          actorUserId: options?.actorUserId,
          entityType,
          entityId,
          result,
          reasonCode: options?.reasonCode,
          payload: (options?.payload || {}) as Prisma.InputJsonValue,
          payloadVersion: 1,
        },
      });
      return event.id;
    } catch (error) {
      this.logger.warn('Failed to record audit event', {
        context: 'AuditPersistence',
        error: error as Error,
      });
      return null;
    }
  }

  // ===========================================
  // ERROR EVENTS
  // ===========================================

  /**
   * Persist an error event
   */
  async persistError(data: {
    traceId: string;
    errorCode: string;
    message: string;
    severity: ErrorSeverity;
    httpStatus: number;
    isBusinessError: boolean;
    httpMethod?: string;
    httpPath?: string;
    actorUserId?: string;
    entityType?: string;
    entityId?: string;
    details?: Record<string, unknown>;
    stack?: string;
  }): Promise<void> {
    try {
      await this.prisma.errorEvent.create({
        data: {
          traceId: data.traceId,
          env: this.env,
          service: this.serviceName,
          errorCode: data.errorCode,
          message: this.sanitizeMessage(data.message),
          severity: data.severity,
          httpStatus: data.httpStatus,
          isBusinessError: data.isBusinessError,
          httpMethod: data.httpMethod,
          httpPath: data.httpPath,
          actorUserId: data.actorUserId,
          entityType: data.entityType,
          entityId: data.entityId,
          details: this.sanitizeDetails(data.details || {}) as Prisma.InputJsonValue,
          stack: this.isProd ? this.truncateStack(data.stack) : data.stack,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to persist error event', {
        context: 'AuditPersistence',
        error: error as Error,
        data: { errorCode: data.errorCode },
      });
    }
  }

  // ===========================================
  // REQUEST LOGS
  // ===========================================

  /**
   * Persist a request log
   */
  async persistRequestLog(data: {
    traceId: string;
    httpMethod: string;
    httpPath: string;
    httpStatus: number;
    durationMs: number;
    actorUserId?: string;
    actorState?: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    // Sample in production (log 10% of successful requests, all errors)
    if (this.isProd && data.httpStatus < 400 && Math.random() > 0.1) {
      return;
    }

    try {
      await this.prisma.requestLog.create({
        data: {
          traceId: data.traceId,
          env: this.env,
          service: this.serviceName,
          httpMethod: data.httpMethod,
          httpPath: data.httpPath,
          httpStatus: data.httpStatus,
          durationMs: data.durationMs,
          actorUserId: data.actorUserId,
          actorState: data.actorState,
          entityType: data.entityType,
          entityId: data.entityId,
        },
      });
    } catch (error) {
      // Silent fail for request logs - high volume, low priority
    }
  }

  // ===========================================
  // QUERY METHODS
  // ===========================================

  /**
   * Get audit events for an entity
   */
  async getAuditHistory(entityType: EntityType, entityId: string, limit = 50) {
    return this.prisma.auditEvent.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get errors by trace ID
   */
  async getErrorsByTrace(traceId: string) {
    return this.prisma.errorEvent.findMany({
      where: { traceId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Get recent errors by code
   */
  async getRecentErrors(errorCode?: string, limit = 100) {
    return this.prisma.errorEvent.findMany({
      where: errorCode ? { errorCode } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  // ===========================================
  // SANITIZATION HELPERS
  // ===========================================

  private sanitizeMessage(message: unknown): string {
    if (message === null || message === undefined) return '';

    const msg = typeof message === 'string' ? message : JSON.stringify(message);

    return msg
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
      .replace(/[a-zA-Z0-9_-]{32,}/g, '[TOKEN]');
  }

  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'cookie', 'cardNumber', 'cvv'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private truncateStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    const lines = stack.split('\n');
    return lines.slice(0, 5).join('\n') + (lines.length > 5 ? '\n... (truncated)' : '');
  }
}
