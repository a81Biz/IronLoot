import { Module } from '@nestjs/common';
import { AuctionsController } from './auctions.controller';
import { AuctionsService } from './auctions.service';
import { AuctionsGateway } from './auctions.gateway';
import { DatabaseModule } from '../../database/database.module';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [DatabaseModule, SystemConfigModule],
  controllers: [AuctionsController],
  providers: [AuctionsService, AuctionsGateway],
  exports: [AuctionsService, AuctionsGateway],
})
export class AuctionsModule {}
