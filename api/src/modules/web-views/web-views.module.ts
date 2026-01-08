import { Module } from '@nestjs/common';
import { WebViewsController } from './web-views.controller';
import { OrdersModule } from '../orders/orders.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [OrdersModule, WalletModule],
  controllers: [WebViewsController],
})
export class WebViewsModule {}
