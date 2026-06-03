import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
} from '../interfaces';

/**
 * Hey Banco Payment Provider
 * Mexican digital bank (Banregio group) payment gateway.
 * API: https://developers.hey.inc
 *
 * Supports: card payments, SPEI transfers.
 * Uses OAuth2 client_credentials for authentication.
 */
@Injectable()
export class HeyBancoProvider implements PaymentProvider {
  private readonly logger = new Logger(HeyBancoProvider.name);
  name = PaymentProviderEnum.HEY_BANCO;

  private readonly apiUrl = process.env.HEY_BANCO_API_URL || 'https://api.hey.inc/v1';
  private readonly clientId = process.env.HEY_BANCO_CLIENT_ID;
  private readonly clientSecret = process.env.HEY_BANCO_CLIENT_SECRET;
  private readonly webhookSecret = process.env.HEY_BANCO_WEBHOOK_SECRET;

  checkStatus(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('HEY_BANCO_CLIENT_ID and HEY_BANCO_CLIENT_SECRET are required');
    }

    const response = await fetch(`${this.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'payments:write payments:read',
      }),
    });

    if (!response.ok) {
      throw new Error(`HeyBanco auth failed: ${response.status}`);
    }

    const data = (await response.json()) as any;
    return data.access_token;
  }

  async createPayment(
    orderId: string,
    amount: number,
    currency: string,
    description: string,
    buyerEmail: string,
  ): Promise<CreatePaymentResult> {
    if (!this.checkStatus()) throw new Error('HeyBanco not configured');

    this.logger.log(`Creating HeyBanco payment for ${orderId} (${amount} ${currency})`);

    const token = await this.getAccessToken();
    const webBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${this.apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reference: orderId,
        amount: { value: amount, currency },
        description,
        payer: { email: buyerEmail },
        redirect_url: `${webBaseUrl}/wallet/deposit-success?ref=${orderId}`,
        cancel_url: `${webBaseUrl}/wallet/deposit-cancel?ref=${orderId}`,
        webhook_url: `${apiBaseUrl}/api/v1/payments/webhook/HEY_BANCO`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error('HeyBanco createPayment error', err);
      throw new Error(`HeyBanco payment creation failed: ${err}`);
    }

    const result = (await response.json()) as any;

    return {
      externalId: result.id,
      redirectUrl: result.checkout_url,
      metadata: { mode: 'redirect', reference: orderId },
      isIntegrated: true,
    };
  }

  async verifyPayment(externalId: string): Promise<WebhookResult> {
    if (!this.checkStatus()) throw new Error('HeyBanco not configured');

    const token = await this.getAccessToken();

    const response = await fetch(`${this.apiUrl}/payments/${externalId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error(`HeyBanco verify failed: ${response.status}`);

    const result = (await response.json()) as any;

    return {
      paymentId: result.reference,
      externalId: result.id,
      status: result.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      metadata: result,
    };
  }

  async handleWebhook(
    payload: unknown,
    headers: Record<string, string> = {},
  ): Promise<WebhookResult | null> {
    const p = payload as any;
    this.logger.log('Received HeyBanco webhook', { type: p.event });

    // Signature validation
    if (this.webhookSecret) {
      const signature = headers['x-hey-signature'];
      if (!signature) {
        this.logger.error('Missing x-hey-signature header — rejecting webhook');
        throw new Error('Missing webhook signature');
      }

      const expected = createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(p))
        .digest('hex');

      if (signature !== `sha256=${expected}`) {
        this.logger.error('HeyBanco HMAC verification failed');
        throw new Error('Invalid webhook signature');
      }
    }

    if (p.event === 'payment.completed' && p.data) {
      return {
        paymentId: p.data.reference,
        externalId: p.data.id,
        status: 'COMPLETED',
        metadata: p.data,
      };
    }

    return null;
  }
}
