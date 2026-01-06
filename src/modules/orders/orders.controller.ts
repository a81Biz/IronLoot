import { Order } from '@prisma/client';
import { Controller, Post, Get, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '@/modules/auth/decorators';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto';
import { Log, AuditedAction } from '../../common/observability/decorators';
import { AuditEventType, EntityType } from '../../common/observability/constants';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create order',
    description: 'Create an order from a won auction (Checkout trigger)',
  })
  @ApiResponse({ status: 201, description: 'Order created' })
  @AuditedAction(AuditEventType.ORDER_CREATED, EntityType.ORDER, (args, result) => result.id, [
    'auctionId',
  ])
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ): Promise<Order> {
    return this.ordersService.createFromAuction(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my orders', description: 'Get all orders where I am the buyer' })
  @Log()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<Order[]> {
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
