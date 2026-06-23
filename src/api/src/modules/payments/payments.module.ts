import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeProvider } from './providers/stripe.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { HeyBancoProvider } from './providers/heybanco.provider';
import { WebhookRetryProducer, WEBHOOK_RETRY_QUEUE } from './webhook-retry.producer';
import { WebhookRetryWorker } from './webhook-retry.worker';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => WalletModule),
    BullModule.registerQueue({ name: WEBHOOK_RETRY_QUEUE }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeProvider,
    MercadoPagoProvider,
    PaypalProvider,
    HeyBancoProvider,
    WebhookRetryProducer,
    WebhookRetryWorker,
  ],
  exports: [PaymentsService, WebhookRetryProducer],
})
export class PaymentsModule {}
