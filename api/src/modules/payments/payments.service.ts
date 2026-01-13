import { Injectable, BadRequestException } from '@nestjs/common';
import { StripeProvider } from './providers/stripe.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { PaymentProviderEnum } from './interfaces';
import { WalletService } from '../wallet/wallet.service';

import { Logger } from '@nestjs/common';
export interface PaymentVerification {
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  amount: number;
  currency: string;
  provider: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripeProvider: StripeProvider,
    private readonly mercadopagoProvider: MercadoPagoProvider,
    private readonly paypalProvider: PaypalProvider,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Initiate a payment flow (Deposit)
   */
  async initiatePayment(
    userId: string,
    email: string,
    amount: number,
    providerStr: string,
    description = 'Wallet Deposit',
  ) {
    const provider = providerStr as PaymentProviderEnum;
    const orderId = `DEP-${userId}-${Date.now()}`;
    const currency = 'MXN';

    switch (provider) {
      case PaymentProviderEnum.MERCADO_PAGO:
        return this.mercadopagoProvider.createPayment(
          orderId,
          amount,
          currency,
          description,
          email,
        );

      case PaymentProviderEnum.PAYPAL:
        return this.paypalProvider.createPayment(orderId, amount, currency, description, email);

      case PaymentProviderEnum.STRIPE:
        if (this.stripeProvider.checkStatus()) {
          return this.stripeProvider.createPayment(orderId, amount, 'usd', description, email);
        }
        break;
    }

    throw new BadRequestException('Unsupported or invalid payment provider');
  }

  /**
   * Payment verification
   */
  async verifyPayment(referenceId: string): Promise<PaymentVerification> {
    // 1. Determine Provider based on Reference ID prefix
    let result;
    let providerName = 'UNKNOWN';

    // MercadoPago (MP-...)
    if (referenceId.startsWith('MP-')) {
      result = await this.mercadopagoProvider.verifyPayment(referenceId);
      providerName = 'MERCADO_PAGO';
    }
    // PayPal (PAY-...)
    else if (referenceId.startsWith('PAY-')) {
      result = await this.paypalProvider.verifyPayment(referenceId);
      providerName = 'PAYPAL';
    }
    // Stripe (cs_...)
    else if (referenceId.startsWith('cs_')) {
      result = await this.stripeProvider.verifyPayment(referenceId);
      providerName = 'STRIPE';
    }

    if (result) {
      // Map Result to Verification
      const amount = result.metadata?.amountTotal
        ? Number(result.metadata.amountTotal) / 100
        : Number(result.metadata?.amount) || 0;

      return {
        status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        amount,
        currency: String(result.metadata?.currency || 'MXN').toUpperCase(),
        provider: providerName,
      };
    }

    throw new BadRequestException('Invalid or unsupported payment reference');
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    dto: { amount: number; description?: string },
  ): Promise<any> {
    if (this.stripeProvider.checkStatus()) {
      return this.stripeProvider.createPayment(
        `DEP-${userId}-${Date.now()}`,
        dto.amount,
        'usd',
        dto.description || 'Wallet Deposit',
        email,
      );
    }

    throw new BadRequestException('Provider not available');
  }

  async handleWebhook(
    provider: string,
    payload: any,
    headers: any = {},
    query: any = {},
  ): Promise<{ received: boolean }> {
    let result;
    if (provider === 'STRIPE') {
      result = await this.stripeProvider.handleWebhook(payload);
    } else if (provider === 'MERCADO_PAGO') {
      result = await this.mercadopagoProvider.handleWebhook(payload, headers, query);
    } else if (provider === 'PAYPAL') {
      result = await this.paypalProvider.handleWebhook(payload);
    }

    if (result && result.status === 'COMPLETED') {
      // Extract UserId from Reference (DEP-UserId-Timestamp)
      const parts = result.externalId.split('-');
      // Check if format is DEP-USERID-TIMESTAMP
      if (parts.length >= 3 && parts[0] === 'DEP') {
        const userId = parts[1];
        // Credit Wallet
        // We need amount.
        // We can assume result.metadata has amount or we rely on what we can verify.
        // Result doesn't strictly have amount in interface yet, but verifyPayment does.
        // Let's rely on verifying the payment again to be safe and getting definitive details?
        // Or trust the webhook result if we enhance the interface.
        // For now, let's try to verify using the externalId to get definitive amount
        try {
          const verification = await this.verifyPayment(result.externalId);
          if (verification.status === 'COMPLETED') {
            this.logger.log(`Crediting wallet for user ${userId} amount ${verification.amount}`);
            await this.walletService.deposit(
              userId,
              verification.amount,
              result.externalId,
              'DEPOSIT',
            );
          }
        } catch (e) {
          this.logger.error(`Failed to credit wallet for ${result.externalId}`, e);
        }
      }
    }

    return { received: true };
  }

  async getMercadoPagoMethods() {
    return this.mercadopagoProvider.getMethods();
  }

  async processPayment(paymentData: any) {
    if (paymentData.provider === PaymentProviderEnum.MERCADO_PAGO) {
      return this.mercadopagoProvider.processPayment(paymentData);
    }
    throw new BadRequestException('Unsupported provider for direct processing');
  }
}
