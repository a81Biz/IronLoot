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
          // Per-preference webhook target. Overrides the app-level dashboard URL so
          // deposits notify the configured endpoint (e.g. a tunnel in local/QA).
          ...(process.env.MERCADO_PAGO_NOTIFICATION_URL
            ? { notification_url: process.env.MERCADO_PAGO_NOTIFICATION_URL }
            : {}),
        },
      });

      // En modo sandbox (credenciales de prueba) MP exige sandbox_init_point;
      // el init_point productivo falla con "una parte es de prueba, la URL es productiva".
      const useSandbox = process.env.MERCADO_PAGO_SANDBOX === 'true';
      const redirectUrl =
        useSandbox && result.sandbox_init_point ? result.sandbox_init_point : result.init_point!;

      return {
        externalId: result.id,
        redirectUrl,
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
      const rawId = String(payload.data.id);

      // Orders API (formato ORD.../PAY...): la Payments API legacy (payment.get) no
      // resuelve estos IDs. Se consulta la Orders API. MP está migrando a Orders API,
      // por lo que ambos formatos deben soportarse.
      if (/^(ORD|PAY)/i.test(rawId)) {
        const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        const res = await fetch(`https://api.mercadopago.com/v1/orders/${rawId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const order: any = await res.json();
        const accredited = order.status === 'processed' || order.status_detail === 'accredited';
        return {
          paymentId: String(order.id),
          externalId: String(order.external_reference),
          status: accredited ? 'COMPLETED' : 'PENDING',
          // el service acredita usando metadata.transaction_amount
          metadata: { ...order, transaction_amount: Number(order.total_paid_amount) } as any,
        };
      }

      // Payments API legacy (IDs numéricos)
      const payment = new Payment(this.client);
      const paymentInfo = await payment.get({ id: rawId });
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
