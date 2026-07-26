import * as https from 'https';
import { Injectable, Logger } from '@nestjs/common';
import { buildIpnVerificationPayload, validateIpnResponse } from '@ironloot/core';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
} from '../interfaces';

/** Margen de seguridad para renovar el token antes de que expire realmente. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;

/** `rel` del enlace de aprobación, por orden de preferencia. PayPal migró de `approve`
 *  a `payer-action`; ambos siguen apareciendo según la cuenta y la versión. */
const APPROVAL_LINK_RELS = ['payer-action', 'approve'] as const;

interface PaypalLink {
  rel: string;
  href: string;
}

@Injectable()
export class PaypalProvider implements PaymentProvider {
  private readonly logger = new Logger(PaypalProvider.name);
  name = PaymentProviderEnum.PAYPAL;

  private tokenCache: { value: string; expiresAt: number } | null = null;

  private get apiBaseUrl(): string {
    return process.env.PAYPAL_MODE === 'production'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  checkStatus(): boolean {
    return !!(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_WEBHOOK_ID
    );
  }

  /**
   * Obtiene un access token OAuth2 (client_credentials), cacheado en memoria.
   * A diferencia de Mercado Pago —token estático de entorno— PayPal emite tokens
   * de vida limitada, por lo que se renuevan con `TOKEN_REFRESH_MARGIN_MS` de margen.
   */
  private async getAccessToken(forceRefresh = false): Promise<string> {
    if (
      !forceRefresh &&
      this.tokenCache &&
      this.tokenCache.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS
    ) {
      return this.tokenCache.value;
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not configured');
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(`${this.apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      throw new Error(`PayPal OAuth2 token request failed with status ${res.status}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.tokenCache.value;
  }

  /**
   * Ejecuta una petición autenticada. Ante un 401 renueva el token y reintenta
   * **una sola vez**: cubre revocaciones fuera de banda sin arriesgar un bucle.
   */
  private async authorizedFetch<T>(
    url: string,
    init: { method: string; headers?: Record<string, string>; body?: string },
  ): Promise<T> {
    const call = async (token: string) =>
      fetch(url, {
        ...init,
        headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
      });

    let res = await call(await this.getAccessToken());

    if (res.status === 401) {
      this.logger.warn('PayPal returned 401 — refreshing access token and retrying once');
      res = await call(await this.getAccessToken(true));
    }

    if (!res.ok) {
      throw new Error(`PayPal request to ${url} failed with status ${res.status}`);
    }

    return (await res.json()) as T;
  }

  private resolveApprovalUrl(links: PaypalLink[] = []): string {
    for (const rel of APPROVAL_LINK_RELS) {
      const link = links.find((l) => l.rel === rel);
      if (link?.href) return link.href;
    }
    throw new Error(
      `PayPal order response contains no approval link (expected rel: ${APPROVAL_LINK_RELS.join(' | ')})`,
    );
  }

  async createPayment(
    orderId: string,
    amount: number,
    currency: string,
    description: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    buyerEmail: string,
  ): Promise<CreatePaymentResult> {
    this.logger.log(`Creating PayPal order for ${orderId} (${amount} ${currency})`);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5175';

    const order = await this.authorizedFetch<{ id: string; status: string; links: PaypalLink[] }>(
      `${this.apiBaseUrl}/v2/checkout/orders`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Clave de idempotencia de PayPal: evita duplicar la orden si se reintenta.
          'PayPal-Request-Id': orderId,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: { currency_code: currency.toUpperCase(), value: amount.toFixed(2) },
              // Referencia DEP-<userId>-<timestamp>; reaparece en el webhook como resource.custom_id
              custom_id: orderId,
              description: description || 'Iron Loot Deposit',
            },
          ],
          payment_source: {
            paypal: {
              experience_context: {
                user_action: 'PAY_NOW',
                return_url: `${clientUrl}/wallet/deposit-success?ref=${orderId}`,
                cancel_url: `${clientUrl}/wallet/deposit-cancel?ref=${orderId}`,
              },
            },
          },
        }),
      },
    );

    return {
      externalId: order.id,
      redirectUrl: this.resolveApprovalUrl(order.links),
      metadata: { mode: 'orders-v2', orderId, paypalOrderId: order.id },
      isIntegrated: this.checkStatus(),
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
