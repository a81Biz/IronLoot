import { Module } from '@nestjs/common';
import { BidsController, UserBidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuctionsModule } from '../auctions/auctions.module';

@Module({
  imports: [WalletModule, NotificationsModule, AuctionsModule],
  controllers: [BidsController, UserBidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
