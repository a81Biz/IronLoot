import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Trace ID Header name
 * Used for correlation across requests and services
 */
export const TRACE_ID_HEADER = 'x-trace-id';

/**
 * Extended Express Request with traceId
 */
export interface RequestWithTrace extends Request {
  traceId: string;
}

/**
 * TraceIdMiddleware
 *
 * Ensures every request has a unique trace ID for correlation.
 * - If client sends X-Trace-Id header, use it
 * - Otherwise, generate a new UUID
 * - Attach to request object and response header
 *
 * This is critical for observability as defined in:
 * - 01-observabilidad-y-entornos.md (P2: Toda solicitud tiene correlación)
 * - 02-logging-y-trazabilidad.md
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Get trace ID from header or generate new one
    const traceId = (req.headers[TRACE_ID_HEADER] as string) || uuidv4();

    // Attach to request object for use in services/controllers
    (req as RequestWithTrace).traceId = traceId;

    // Set response header for client correlation
    res.setHeader(TRACE_ID_HEADER, traceId);

    next();
  }
}

/**
 * Helper to get traceId from request
 */
export function getTraceId(req: Request): string {
  return (req as RequestWithTrace).traceId || 'unknown';
}
