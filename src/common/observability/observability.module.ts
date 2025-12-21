import { Global, Module, OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, ModuleRef } from '@nestjs/core';

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

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Global interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ObservabilityInterceptor,
    },
  ],
  exports: [
    RequestContextService,
    StructuredLogger,
    MetricsService,
    ContextMiddleware,
  ],
})
export class ObservabilityModule implements OnModuleInit {
  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Hook called after module initialization
   * Used to wire up persistence callbacks between services
   */
  async onModuleInit(): Promise<void> {
    // Get instances
    const filter = this.moduleRef.get(GlobalExceptionFilter, { strict: false });
    const interceptor = this.moduleRef.get(ObservabilityInterceptor, { strict: false });

    // Try to get audit services from AuditModule (if loaded)
    // These will be set by the audit module when it initializes
    // This allows the observability module to work without database dependency

    // The actual wiring is done by AuditModule.onModuleInit()
    // See: src/modules/audit/audit.module.ts
  }
}
