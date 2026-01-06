import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContextService } from './request-context.service';

// Header name for trace ID
const TRACE_ID_HEADER = 'x-trace-id';

/**
 * Extend Express Request to include our properties
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      traceId?: string;
      userId?: string;
      userState?: string;
    }
  }
}

/**
 * ContextMiddleware
 *
 * Establishes request context at the start of each request:
 * 1. Generates or propagates trace ID
 * 2. Sets up AsyncLocalStorage context
 * 3. Adds trace ID to response headers
 *
 * This MUST be applied before any other middleware or interceptor
 * that depends on request context.
 *
 * Reference: 02-logging-y-trazabilidad.md
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Get or generate trace ID
    const traceId = this.getOrCreateTraceId(req);

    // Attach to request object for easy access
    req.traceId = traceId;

    // Add to response headers
    res.setHeader(TRACE_ID_HEADER, traceId);

    // Create context
    const context = this.requestContext.createContext(traceId, {
      path: req.path,
      method: req.method,
      ip: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });

    // Run the rest of the request within this context
    this.requestContext.run(context, () => {
      next();
    });
  }

  /**
   * Get trace ID from header or generate new one
   */
  private getOrCreateTraceId(req: Request): string {
    const headerValue = req.headers[TRACE_ID_HEADER];

    if (headerValue && typeof headerValue === 'string' && this.isValidTraceId(headerValue)) {
      return headerValue;
    }

    return uuidv4();
  }

  /**
   * Validate trace ID format (basic validation)
   */
  private isValidTraceId(traceId: string): boolean {
    // Allow UUIDs and reasonable alphanumeric strings
    return /^[a-zA-Z0-9-_]{8,64}$/.test(traceId);
  }

  /**
   * Get client IP, considering proxies
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      return ips[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}

/**
 * Helper to get trace ID from request object
 * Can be used in controllers/services that have access to Request
 */
export function getTraceId(req: Request): string {
  return req.traceId || 'no-trace';
}
