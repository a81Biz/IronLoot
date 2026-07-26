import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PaymentsService } from './payments.service';
import { PaymentCycleService } from './payment-cycle.service';
import { PaymentReconciliationService } from './payment-reconciliation.service';
import { PaymentProviderRegistry, PAYMENT_PROVIDERS } from './payment-provider.registry';
import { PaymentTraceService } from './payment-trace.service';
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
    PaymentCycleService,
    PaymentReconciliationService,
    PaymentProviderRegistry,
    PaymentTraceService,
    {
      // PT-080 — Registro de pasarelas. Anadir una es crear su adaptador y sumarlo a esta
      // lista; quitarla, borrar esas dos cosas. La logica de transaccion no se toca.
      provide: PAYMENT_PROVIDERS,
      useFactory: (
        mercadopago: MercadoPagoProvider,
        paypal: PaypalProvider,
        stripe: StripeProvider,
        heybanco: HeyBancoProvider,
      ) => [mercadopago, paypal, stripe, heybanco],
      inject: [MercadoPagoProvider, PaypalProvider, StripeProvider, HeyBancoProvider],
    },
    StripeProvider,
    {
      provide: MercadoPagoProvider,
      useFactory: (t: PaymentTraceService) => new MercadoPagoProvider(t),
      inject: [PaymentTraceService],
    },
    PaypalProvider,
    HeyBancoProvider,
    WebhookRetryProducer,
    WebhookRetryWorker,
  ],
  exports: [
    PaymentsService,
    PaymentCycleService,
    PaymentProviderRegistry,
    PaymentTraceService,
    WebhookRetryProducer,
  ],
})
export class PaymentsModule {}
