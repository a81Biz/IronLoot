import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { RequestContext } from './constants';

/**
 * RequestContextService
 *
 * Provides request-scoped context throughout the application using AsyncLocalStorage.
 * This allows accessing traceId, userId, etc. from any service without passing them explicitly.
 *
 * Usage:
 * - Middleware sets the context at request start
 * - Any service can inject this and access context
 * - Context is automatically isolated per request
 *
 * Reference: 02-logging-y-trazabilidad.md
 */
@Injectable()
export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<RequestContext>();

  /**
   * Run a function within a request context
   * Used by middleware to establish context for the entire request lifecycle
   */
  run<T>(context: RequestContext, fn: () => T): T {
    return RequestContextService.storage.run(context, fn);
  }

  /**
   * Run async function within context
   */
  runAsync<T>(context: RequestContext, fn: () => Promise<T>): Promise<T> {
    return RequestContextService.storage.run(context, fn);
  }

  /**
   * Get current request context
   * Returns undefined if called outside of a request
   */
  get(): RequestContext | undefined {
    return RequestContextService.storage.getStore();
  }

  /**
   * Get context or throw if not available
   */
  getOrThrow(): RequestContext {
    const ctx = this.get();
    if (!ctx) {
      throw new Error('RequestContext not available - called outside of request scope');
    }
    return ctx;
  }

  /**
   * Get trace ID from current context
   */
  getTraceId(): string {
    return this.get()?.traceId || 'no-trace';
  }

  /**
   * Get user ID from current context
   */
  getUserId(): string | undefined {
    return this.get()?.userId;
  }

  /**
   * Get user state from current context
   */
  getUserState(): string | undefined {
    return this.get()?.userState;
  }

  /**
   * Set user information (called after authentication)
   */
  setUser(userId: string, userState?: string): void {
    const ctx = this.get();
    if (ctx) {
      ctx.userId = userId;
      ctx.userState = userState;
    }
  }

  /**
   * Add metadata to current context
   */
  setMetadata(key: string, value: unknown): void {
    const ctx = this.get();
    if (ctx) {
      ctx.metadata[key] = value;
    }
  }

  /**
   * Get metadata from current context
   */
  getMetadata<T = unknown>(key: string): T | undefined {
    return this.get()?.metadata[key] as T | undefined;
  }

  /**
   * Get elapsed time since request start (ms)
   */
  getElapsedMs(): number {
    const ctx = this.get();
    return ctx ? Date.now() - ctx.startTime : 0;
  }

  /**
   * Check if we're in a request context
   */
  hasContext(): boolean {
    return this.get() !== undefined;
  }

  /**
   * Create a new context object
   */
  createContext(traceId: string, options?: Partial<Omit<RequestContext, 'traceId' | 'metadata'>>): RequestContext {
    return {
      traceId,
      startTime: options?.startTime || Date.now(),
      userId: options?.userId,
      userState: options?.userState,
      path: options?.path,
      method: options?.method,
      ip: options?.ip,
      userAgent: options?.userAgent,
      metadata: {},
    };
  }
}
