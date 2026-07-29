import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { DevelopmentOnlyGuard } from '../../common/guards/development-only.guard';
import { SystemCleanupService } from './system-cleanup.service';
import { AuctionsModule } from '../auctions/auctions.module';
import { OrdersModule } from '../orders/orders.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DistributedLockService } from '../../common/redis/distributed-lock.service';
import { SystemConfigModule } from '../system-config/system-config.module';
import { CommissionsModule } from '../commissions/commissions.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuctionsModule,
    OrdersModule,
    WalletModule,
    NotificationsModule,
    SystemConfigModule,
    CommissionsModule,
  ],
  // PT-174 — El controlador expone UN disparador, y sólo en desarrollo: `DevelopmentOnlyGuard` aborta
  // con 403 si `NODE_ENV=production`.
  controllers: [SchedulerController],
  providers: [
    AuctionSchedulerService,
    SystemCleanupService,
    DistributedLockService,
    DevelopmentOnlyGuard,
  ],
  exports: [AuctionSchedulerService],
})
export class SchedulerModule {}
