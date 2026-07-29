import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  // PT-174 — El aviso al comprador cuando el vendedor declara el envio: sin el, el comprador no sabe
  // que tiene algo que confirmar, y la confirmacion es lo que arranca el pago al vendedor.
  imports: [DatabaseModule, OrdersModule, NotificationsModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService],
})
export class ShipmentsModule {}
