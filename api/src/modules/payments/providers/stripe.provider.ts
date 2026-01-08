import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  name = PaymentProviderEnum.STRIPE;
  private stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (apiKey) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2024-06-20' as any,
      });
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not found. Stripe provider disabled.');
    }
  }

  checkStatus(): boolean {
    return !!this.stripe;
  }

  async createPayment(
    orderId: string,
    amount: number,
    currency: string,
    description: string,
    buyerEmail: string,
  ): Promise<CreatePaymentResult> {
    if (!this.stripe) throw new Error('Stripe not configured');

    const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100), // Cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout/cancel`,
      client_reference_id: orderId,
      customer_email: buyerEmail,
    });

    return {
      externalId: session.id,
      redirectUrl: session.url!,
      metadata: { sessionId: session.id },
      isIntegrated: true,
    };
  }

  async verifyPayment(externalId: string): Promise<WebhookResult> {
    if (!this.stripe) throw new Error('Stripe not configured');

    // For Checkout Session, externalId is the session ID
    try {
      const session = await this.stripe.checkout.sessions.retrieve(externalId);

      let status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' = 'PENDING';
      if (session.payment_status === 'paid') status = 'COMPLETED';
      if (session.status === 'expired') status = 'FAILED';

      // Amount is in cents, convert back to main unit if needed?
      // The WebhookResult doesn't specify amount, but verifyPayment implementation in service used to return { amount... }
      // Wait, PaymentVerification interface in service has amount/currency. WebhookResult has status/ids.
      // I should align them or map them.

      return {
        paymentId: session.client_reference_id!, // This was the orderId/reference passed in create
        externalId: session.id,
        status,
        metadata: {
          paymentIntent: session.payment_intent,
          amountTotal: session.amount_total,
          currency: session.currency,
        },
      };
    } catch (error) {
      this.logger.error(`Error verifying payment ${externalId}`, error);
      throw error;
    }
  }

  async handleWebhook(payload: any): Promise<WebhookResult | null> {
    const event = payload as Stripe.Event;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        paymentId: session.client_reference_id!,
        externalId: session.id,
        status: 'COMPLETED',
        metadata: { paymentIntent: session.payment_intent },
      };
    }

    return null;
  }
}
