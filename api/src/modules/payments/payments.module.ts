import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OrdersModule } from '../orders/orders.module'; // Import OrdersModule
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaypalProvider } from './providers/paypal.provider';

@Module({
  imports: [DatabaseModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MercadoPagoProvider, PaypalProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
