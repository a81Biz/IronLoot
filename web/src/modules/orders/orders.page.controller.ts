import { Controller, Get, Render, UseGuards, Param, ParseUUIDPipe } from '@nestjs/common';
import { RequireAuth } from '../../common/guards/require-auth.guard';

@Controller('orders')
@UseGuards(RequireAuth)
export class OrdersPageController {
  @Get()
  @Render('pages/orders/list')
  ordersList() {
    return { title: 'Mis Órdenes' };
  }

  @Get(':id')
  @Render('pages/orders/detail')
  orderDetail(@Param('id', ParseUUIDPipe) id: string) {
    return { title: 'Detalle de Orden' };
  }
}
