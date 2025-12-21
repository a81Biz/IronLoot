import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { getTraceId } from '../middleware/trace-id.middleware';
import { RequestLogService } from '../../modules/audit/request-log.service';

/**
 * LoggingInterceptor
 *
 * Interceptor that wraps controller execution to:
 * 1. Log successful responses
 * 2. Track execution time
 * 3. Add context for debugging
 * 4. Persist request logs to database
 *
 * Works in conjunction with:
 * - TraceIdMiddleware (for correlation)
 * - HttpExceptionFilter (for error logging)
 *
 * Reference: 02-logging-y-trazabilidad.md
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Interceptor');
  private readonly env: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly requestLogService: RequestLogService,
  ) {
    this.env = this.configService.get<string>('NODE_ENV', 'development');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, path } = request;
    const traceId = getTraceId(request);
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;
    const startTime = Date.now();

    // Debug log in development
    if (this.env === 'development') {
      this.logger.debug(`[${traceId}] → ${controllerName}.${handlerName}()`);
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log successful execution in development
        if (this.env === 'development') {
          this.logger.debug(
            `[${traceId}] ← ${controllerName}.${handlerName}() completed in ${duration}ms`,
          );
        }

        // Persist request log to database (async)
        this.persistRequestLog(request, statusCode, duration, traceId);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;

        // Log error context (actual error is logged by HttpExceptionFilter)
        this.logger.debug(
          `[${traceId}] ✗ ${controllerName}.${handlerName}() failed after ${duration}ms`,
        );

        // Note: Error requests are logged by HttpExceptionFilter
        throw error;
      }),
    );
  }

  /**
   * Persist request log to database asynchronously
   */
  private persistRequestLog(
    request: Request,
    statusCode: number,
    durationMs: number,
    traceId: string,
  ): void {
    // Fire and forget - don't block the response
    this.requestLogService
      .record({
        traceId,
        httpMethod: request.method,
        httpPath: request.path,
        httpStatus: statusCode,
        durationMs,
        actorUserId: (request as any).userId,
        actorState: (request as any).userState,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
        clientApp: request.headers['x-client-app'] as string,
      })
      .catch((err) => {
        this.logger.warn(`Failed to persist request log: ${err.message}`);
      });
  }
}
