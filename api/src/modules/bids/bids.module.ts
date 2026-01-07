import { Module } from '@nestjs/common';
import { BidsController, UserBidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [BidsController, UserBidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
