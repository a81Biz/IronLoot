import * as https from 'https';
import { Injectable, Logger } from '@nestjs/common';
import { buildIpnVerificationPayload, validateIpnResponse } from '@ironloot/core';
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
    description: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    buyerEmail: string,
  ): Promise<CreatePaymentResult> {
    this.logger.log(`Creating PayPal payment for Order ${orderId} (${amount} ${currency})`);

    const businessEmail = process.env.PAYPAL_BUSINESS_EMAIL;
    const mode = process.env.PAYPAL_MODE || 'sandbox';
    const baseUrl =
      mode === 'production' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';

    if (!businessEmail) {
      throw new Error('PAYPAL_BUSINESS_EMAIL not configured');
    }

    const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const webBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    // Construct WPS Parameters
    // Ref: https://www.paypalobjects.com/digitalassets/c/website/marketing/latam/mx/merchant-integration/shared/pdf/Guia-de-WPS.pdf
    const params = new URLSearchParams();
    params.append('cmd', '_xclick');
    params.append('business', businessEmail);
    params.append('item_name', description || 'Iron Loot Deposit');
    params.append('amount', amount.toFixed(2));
    params.append('currency_code', currency.toUpperCase());
    params.append('invoice', orderId); // Use orderId as invoice to track it
    params.append('charset', 'utf-8');
    params.append('no_shipping', '1'); // No shipping needed
    params.append('return', `${webBaseUrl}/wallet/deposit-success?ref=${orderId}`);
    params.append('cancel_return', `${webBaseUrl}/wallet/deposit-cancel?ref=${orderId}`);
    params.append('notify_url', `${apiBaseUrl}/payments/webhook/PAYPAL`);

    const redirectUrl = `${baseUrl}/cgi-bin/webscr?${params.toString()}`;

    return {
      externalId: orderId,
      redirectUrl: redirectUrl,
      metadata: { mode: 'wps', orderId },
      isIntegrated: !!businessEmail,
    };
  }

  async verifyPayment(externalId: string): Promise<WebhookResult> {
    this.logger.log(`Verifying PayPal payment ${externalId}`);
    throw new Error('PayPal WPS verification requires IPN');
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult | null> {
    this.logger.log('Received PayPal IPN webhook');

    const p = payload as Record<string, any>;

    // Reconstruct URL-encoded body from parsed payload for IPN verification.
    const rawBody = new URLSearchParams(
      Object.entries(p).map(([k, v]) => [k, String(v)] as [string, string]),
    ).toString();

    const mode = process.env.PAYPAL_MODE || 'sandbox';
    const ipnHost = mode === 'production' ? 'ipnpb.paypal.com' : 'ipnpb.sandbox.paypal.com';

    // Use CORE to build the verification payload; provider executes the HTTP POST.
    const verificationPayload = buildIpnVerificationPayload(rawBody);
    const ipnResponse = await this.postToPayPal(ipnHost, verificationPayload);

    if (!validateIpnResponse(ipnResponse)) {
      this.logger.error('PayPal IPN verification failed — rejecting webhook');
      throw new Error('Invalid PayPal IPN signature');
    }

    this.logger.log('PayPal IPN verification passed');

    if (p.payment_status === 'Completed') {
      return {
        paymentId: p.txn_id,
        externalId: p.invoice,
        status: 'COMPLETED',
        metadata: p,
      };
    }

    return null;
  }

  // Makes an HTTPS POST to PayPal IPN verification endpoint.
  // I/O stays in the provider; CORE only defines the payload structure and response validation.
  private postToPayPal(host: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: host,
        port: 443,
        path: '/cgi-bin/webscr',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'IronLoot-IPN-Verifier/1.0',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy(new Error('PayPal IPN verification request timed out'));
      });

      req.write(body);
      req.end();
    });
  }
}
