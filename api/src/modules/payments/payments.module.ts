import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeProvider } from './providers/stripe.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { HeyBancoProvider } from './providers/heybanco.provider';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [ConfigModule, forwardRef(() => WalletModule)],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeProvider,
    MercadoPagoProvider,
    PaypalProvider,
    HeyBancoProvider,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
