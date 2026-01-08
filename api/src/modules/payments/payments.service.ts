import { Injectable, BadRequestException } from '@nestjs/common';
import { StripeProvider } from './providers/stripe.provider';

export interface PaymentVerification {
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  provider: string;
}

@Injectable()
export class PaymentsService {
  constructor(private readonly stripeProvider: StripeProvider) {}

  /**
   * Payment verification
   */
  async verifyPayment(referenceId: string): Promise<PaymentVerification> {
    // Stripe Logic
    if (referenceId.startsWith('cs_')) {
      const result = await this.stripeProvider.verifyPayment(referenceId);

      // Amount in cents from Stripe metadata or session
      const amount = result.metadata?.amountTotal ? Number(result.metadata.amountTotal) / 100 : 0;
      const currency = String(result.metadata?.currency || 'USD').toUpperCase();

      return {
        status:
          result.status === 'COMPLETED' || result.status === 'REFUNDED'
            ? (result.status as any)
            : 'FAILED', // simplified mapping
        amount,
        currency,
        provider: 'STRIPE',
      };
    }

    // Mock Logic (simulated delay)
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (referenceId.startsWith('FAIL-')) {
      return {
        status: 'FAILED',
        amount: 0,
        currency: 'USD',
        provider: 'MOCK',
      };
    }

    if (referenceId.startsWith('PAY-')) {
      const parts = referenceId.split('-');
      let amount = 100;
      if (parts[1] && !isNaN(parseFloat(parts[1]))) {
        amount = parseFloat(parts[1]);
      }

      return {
        status: 'COMPLETED',
        amount,
        currency: 'USD',
        provider: 'MOCK',
      };
    }

    throw new BadRequestException('Invalid payment reference format');
  }

  async createCheckoutSession(
    userId: string,
    dto: { amount: number; description?: string },
  ): Promise<any> {
    if (this.stripeProvider.checkStatus()) {
      return this.stripeProvider.createPayment(
        `DEP-${userId}-${Date.now()}`,
        dto.amount,
        'usd',
        dto.description || 'Wallet Deposit',
        'user@example.com', // TODO: Pass user email
      );
    }

    // Mock implementation
    return {
      paymentUrl: 'https://mock-payment-provider.com/pay',
      paymentId: 'mock-payment-id',
    };
  }

  async handleWebhook(provider: string, payload: any): Promise<{ received: boolean }> {
    if (provider === 'STRIPE') {
      await this.stripeProvider.handleWebhook(payload);
      return { received: true };
    }
    return { received: true };
  }
}
