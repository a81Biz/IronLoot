import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from './request-context.service';
import { StructuredLogger } from './logger.service';
import {
  LOG_METADATA_KEY,
  AUDIT_METADATA_KEY,
  ENTITY_METADATA_KEY,
  SKIP_LOG_METADATA_KEY,
  SLOW_THRESHOLD_METADATA_KEY,
  LogMetadata,
  AuditMetadata,
  EntityMetadata,
} from './decorators';
import { AuditEventType, EntityType, ActorType, AuditResult, LogLevel } from './constants';

/**
 * Audit persistence callback type
 */
export type AuditPersistFn = (data: {
  eventType: AuditEventType;
  traceId: string;
  actorType: ActorType;
  actorUserId?: string;
  entityType: EntityType;
  entityId: string;
  result: AuditResult;
  reasonCode?: string;
  payload?: Record<string, unknown>;
}) => Promise<void>;

/**
 * Request log persistence callback type
 */
export type RequestLogPersistFn = (data: {
  traceId: string;
  httpMethod: string;
  httpPath: string;
  httpStatus: number;
  durationMs: number;
  actorUserId?: string;
  actorState?: string;
  entityType?: string;
  entityId?: string;
}) => Promise<void>;

/**
 * ObservabilityInterceptor
 *
 * Central interceptor that:
 * 1. Processes @Log decorators for automatic logging
 * 2. Processes @Audit decorators for audit event recording
 * 3. Tracks request duration and slow endpoints
 * 4. Persists request logs to database
 *
 * Reference: 02-logging-y-trazabilidad.md
 */
