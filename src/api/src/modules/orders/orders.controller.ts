import { Order } from '@prisma/client';
import { Controller, Get, Param, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '@/modules/auth/decorators';
import { OrdersService } from './orders.service';
import { Log } from '../../common/observability/decorators';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /*
  @Post()
  @ApiOperation({
    summary: 'Create order (DISABLED)',
    description: 'Order creation is now handled automatically by the backend scheduler.',
  })
  @ApiResponse({ status: 410, description: 'Endpoint disabled' })
  async create(): Promise<void> {
    throw new ForbiddenException('Order creation is handled automatically');
  }
  */

  @Get()
  @ApiOperation({ summary: 'List orders', description: 'Get orders by role (buyer|seller)' })
  @ApiQuery({ name: 'role', required: false, enum: ['buyer', 'seller'] })
  @Log()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('role') role: 'buyer' | 'seller' = 'buyer',
  ): Promise<Order[]> {
    if (role === 'seller') {
      return this.ordersService.findAllForSeller(user.id);
    }
    return this.ordersService.findAllForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @Log()
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Order> {
    return this.ordersService.findOne(user.id, id);
  }
}
