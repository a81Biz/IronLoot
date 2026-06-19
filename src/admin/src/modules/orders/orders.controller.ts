import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AdminAuthGuard } from '../../auth/auth.guard';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('orders')
  @UseGuards(AdminAuthGuard)
  async orders(
    @Req() req,
    @Res() res,
    @Query('page') page = '1',
    @Query('status') status?: string,
  ) {
    const result = await this.ordersService.getOrders(Number(page), status);
    return res.render('pages/orders', {
      title: 'Órdenes',
      result,
      adminUser: req.session.adminUser,
      activePage: 'orders',
    });
  }
}
