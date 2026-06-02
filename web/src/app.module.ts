import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserMiddleware } from './common/middleware/user.middleware';

import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { CsrfMiddleware } from './common/middleware/csrf.middleware';

// Page Controllers (extracted from god AppController)
import { AuthPageController } from './modules/auth/auth.page.controller';
import { WalletPageController } from './modules/wallet/wallet.page.controller';
import { AuctionsPageController } from './modules/auctions/auctions.page.controller';
import { OrdersPageController } from './modules/orders/orders.page.controller';
import { SellerPageController, DashboardAuctionsPageController } from './modules/seller/seller.page.controller';
import { DisputesPageController } from './modules/disputes/disputes.page.controller';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
  ],
  controllers: [
    AppController,
    AuthPageController,
    WalletPageController,
    AuctionsPageController,
    OrdersPageController,
    SellerPageController,
    DashboardAuctionsPageController,
    DisputesPageController,
  ],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(UserMiddleware, CsrfMiddleware)
      .forRoutes('*');
  }
}