@Injectable()
export class ObservabilityInterceptor implements NestInterceptor {
  private readonly env: string;
  private readonly defaultSlowThreshold: number;
  private auditPersistFn?: AuditPersistFn;
  private requestLogPersistFn?: RequestLogPersistFn;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly logger: StructuredLogger,
  ) {
    this.env = this.config.get<string>('NODE_ENV', 'development');
    this.defaultSlowThreshold = this.config.get<number>('SLOW_REQUEST_THRESHOLD_MS', 3000);
  }

  /**
   * Set audit persistence callback
   */
  setAuditPersistFn(fn: AuditPersistFn): void {
    this.auditPersistFn = fn;
  }

  /**
   * Set request log persistence callback
   */
  setRequestLogPersistFn(fn: RequestLogPersistFn): void {
    this.requestLogPersistFn = fn;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const handler = context.getHandler();
    const controller = context.getClass();
    const startTime = Date.now();

    // Get metadata from decorators
    const skipLog = this.reflector.get<boolean>(SKIP_LOG_METADATA_KEY, handler);
    const logMeta = this.reflector.get<LogMetadata>(LOG_METADATA_KEY, handler);
    const auditMeta = this.reflector.get<AuditMetadata>(AUDIT_METADATA_KEY, handler);
    const entityMeta = this.reflector.get<EntityMetadata>(ENTITY_METADATA_KEY, handler);
    const slowThreshold = this.reflector.get<number>(SLOW_THRESHOLD_METADATA_KEY, handler) 
      || this.defaultSlowThreshold;

    const controllerName = controller.name;
    const handlerName = handler.name;
    const methodArgs = context.getArgs().slice(0, -2); // Exclude req, res

    // Log method entry if @Log decorator present and not skipped
    if (logMeta && !skipLog) {
      this.logMethodEntry(controllerName, handlerName, logMeta, methodArgs);
    }

    // Extract entity info if available
    const entityInfo = this.extractEntityInfo(entityMeta, methodArgs);

    return next.handle().pipe(
      tap((result) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log method exit
        if (logMeta && !skipLog) {
          this.logMethodExit(controllerName, handlerName, logMeta, duration, result);
        }

        // Check for slow execution
        if (duration > slowThreshold) {
          this.logger.warn(`Slow execution: ${controllerName}.${handlerName}`, {
            context: 'SlowRequest',
            duration,
            data: { threshold: slowThreshold },
          });
        }

        // Record audit event if @Audit decorator present
        if (auditMeta) {
          this.recordAuditEvent(auditMeta, methodArgs, result, AuditResult.SUCCESS);
        }

        // Persist request log
        this.persistRequestLog(request, statusCode, duration, entityInfo);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Record failed audit event if configured
        if (auditMeta && auditMeta.logOnFailure) {
          this.recordAuditEvent(
            auditMeta,
            methodArgs,
            undefined,
            AuditResult.FAIL,
            error.code || error.message,
          );
        }

        // Note: Error itself is logged by GlobalExceptionFilter
        return throwError(() => error);
      }),
    );
  }

  // ===========================================
  // LOGGING
  // ===========================================

  private logMethodEntry(
    controller: string,
    method: string,
    meta: LogMetadata,
    args: any[],
  ): void {
    const message = meta.message || `${controller}.${method}() called`;
    
    let data: Record<string, unknown> | undefined;
    if (meta.includeArgs && args.length > 0) {
      data = { args: this.sanitizeArgs(args, meta.sensitiveArgs || []) };
    }

    this.logger.logWithLevel(meta.level || LogLevel.DEBUG, message, {
      context: controller,
      data,
    });
  }

  private logMethodExit(
    controller: string,
    method: string,
    meta: LogMetadata,
    duration: number,
    result: any,
  ): void {
    const message = `${controller}.${method}() completed`;
    
    let data: Record<string, unknown> = {};
    if (meta.includeResult && result !== undefined) {
      data.result = this.summarizeResult(result);
    }

    this.logger.logWithLevel(meta.level || LogLevel.DEBUG, message, {
      context: controller,
      duration,
      data: Object.keys(data).length > 0 ? data : undefined,
    });
  }

  private sanitizeArgs(args: any[], sensitiveIndices: number[]): any[] {
    return args.map((arg, index) => {
      if (sensitiveIndices.includes(index)) {
        return '[REDACTED]';
      }
      if (typeof arg === 'object' && arg !== null) {
        return this.summarizeResult(arg);
      }
      return arg;
    });
  }

  private summarizeResult(result: any): any {
    if (Array.isArray(result)) {
      return { _type: 'array', length: result.length };
    }
    if (typeof result === 'object' && result !== null) {
      const keys = Object.keys(result);
      if (keys.length > 10) {
        return { _type: 'object', keys: keys.slice(0, 10), totalKeys: keys.length };
      }
      // Return shallow copy with sensitive fields redacted
      const copy: Record<string, unknown> = {};
      for (const key of keys) {
        if (['password', 'token', 'secret', 'cardNumber'].some(s => key.toLowerCase().includes(s))) {
          copy[key] = '[REDACTED]';
        } else {
          copy[key] = result[key];
        }
      }
      return copy;
    }
    return result;
  }

  // ===========================================
  // ENTITY EXTRACTION
  // ===========================================

  private extractEntityInfo(
    meta: EntityMetadata | undefined,
    args: any[],
  ): { entityType?: string; entityId?: string } {
    if (!meta) return {};

    let entityId: string | undefined;

    if (typeof meta.idParam === 'number') {
      entityId = args[meta.idParam];
    } else if (typeof meta.idParam === 'string') {
      // Handle dot notation like 'dto.orderId'
      const parts = meta.idParam.split('.');
      let value: any = args[0];
      for (const part of parts) {
        value = value?.[part];
      }
      entityId = value;
    }

    return {
      entityType: meta.type,
      entityId: entityId?.toString(),
    };
  }

  // ===========================================
  // AUDIT
  // ===========================================

  private recordAuditEvent(
    meta: AuditMetadata,
    args: any[],
    result: any,
    auditResult: AuditResult,
    reasonCode?: string,
  ): void {
    if (!this.auditPersistFn) return;

    const ctx = this.requestContext.get();
    const traceId = ctx?.traceId || 'no-trace';
    const userId = ctx?.userId;

    // Extract entity ID
    let entityId: string;
    if (meta.entityIdExtractor) {
      try {
        entityId = meta.entityIdExtractor(args, result);
      } catch {
        entityId = 'unknown';
      }
    } else {
      entityId = 'unknown';
    }

    // Extract payload
    let payload: Record<string, unknown> = {};
    if (meta.payloadFields && args[0] && typeof args[0] === 'object') {
      const dto = args[0];
      for (const field of meta.payloadFields) {
        if (dto[field] !== undefined) {
          payload[field] = dto[field];
        }
      }
    }

    this.auditPersistFn({
      eventType: meta.eventType,
      traceId,
      actorType: userId ? ActorType.USER : ActorType.SYSTEM,
      actorUserId: userId,
      entityType: meta.entityType,
      entityId,
      result: auditResult,
      reasonCode,
      payload,
    }).catch((err) => {
      this.logger.warn('Failed to persist audit event', {
        context: 'AuditInterceptor',
        error: err,
      });
    });
  }

  // ===========================================
  // REQUEST LOG PERSISTENCE
  // ===========================================

  private persistRequestLog(
    request: Request,
    statusCode: number,
    durationMs: number,
    entityInfo: { entityType?: string; entityId?: string },
  ): void {
    if (!this.requestLogPersistFn) return;

    const ctx = this.requestContext.get();

    this.requestLogPersistFn({
      traceId: ctx?.traceId || 'no-trace',
      httpMethod: request.method,
      httpPath: request.path,
      httpStatus: statusCode,
      durationMs,
      actorUserId: ctx?.userId,
      actorState: ctx?.userState,
      entityType: entityInfo.entityType,
      entityId: entityInfo.entityId,
    }).catch((err) => {
      this.logger.warn('Failed to persist request log', {
        context: 'RequestLogInterceptor',
        error: err,
      });
    });
  }
}
