import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Configuration
import configuration from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';

// Observability (logging, errors, metrics)
import { ObservabilityModule, ContextMiddleware } from './common/observability';

// Core modules
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';
import { DiagnosticsModule } from './modules/diagnostics/diagnostics.module';

// Feature modules
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { UsersModule } from './modules/users/users.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { BidsModule } from './modules/bids/bids.module';
import { OrdersModule } from './modules/orders/orders.module';
// import { BidsModule } from './modules/bids/bids.module';
// import { OrdersModule } from './modules/orders/orders.module';
// import { PaymentsModule } from './modules/payments/payments.module';
// import { ShipmentsModule } from './modules/shipments/shipments.module';
// import { RatingsModule } from './modules/ratings/ratings.module';
// import { DisputesModule } from './modules/disputes/disputes.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    // Configuration module (loads .env and validates)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting (global)
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
      }),
    }),

    // Observability (logging, errors, metrics, context)
    // This provides: StructuredLogger, MetricsService, RequestContextService
    // Plus global exception filter and interceptor
    ObservabilityModule,

    // Database access (Prisma)
    DatabaseModule,

    // Audit persistence (connects to ObservabilityModule)
    AuditModule,

    // Health check
    HealthModule,

    // Diagnostics (logs, errors, metrics - dev only)
    DiagnosticsModule,

    // Authentication & Authorization
    AuthModule,

    // Feature modules (uncomment as implemented)
    UsersModule,
    AuctionsModule,
    BidsModule,
    OrdersModule,
    // BidsModule,
    // OrdersModule,
    // PaymentsModule,
    // ShipmentsModule,
    // RatingsModule,
    // DisputesModule,
    // NotificationsModule,
  ],
  providers: [
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global JWT authentication guard
    // Routes are protected by default, use @Public() to make them public
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply context middleware FIRST to all routes
    // This establishes AsyncLocalStorage context for request tracking
    consumer.apply(ContextMiddleware).forRoutes('*');
  }
}
