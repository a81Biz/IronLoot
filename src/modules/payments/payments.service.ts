import { Injectable, BadRequestException } from '@nestjs/common';
import { PaymentStatus, PaymentProvider as PaymentProviderEnumDB } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger, ChildLogger } from '../../common/observability';
import { OrdersService } from '../orders/orders.service';
import { CreateCheckoutDto } from './dto';
import { PaymentProvider, PaymentProviderEnum, CreatePaymentResult } from './interfaces';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaypalProvider } from './providers/paypal.provider';

@Injectable()
export class PaymentsService {
  private readonly log: ChildLogger;
  private readonly providers: Map<PaymentProviderEnum, PaymentProvider> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly ordersService: OrdersService,
    private readonly mercadoPagoProvider: MercadoPagoProvider,
    private readonly paypalProvider: PaypalProvider,
  ) {
    this.log = this.logger.child('PaymentsService');
    this.registerProvider(mercadoPagoProvider);
    this.registerProvider(paypalProvider);
  }

  private registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.name, provider);
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CreatePaymentResult> {
    this.log.info('Creating checkout session', {
      userId,
      orderId: dto.orderId,
      provider: dto.provider,
    });

    // 1. Validate Order
    // using findOne ensures user owns the order
    const order = await this.ordersService.findOne(userId, dto.orderId);

    if (order.status === 'PAID') {
      throw new BadRequestException('Order is already paid');
    }

    // 2. Get Provider
    const provider = this.providers.get(dto.provider);
    if (!provider) {
      throw new BadRequestException(`Provider ${dto.provider} not supported`);
    }

    // 3. Create Payment Intent with Provider
    const result = await provider.createPayment(
      order.id,
      Number(order.totalAmount),
      'USD', // TODO: Support multi-currency
      `Payment for Order ${order.id}`,
      'user@example.com', // TODO: Get from User profile
    );

    // 4. Save Payment Record
    await this.prisma.payment.create({
      data: {
        amount: order.totalAmount,
        currency: 'USD',
        provider:
          dto.provider === PaymentProviderEnum.MERCADO_PAGO
            ? PaymentProviderEnumDB.MERCADO_PAGO
            : PaymentProviderEnumDB.PAYPAL,
        status: PaymentStatus.PENDING,
        externalId: result.externalId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (result.metadata ?? {}) as any, // Cast to any to satisfy Prisma Json compatibility
        orderId: order.id,
      },
    });

    return result;
  }

  async handleWebhook(providerName: string, payload: unknown): Promise<{ received: boolean }> {
    // Basic webhook handler logic
    // Implementation would depend on mapping providerName string to Enum
    this.log.info('Webhook received', { providerName, payload });
    // TODO: Implement full webhook processing
    return { received: true };
  }
}
