import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Services
import { RequestContextService } from './request-context.service';
import { StructuredLogger } from './logger.service';
import { MetricsService } from './metrics.service';

// Filter & Interceptor
import { GlobalExceptionFilter } from './exception.filter';
import { ObservabilityInterceptor } from './observability.interceptor';

// Middleware
import { ContextMiddleware } from './context.middleware';

/**
 * ObservabilityModule
 *
 * Central module for all observability concerns:
 * - Request context (AsyncLocalStorage)
 * - Structured logging
 * - Exception handling
 * - Audit event tracking
 * - Request logging
 * - Metrics collection
 *
 * This module is GLOBAL - all services are available throughout the app.
 *
 * Usage in AppModule:
 * ```
 * @Module({
 *   imports: [ObservabilityModule],
 * })
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(ContextMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 *
 * Reference: 02-logging-y-trazabilidad.md, 03-modelo-registro-db.md
 */
@Global()
@Module({
  providers: [
    // Core services
    RequestContextService,
    StructuredLogger,
    MetricsService,

    // Middleware (exported, applied in AppModule)
    ContextMiddleware,

    // Global exception filter - also provide as class for DI access
    GlobalExceptionFilter,
    {
      provide: APP_FILTER,
      useExisting: GlobalExceptionFilter,
    },

    // Global interceptor - also provide as class for DI access
    ObservabilityInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: ObservabilityInterceptor,
    },
  ],
  exports: [
    RequestContextService,
    StructuredLogger,
    MetricsService,
    ContextMiddleware,
    GlobalExceptionFilter,
    ObservabilityInterceptor,
  ],
})
export class ObservabilityModule {}
