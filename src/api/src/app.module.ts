import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import Redis from 'ioredis';
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
import { SchedulerModule } from './modules/scheduler/scheduler.module';

// Feature modules
import { AuthModule, JwtAuthGuard } from './modules/auth';
import { UsersModule } from './modules/users/users.module';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { BidsModule } from './modules/bids/bids.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { WalletModule } from './modules/wallet/wallet.module';
import { UploadModule } from './modules/upload/upload.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { SystemCleanupModule } from './modules/system-cleanup/system-cleanup.module';
import { AdminModule } from './modules/admin/admin.module';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { KycModule } from './modules/kyc/kyc.module';
import { CfdiModule } from './modules/cfdi/cfdi.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { SeoModule } from './modules/seo/seo.module';
import { CmsModule } from './modules/cms/cms.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    // Domain events bus (PT-013: scheduler uses this to emit AuctionClosedEvent)
    EventEmitterModule.forRoot(),

    // BullMQ — shared Redis connection (PT-038)
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    // Configuration module (loads .env and validates)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting (global) — Redis storage for shared counters across instances (PT-030)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD') || undefined,
          }),
        ),
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

    // Background tasks scheduler (auction lifecycle)
    SchedulerModule,

    // Authentication & Authorization
    AuthModule,

    // Feature modules (uncomment as implemented)
    UsersModule,
    AuctionsModule,
    BidsModule,
    OrdersModule,
    PaymentsModule,
    ShipmentsModule,
    RatingsModule,
    DisputesModule,
    NotificationsModule,
    WalletModule,
    UploadModule,
    WatchlistModule,
    SystemCleanupModule,
    AdminModule,
    SystemConfigModule,
    CommissionsModule,
    KycModule,
    CfdiModule,
    RefundsModule,
    SeoModule,
    CmsModule,
    FeatureFlagsModule,

    // Serve Static Uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
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
