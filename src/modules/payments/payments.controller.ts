import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '../../modules/auth/decorators';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto';
import { CreatePaymentResult } from './interfaces';

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
  async createCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutDto,
  ): Promise<CreatePaymentResult> {
    return this.paymentsService.createCheckoutSession(user.id, dto);
  }

  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Webhook endpoint', description: 'Receive payment updates' })
  async webhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    return this.paymentsService.handleWebhook(provider, payload);
  }
}
