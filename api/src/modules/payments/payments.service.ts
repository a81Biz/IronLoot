import { Injectable, BadRequestException } from '@nestjs/common';

export interface PaymentVerification {
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  provider: string;
}

@Injectable()
export class PaymentsService {
  /**
   * Mocks payment verification.
   * In a real app, this would call Stripe/PayPal API.
   *
   * Mock Logic:
   * - If referenceId starts with 'PAY-', it's valid.
   * - Amount is extracted from reference if possible (e.g. PAY-100-USD), else default 100.
   * - If referenceId starts with 'FAIL-', it returns FAILED.
   */
  async verifyPayment(referenceId: string): Promise<PaymentVerification> {
    // Simulate API delay
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
      // Try to parse amount from ID for testing flexibility: PAY-500 -> 500.00
      const parts = referenceId.split('-');
      let amount = 100; // Default
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

    // Default to invalid for unknown formats in production,
    // but for this dev stage we might want to be strict or lenient.
    // Audit requires verification, so let's reject unknown IDs.
    throw new BadRequestException('Invalid payment reference format');
  }

  async createCheckoutSession(_userId: string, _dto: any): Promise<any> {
    // Mock implementation for checkout
    return {
      paymentUrl: 'https://mock-payment-provider.com/pay',
      paymentId: 'mock-payment-id',
    };
  }

  async handleWebhook(_provider: string, _payload: any): Promise<{ received: boolean }> {
    // Mock implementation for webhook
    return { received: true };
  }
}
