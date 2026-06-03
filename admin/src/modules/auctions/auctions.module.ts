import { Module } from '@nestjs/common';
import { AuctionsAdminController } from './auctions.controller';
import { AuctionsAdminService } from './auctions.service';

@Module({
  controllers: [AuctionsAdminController],
  providers: [AuctionsAdminService],
})
export class AuctionsAdminModule {}
