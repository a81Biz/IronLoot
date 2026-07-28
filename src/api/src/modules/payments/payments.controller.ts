import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Get,
  Headers,
  Query,
  BadRequestException,
} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, AuthenticatedUser, Public } from '../auth/decorators';
import { PaymentsService } from './payments.service';
import { PaymentCycleService } from './payment-cycle.service';
import { ProcessPaymentDto } from './dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { Log } from '../../common/observability/decorators';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentCycle: PaymentCycleService,
  ) {}

  /**
   * PT-133 — `POST /payments/checkout` RETIRADO.
   *
   * Mismo caso que `/wallet/deposit`: ningun cliente lo invocaba. Los pedidos se pagan con el
   * saldo del monedero, que ya esta retenido desde la puja; crear una sesion de pasarela para un
   * pedido era un camino que el producto dejo de recorrer.
   *
   * El flujo vigente esta abajo: `initiate` (deposito), `webhook/:provider` y `process`.
   */

  @Post('webhook/:provider')
  @Public() // Los webhooks de pasarela no envían JWT; deben saltar el guard global (firma HMAC valida)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
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

  /**
   * PT-088 — Estado de un deposito, para la pagina a la que la pasarela devuelve al usuario.
   *
   * La pasarela vuelve con un `status` en la URL que **escribe el navegador**: es un dato del
   * que se desconfia. Este endpoint es la fuente de verdad, y solo responde al dueno.
   */
  @Get('status/:reference')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Estado de un deposito propio' })
  @ApiResponse({ status: 200, description: 'Estado del ciclo de pago' })
  @ApiResponse({ status: 404, description: 'No existe o no es del usuario' })
  async depositStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
  ) {
    return this.paymentCycle.statusFor(reference, user.id);
  }

  @Get('providers')
  @ApiOperation({
    summary: 'List available payment providers',
    description: 'Returns only providers that are configured and active',
  })
  @ApiResponse({ status: 200, description: 'Array of enabled provider keys' })
  getAvailableProviders(): { providers: string[] } {
    return { providers: this.paymentsService.getAvailableProviders() };
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
    if (!user?.email) {
      throw new BadRequestException('User email not found in token');
    }

    dto.payer = { ...dto.payer, email: user.email };

    return this.paymentsService.processPayment(dto);
  }
}
