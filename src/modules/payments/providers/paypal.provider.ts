import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
} from '../interfaces';

@Injectable()
export class PaypalProvider implements PaymentProvider {
  private readonly logger = new Logger(PaypalProvider.name);
  name = PaymentProviderEnum.PAYPAL;

  checkStatus(): boolean {
    return !!process.env.PAYPAL_CLIENT_ID;
  }

  async createPayment(
    orderId: string,
    amount: number,
    currency: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    description: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    buyerEmail: string,
  ): Promise<CreatePaymentResult> {
    this.logger.log(`Creating PayPal payment for Order ${orderId} (${amount} ${currency})`);

    // TODO: Integrate real PayPal Sandbox API
    // For now, return a dummy approval URL to test the flow
    const mockPaymentId = `PAY-${Date.now()}-${orderId}`;

    return {
      externalId: mockPaymentId,
      redirectUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${mockPaymentId}`,
      metadata: { mode: 'sandbox_mock', orderId },
      isIntegrated: this.checkStatus(),
    };
  }

  async verifyPayment(externalId: string): Promise<WebhookResult> {
    this.logger.log(`Verifying PayPal payment ${externalId}`);
    return {
      paymentId: 'unknown',
      externalId,
      status: 'COMPLETED',
      metadata: {},
    };
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult | null> {
    this.logger.log('Received PayPal webhook', payload);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any; // Cast for now
    // basic mock parsing
    if (p.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      return {
        paymentId: p.resource.custom_id, // assuming we pass orderId as custom_id
        externalId: p.resource.id,
        status: 'COMPLETED',
        metadata: p,
      };
    }
    return null;
  }
}
