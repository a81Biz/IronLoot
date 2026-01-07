import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuctionSchedulerService } from './auction-scheduler.service';
import { AuctionsModule } from '../auctions/auctions.module';
import { OrdersModule } from '../orders/orders.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuctionsModule,
    OrdersModule,
    WalletModule,
    NotificationsModule,
  ],
  providers: [AuctionSchedulerService],
})
export class SchedulerModule {}
