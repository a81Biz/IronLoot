import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestWithTrace, getTraceId } from './trace-id.middleware';

/**
 * Request Log structure
 * Follows the model defined in 02-logging-y-trazabilidad.md
 */
interface RequestLog {
  timestamp: string;
  level: string;
  service: string;
  env: string;
  trace_id: string;
  message: string;
  context: {
    http: {
      method: string;
      path: string;
      status_code?: number;
      duration_ms?: number;
    };
    actor?: {
      user_id?: string;
      ip?: string;
    };
  };
}

/**
 * RequestLoggerMiddleware
 *
 * Logs incoming requests and outgoing responses in structured format.
 * - Captures method, path, status, duration
 * - Attaches traceId for correlation
 * - Does NOT log sensitive data (body, auth headers)
 *
 * Reference: 02-logging-y-trazabilidad.md Section 4
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly serviceName = 'ironloot-api';
  private readonly env = process.env.NODE_ENV || 'development';

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const traceId = getTraceId(req);

    // Log request start (debug level)
    if (this.env === 'development') {
      this.logger.debug(`→ ${req.method} ${req.path}`, { traceId });
    }

    // Capture response on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Build structured log
      const log: RequestLog = {
        timestamp: new Date().toISOString(),
        level: statusCode >= 400 ? 'warn' : 'info',
        service: this.serviceName,
        env: this.env,
        trace_id: traceId,
        message: `${req.method} ${req.path} ${statusCode} ${duration}ms`,
        context: {
          http: {
            method: req.method,
            path: req.path,
            status_code: statusCode,
            duration_ms: duration,
          },
          actor: {
            // Note: user_id will be populated after auth middleware
            user_id: (req as any).userId,
            // Only log IP in non-production or with consent
            ip: this.env !== 'production' ? req.ip : undefined,
          },
        },
      };

      // Log based on status code
      if (statusCode >= 500) {
        this.logger.error(JSON.stringify(log));
      } else if (statusCode >= 400) {
        this.logger.warn(JSON.stringify(log));
      } else {
        this.logger.log(JSON.stringify(log));
      }
    });

    next();
  }
}
