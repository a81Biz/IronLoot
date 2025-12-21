import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { getTraceId } from '../middleware/trace-id.middleware';
import { BusinessException, ErrorCode } from '../exceptions/business.exception';
import { ErrorEventService } from '../../modules/audit/error-event.service';
import { ErrorSeverity } from '../../modules/audit/audit.types';

/**
 * Error Response structure
 * Consistent format for all API errors
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
    timestamp: string;
    traceId: string;
    path: string;
    details?: Record<string, any>;
  };
}

/**
 * Error Log structure
 * Follows model in 02-logging-y-trazabilidad.md Section 5
 */
interface ErrorLog {
  timestamp: string;
  level: string;
  service: string;
  env: string;
  trace_id: string;
  error_code: string;
  message: string;
  http_status: number;
  is_business_error: boolean;
  context: {
    http_method: string;
    http_path: string;
    actor_user_id?: string;
    entity_type?: string;
    entity_id?: string;
  };
  stack?: string;
}

/**
 * HttpExceptionFilter
 *
 * Global exception filter that:
 * 1. Catches all exceptions (HTTP and business)
 * 2. Formats consistent error response
 * 3. Logs errors with full context
 * 4. Persists errors to database via ErrorEventService
 * 5. Sanitizes sensitive information
 *
 * Reference:
 * - Bases Técnicas.md (Sección 7 - Manejo de errores)
 * - 02-logging-y-trazabilidad.md (Modelo de error log)
 */
@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');
  private readonly serviceName = 'ironloot-api';
  private readonly env: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly errorEventService: ErrorEventService,
  ) {
    this.env = this.configService.get<string>('NODE_ENV', 'development');
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const traceId = getTraceId(request);

    // Determine error details based on exception type
    const { status, code, message, details, isBusinessError, stack } =
      this.extractErrorDetails(exception);

    // Build error response
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        status,
        timestamp: new Date().toISOString(),
        traceId,
        path: request.path,
        ...(details && Object.keys(details).length > 0 && { details }),
      },
    };

    // Build and emit error log
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: status >= 500 ? 'error' : 'warn',
      service: this.serviceName,
      env: this.env,
      trace_id: traceId,
      error_code: code,
      message,
      http_status: status,
      is_business_error: isBusinessError,
      context: {
        http_method: request.method,
        http_path: request.path,
        actor_user_id: (request as any).userId,
      },
      // Only include stack in non-production
      ...(this.env !== 'production' && stack && { stack }),
    };

    // Log error to console
    if (status >= 500) {
      this.logger.error(JSON.stringify(errorLog));
    } else {
      this.logger.warn(JSON.stringify(errorLog));
    }

    // Persist error to database (async, don't await to avoid blocking response)
    this.persistError(request, traceId, code, message, status, isBusinessError, stack, details);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Persist error to database asynchronously
   */
  private persistError(
    request: Request,
    traceId: string,
    errorCode: string,
    message: string,
    httpStatus: number,
    isBusinessError: boolean,
    stack?: string,
    details?: Record<string, any>,
  ): void {
    // Fire and forget - don't block the response
    this.errorEventService
      .record({
        traceId,
        errorCode,
        message,
        severity: httpStatus >= 500 ? ErrorSeverity.ERROR : ErrorSeverity.WARN,
        httpStatus,
        isBusinessError,
        httpMethod: request.method,
        httpPath: request.path,
        clientIp: request.ip,
        userAgent: request.headers['user-agent'],
        actorUserId: (request as any).userId,
        entityType: details?.entityType,
        entityId: details?.entityId,
        details: details || {},
        stack,
      })
      .catch((err) => {
        this.logger.error(`Failed to persist error event: ${err.message}`);
      });
  }

  /**
   * Extract error details from different exception types
   */
  private extractErrorDetails(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: Record<string, any>;
    isBusinessError: boolean;
    stack?: string;
  } {
    // Business exception (our custom exceptions)
    if (exception instanceof BusinessException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: exception.details,
        isBusinessError: true,
        stack: exception.stack,
      };
    }

    // Standard HTTP exception (NestJS built-in)
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const responseBody = typeof response === 'object' ? response : { message: response };

      return {
        status: exception.getStatus(),
        code: this.httpStatusToCode(exception.getStatus()),
        message: (responseBody as any).message || exception.message,
        details: (responseBody as any).error ? { error: (responseBody as any).error } : undefined,
        isBusinessError: false,
        stack: exception.stack,
      };
    }

    // Unknown error (catch-all)
    const error = exception as Error;
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: this.env === 'production' ? 'Internal server error' : error.message,
      isBusinessError: false,
      stack: error.stack,
    };
  }

  /**
   * Map HTTP status to error code
   */
  private httpStatusToCode(status: number): string {
    const statusCodeMap: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
      [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
      [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.INTERNAL_ERROR,
    };

    return statusCodeMap[status] || ErrorCode.INTERNAL_ERROR;
  }
}
