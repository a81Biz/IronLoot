import { Controller, Post, Body, Param, UseGuards, Get, Headers, Query } from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto, ProcessPaymentDto } from './dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { CreatePaymentResult } from './interfaces';
import { Log, AuditedAction } from '../../common/observability/decorators';
import { AuditEventType, EntityType } from '../../common/observability/constants';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Initiate checkout',
    description: 'Create a payment session for an order',
  })
  @ApiResponse({ status: 201, description: 'Redirect URL generated' })
  @AuditedAction(AuditEventType.PAYMENT_INITIATED, EntityType.ORDER, (args) => args[1].orderId)
  async createCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CreatePaymentResult> {
    return this.paymentsService.createCheckoutSession(user.id, user.email, dto);
  }

  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Webhook endpoint', description: 'Receive payment updates' })
  @Log()
  async webhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>,
  ): Promise<{ received: boolean }> {
    return this.paymentsService.handleWebhook(provider, payload, headers, query);
  }
  @Post('initiate')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Initiate a payment flow (Deposit)' })
  @ApiResponse({ status: 201, description: 'Payment initiated, returns redirect URL' })
  async initiate(@CurrentUser() user: AuthenticatedUser, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiatePayment(user.id, user.email, dto.amount, dto.provider);
  }

  @Get('methods')
  @ApiOperation({
    summary: 'List Mercado Pago Payment Methods',
    description: 'Retrieve available payment methods from Mercado Pago',
  })
  @ApiResponse({ status: 200, description: 'List of payment methods' })
  async getPaymentMethods() {
    return this.paymentsService.getMercadoPagoMethods();
  }

  @Post('process')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Process a payment directly' })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async processPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: ProcessPaymentDto) {
    // Override/Ensure email is from the authenticated user
    dto.payer = { ...dto.payer, email: user.email };
    return this.paymentsService.processPayment(dto);
  }
}
