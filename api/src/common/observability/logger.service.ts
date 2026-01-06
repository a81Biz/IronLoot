import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RequestContextService } from './request-context.service';
import { LogLevel, LogEntry, LOG_LEVEL_PRIORITY } from './constants';

/**
 * Log Options
 */
export interface LogOptions {
  context?: string;
  data?: Record<string, unknown>;
  error?: Error;
  errorCode?: string;
  duration?: number;
}

/**
 * StructuredLogger
 *
 * Provides structured, JSON logging throughout the application.
 * Features:
 * - JSON structured output for log aggregation
 * - Automatic trace ID and user ID inclusion
 * - Level-based filtering by environment
 * - Sensitive data sanitization
 * - Child loggers with fixed context
 *
 * Reference: 02-logging-y-trazabilidad.md
 */
@Injectable()
export class StructuredLogger implements NestLoggerService {
  private readonly serviceName = 'ironloot-api';
  private readonly env: string;
  private readonly minLevel: LogLevel;
  private readonly isProd: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    this.env = this.config.get<string>('NODE_ENV', 'development');
    this.isProd = this.env === 'production';

    const configLevel = this.config.get<string>('LOG_LEVEL', 'debug');
    this.minLevel = (configLevel as LogLevel) || (this.isProd ? LogLevel.INFO : LogLevel.DEBUG);
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  debug(message: string, options?: LogOptions): void {
    this.write(LogLevel.DEBUG, message, options);
  }

  info(message: string, options?: LogOptions): void {
    this.write(LogLevel.INFO, message, options);
  }

  warn(message: string, options?: LogOptions): void {
    this.write(LogLevel.WARN, message, options);
  }

  error(message: string, options?: LogOptions): void {
    this.write(LogLevel.ERROR, message, options);
  }

  /**
   * Log with explicit level
   */
  logWithLevel(level: LogLevel, message: string, options?: LogOptions): void {
    this.write(level, message, options);
  }

  /**
   * Create a child logger with fixed context
   */
  child(context: string): ChildLogger {
    return new ChildLogger(this, context);
  }

  // ===========================================
  // NESTJS LOGGER SERVICE INTERFACE
  // ===========================================

  log(message: any, ...optionalParams: any[]): void {
    const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    this.info(String(message), { context });
  }

  verbose(message: any, ...optionalParams: any[]): void {
    const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    this.debug(String(message), { context });
  }

  fatal(message: any, ...optionalParams: any[]): void {
    const context = typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    this.error(String(message), { context });
  }

  // ===========================================
  // INTERNAL
  // ===========================================

  private write(level: LogLevel, message: string, options?: LogOptions): void {
    if (!this.shouldLog(level)) return;

    const entry = this.buildEntry(level, message, options);
    this.output(level, entry);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private buildEntry(level: LogLevel, message: string, options?: LogOptions): LogEntry {
    const ctx = this.requestContext.get();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      env: this.env,
      traceId: ctx?.traceId || 'no-context',
      message: this.sanitizeMessage(message),
      context: options?.context,
      userId: ctx?.userId,
      duration: options?.duration,
    };

    if (ctx?.method && ctx?.path) {
      entry.http = { method: ctx.method, path: ctx.path };
    }

    if (options?.data) {
      entry.data = this.sanitizeData(options.data);
    }

    if (options?.error) {
      entry.error = {
        code: options.errorCode,
        message: options.error.message,
        stack: this.isProd ? undefined : options.error.stack,
      };
    }

    return entry;
  }

  private output(level: LogLevel, entry: LogEntry): void {
    const json = JSON.stringify(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(json);
        break;
      case LogLevel.INFO:
        console.info(json);
        break;
      case LogLevel.WARN:
        console.warn(json);
        break;
      case LogLevel.ERROR:
        console.error(json);
        break;
    }
  }

  // ===========================================
  // SANITIZATION
  // ===========================================

  private sanitizeMessage(message: unknown): string {
    if (message === null || message === undefined) return '';

    const msg = typeof message === 'string' ? message : JSON.stringify(message);

    return (
      msg
        // Emails
        .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]')
        // Tokens/Keys (32+ chars)
        .replace(/[a-zA-Z0-9_-]{32,}/g, '[TOKEN]')
        // Credit cards
        .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    );
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
      'pin',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Child logger with fixed context
 */
export class ChildLogger {
  constructor(
    private readonly parent: StructuredLogger,
    private readonly context: string,
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.parent.debug(message, { context: this.context, data });
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.parent.info(message, { context: this.context, data });
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.parent.warn(message, { context: this.context, data });
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.parent.error(message, { context: this.context, error, data });
  }
}
