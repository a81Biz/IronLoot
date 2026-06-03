import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, PaymentMethod, Payment, Preference } from 'mercadopago';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
} from '../interfaces';
import { WebhookSignatureValidator } from '@ironloot/core';

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  private readonly logger = new Logger(MercadoPagoProvider.name);
  name = PaymentProviderEnum.MERCADO_PAGO;
  private client: MercadoPagoConfig;

  constructor() {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error('MERCADO_PAGO_ACCESS_TOKEN not configured');
    this.client = new MercadoPagoConfig({ accessToken });
  }

  checkStatus(): boolean {
    return !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
  }

  async getMethods() {
    const paymentMethods = new PaymentMethod(this.client);
    try {
      const methods = await paymentMethods.get();
      return methods;
    } catch (error) {
      this.logger.error('Error fetching payment methods', error);
      throw error;
    }
  }

  async processPayment(paymentData: any): Promise<any> {
    const payment = new Payment(this.client);
    try {
      const body: any = {
        transaction_amount: paymentData.amount,
        description: paymentData.description || 'Deposit',
        payment_method_id: paymentData.payment_method_id,
        payer: {
          email: paymentData.payer.email,
          identification: paymentData.payer.identification,
        },
      };

      // Only add token/installments if present (Card Payments)
      if (paymentData.token) {
        body.token = paymentData.token;
        body.installments = paymentData.installments;
        body.issuer_id = paymentData.issuer_id;
      }

      const result = await payment.create({ body });
      return result;
    } catch (error) {
      this.logger.error('Error processing payment', error);
      throw error;
    }
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

    const preference = new Preference(this.client);
    try {
      const result = await preference.create({
        body: {
          items: [
            {
              id: orderId,
              title: description,
              unit_price: amount,
              quantity: 1,
              currency_id: currency,
            },
          ],
          payer: {
            email: buyerEmail,
          },
          external_reference: orderId,
          back_urls: {
            success: `${process.env.CLIENT_URL || 'http://localhost:5173'}/wallet/success`,
            failure: `${process.env.CLIENT_URL || 'http://localhost:5173'}/wallet/failure`,
            pending: `${process.env.CLIENT_URL || 'http://localhost:5173'}/wallet/pending`,
          },
        },
      });

      return {
        externalId: result.id,
        redirectUrl: result.init_point!,
        metadata: { mode: 'preference', orderId },
        isIntegrated: this.checkStatus(),
      };
    } catch (e) {
      this.logger.error('Error creating preference', e);
      throw e;
    }
  }

  async verifyPayment(externalId: string): Promise<WebhookResult> {
    const payment = new Payment(this.client);
    try {
      const result = await payment.get({ id: externalId });
      return {
        paymentId: String(result.id),
        externalId: String(result.external_reference),
        status: result.status === 'approved' ? 'COMPLETED' : 'PENDING',
        metadata: result as any,
      };
    } catch (e) {
      this.logger.error('Error verifying payment', e);
      throw e;
    }
  }

  async handleWebhook(
    payload: any,
    headers: any = {},
    query: any = {},
  ): Promise<WebhookResult | null> {
    this.logger.log('Received MercadoPago webhook');

    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('MERCADO_PAGO_WEBHOOK_SECRET not configured');
      throw new Error('Webhook Secret not configured');
    } else {
      // Validation Logic
      const xSignature = headers['x-signature'];
      const xRequestId = headers['x-request-id'];
      const dataID = query['data.id'];

      if (!xSignature || !xRequestId || !dataID) {
        this.logger.error('Missing signature headers or data.id — rejecting webhook');
        throw new Error('Missing required webhook signature headers');
      } else {
        const parts = xSignature.split(',');
        let ts: string | undefined;
        let hash: string | undefined;

        parts.forEach((part: string) => {
          const [key, value] = part.split('=');
          if (key && value) {
            const trimmedKey = key.trim();
            const trimmedValue = value.trim();
            if (trimmedKey === 'ts') ts = trimmedValue;
            else if (trimmedKey === 'v1') hash = trimmedValue;
          }
        });

        if (!ts || !hash) {
          this.logger.error('Missing ts or v1 in x-signature header — rejecting webhook');
          throw new Error('Missing required webhook signature components');
        }

        // PT-017: Delegate HMAC validation to CORE WebhookSignatureValidator.
        // Mercado Pago signs a manifest string (not the raw body); pass it as the payload arg.
        const manifest = `id:${dataID};request-id:${xRequestId};ts:${ts};`;

        if (!WebhookSignatureValidator.validateHmacSignature(manifest, hash, secret)) {
          this.logger.error('HMAC verification failed', { manifest });
          throw new Error('Invalid Webhook Signature');
        }

        this.logger.log('HMAC verification passed');
      }
    }

    // Process Payload
    // If validation passed or skipped
    if (payload.type === 'payment' || payload.type === 'order') {
      // Logic to fetch updated status would go here
      // For now returning basic info
      const payment = new Payment(this.client);
      const paymentInfo = await payment.get({ id: payload.data.id });

      return {
        paymentId: String(paymentInfo.id),
        externalId: String(paymentInfo.external_reference),
        status: paymentInfo.status === 'approved' ? 'COMPLETED' : 'PENDING',
        metadata: paymentInfo as any,
      };
    }

    return null;
  }
}
