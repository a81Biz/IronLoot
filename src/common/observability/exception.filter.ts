import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from './request-context.service';
import { StructuredLogger } from './logger.service';
import { BusinessException } from './exceptions';
import { ErrorCode, ErrorResponse, ErrorSeverity, LogLevel } from './constants';

/**
 * Error persistence callback type
 * Allows injecting database persistence without direct dependency
 */
export type ErrorPersistFn = (data: {
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
}) => Promise<void>;

/**
 * GlobalExceptionFilter
 *
 * Catches all exceptions and:
 * 1. Formats consistent error response
 * 2. Logs errors with full context
 * 3. Persists errors to database (if callback provided)
 * 4. Sanitizes sensitive information in production
 *
 * Reference: Bases Técnicas.md Section 7
 */
@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly env: string;
  private readonly isProd: boolean;
  private persistFn?: ErrorPersistFn;

  constructor(
    private readonly config: ConfigService,
    private readonly requestContext: RequestContextService,
    private readonly logger: StructuredLogger,
  ) {
    this.env = this.config.get<string>('NODE_ENV', 'development');
    this.isProd = this.env === 'production';
  }

  /**
   * Set error persistence callback
   * Called by module initialization to inject database service
   */
  setPersistFn(fn: ErrorPersistFn): void {
    this.persistFn = fn;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = this.requestContext.getTraceId();
    const userId = this.requestContext.getUserId();

    // Extract error details
    const errorDetails = this.extractErrorDetails(exception);

    // Build response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorDetails.code,
        message: errorDetails.message,
        status: errorDetails.status,
        timestamp: new Date().toISOString(),
        traceId,
        path: request.path,
        ...(errorDetails.details &&
          Object.keys(errorDetails.details).length > 0 && {
            details: errorDetails.details,
          }),
      },
    };

    // Log error
    const level = errorDetails.status >= 500 ? LogLevel.ERROR : LogLevel.WARN;
    this.logger.logWithLevel(level, errorDetails.message, {
      context: 'ExceptionFilter',
      errorCode: errorDetails.code,
      error: exception instanceof Error ? exception : new Error(String(exception)),
      data: {
        httpStatus: errorDetails.status,
        isBusinessError: errorDetails.isBusinessError,
        entityType: errorDetails.entityType,
        entityId: errorDetails.entityId,
      },
    });

    // Persist to database (async, non-blocking)
    this.persistError(request, traceId, userId, errorDetails);

    // Send response
    response.status(errorDetails.status).json(errorResponse);
  }

  /**
   * Extract error details from different exception types
   */
  private extractErrorDetails(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
    isBusinessError: boolean;
    stack?: string;
    entityType?: string;
    entityId?: string;
  } {
    // BusinessException (our custom exceptions)
    if (exception instanceof BusinessException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
        isBusinessError: exception.isBusinessError(),
        stack: exception.stack,
        entityType: exception.entityType,
        entityId: exception.entityId,
      };
    }

    // Standard HttpException (NestJS built-in)
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const body = typeof response === 'object' ? response : { message: response };

      return {
        status: exception.getStatus(),
        code: this.httpStatusToCode(exception.getStatus()),
        message: (body as any).message || exception.message,
        details: (body as any).error ? { error: (body as any).error } : undefined,
        isBusinessError: exception.getStatus() < 500,
        stack: exception.stack,
      };
    }

    // Unknown error
    const error = exception as Error;
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: this.isProd ? 'Internal server error' : error.message || 'Unknown error',
      isBusinessError: false,
      stack: error.stack,
    };
  }

  /**
   * Map HTTP status to error code
   */
  private httpStatusToCode(status: number): string {
    const map: Record<number, string> = {
      400: ErrorCode.VALIDATION_ERROR,
      401: ErrorCode.UNAUTHORIZED,
      403: ErrorCode.FORBIDDEN,
      404: ErrorCode.NOT_FOUND,
      409: ErrorCode.CONFLICT,
      429: ErrorCode.RATE_LIMIT_EXCEEDED,
    };
    return map[status] || ErrorCode.INTERNAL_ERROR;
  }

  /**
   * Persist error to database (async, non-blocking)
   */
  private persistError(
    request: Request,
    traceId: string,
    userId: string | undefined,
    error: {
      status: number;
      code: string;
      message: string;
      isBusinessError: boolean;
      stack?: string;
      details?: Record<string, unknown>;
      entityType?: string;
      entityId?: string;
    },
  ): void {
    if (!this.persistFn) return;

    this.persistFn({
      traceId,
      errorCode: error.code,
      message: error.message,
      severity: error.status >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
      httpStatus: error.status,
      isBusinessError: error.isBusinessError,
      httpMethod: request.method,
      httpPath: request.path,
      actorUserId: userId,
      entityType: error.entityType,
      entityId: error.entityId,
      details: error.details,
      stack: this.isProd ? undefined : error.stack,
    }).catch((err) => {
      this.logger.warn('Failed to persist error event', {
        context: 'ExceptionFilter',
        error: err,
      });
    });
  }
}
