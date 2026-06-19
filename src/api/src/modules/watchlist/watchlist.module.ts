import { Module } from '@nestjs/common';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { AuctionsModule } from '../auctions/auctions.module';
import { DatabaseModule } from '../../database/database.module'; // Assuming Prisma is here OR direct import. Default is importing PrismaService via module.
// However, AppModule structure suggests global DB or similar. Let's check imports.
// Usually PrismaService is in DatabaseModule.
// Also requires Observability module (for Logger).

@Module({
  imports: [AuctionsModule, DatabaseModule],
  controllers: [WatchlistController],
  providers: [WatchlistService],
  exports: [WatchlistService],
})
export class WatchlistModule {}
