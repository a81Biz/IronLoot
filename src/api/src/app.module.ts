import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';
import { conexionRedis, redisUrlObligatoria } from './common/config/redis-url';

// Configuration
import configuration from './common/config/configuration';
import { validateEnv } from './common/config/env.validation';

// Observability (logging, errors, metrics)
import { ObservabilityModule, ContextMiddleware } from './common/observability';
import { ThrottlerRedisModule, ThrottlerRedisService } from './common/redis/throttler-redis.module';

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
      // PT-137 — Esto leia `REDIS_HOST`/`REDIS_PORT` con reserva `localhost`, mientras el compose
      // declaraba solo `REDIS_URL`: las colas funcionaban por un `src/api/.env` fuera de git.
      useFactory: (config: ConfigService) => ({
        connection: conexionRedis(redisUrlObligatoria(config.get<string>('REDIS_URL'))),
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
    //
    // PT-128 (H-015): el cliente Redis lo provee `ThrottlerRedisModule`, no se crea aqui suelto.
    // Creado suelto, Nest no lo conocia y `app.close()` no lo cerraba: el socket y su temporizador
    // de reconexion sobrevivian al cierre y el proceso no terminaba.
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerRedisModule],
      inject: [ConfigService, ThrottlerRedisService],
      useFactory: (config: ConfigService, redis: ThrottlerRedisService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX', 100),
          },
        ],
        storage: new ThrottlerStorageRedisService(redis.client),
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
