import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
} from '../interfaces';

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  private readonly logger = new Logger(MercadoPagoProvider.name);
  name = PaymentProviderEnum.MERCADO_PAGO;

  checkStatus(): boolean {
    return !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
  }

  async createPayment(
    orderId: string,
    amount: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currency: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    description: string,
    buyerEmail: string,
  ): Promise<CreatePaymentResult> {
    this.logger.log(`Creating MercadoPago preference for Order ${orderId}`, { amount, buyerEmail });

    // TODO: Integrate MercadoPago SDK
    const mockId = `MP-${Date.now()}-${orderId}`;

    return {
      externalId: mockId,
      redirectUrl: `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${mockId}`,
      metadata: { mode: 'sandbox_mock' },
      isIntegrated: this.checkStatus(),
    };
  }

  async verifyPayment(externalId: string): Promise<WebhookResult> {
    return {
      paymentId: 'unknown',
      externalId,
      status: 'COMPLETED',
      metadata: {},
    };
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult | null> {
    this.logger.log('Received MercadoPago webhook', payload);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any; // Cast for now as we don't have types for provider SDK
    // Mock
    if (p.type === 'payment' && p.action === 'payment.created') {
      return {
        paymentId: p.data.id,
        externalId: p.data.id,
        status: 'COMPLETED',
        metadata: p,
      };
    }
    return null;
  }
}
