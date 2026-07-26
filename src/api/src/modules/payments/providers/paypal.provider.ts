import { Injectable, Logger } from '@nestjs/common';
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

interface PaypalAmount {
  currency_code: string;
  value: string;
}

interface PaypalOrder {
  id: string;
  status: string;
  links?: PaypalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    payments?: { captures?: Array<{ id: string; amount?: PaypalAmount }> };
  }>;
}

interface PaypalWebhookEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    status?: string;
    custom_id?: string;
    amount?: PaypalAmount;
  };
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
    const order = await this.authorizedFetch<PaypalOrder>(
      `${this.apiBaseUrl}/v2/checkout/orders/${externalId}`,
      { method: 'GET' },
    );

    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];

    return {
      paymentId: capture?.id ?? order.id,
      externalId: order.purchase_units?.[0]?.custom_id ?? externalId,
      status: order.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      amount: capture?.amount ? Number(capture.amount.value) : undefined,
      metadata: order as unknown as Record<string, unknown>,
    };
  }

  /**
   * Procesa un webhook de PayPal.
   *
   * El flujo Orders v2 es en dos tiempos, y ambos llegan como webhook:
   *  1. `CHECKOUT.ORDER.APPROVED`  → el comprador aprobó; se ejecuta la captura aquí
   *     y se devuelve `null` porque todavía no hay nada que acreditar.
   *  2. `PAYMENT.CAPTURE.COMPLETED` → el dinero está capturado; se devuelve el
   *     resultado con importe y referencia para que el servicio acredite el wallet.
   *
   * Mantener la captura aquí evita añadir un método a la interfaz compartida
   * `PaymentProvider`, que obligaría a tocar los otros tres proveedores (design.md AD-01).
   */
  async handleWebhook(
    payload: unknown,
    headers: Record<string, string> = {},
  ): Promise<WebhookResult | null> {
    const event = payload as PaypalWebhookEvent;
    this.logger.log(`Received PayPal webhook ${event?.event_type} (${event?.id})`);

    await this.verifyWebhookSignature(event, headers);

    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        await this.captureOrder(event.resource.id);
        // La acreditación llega con PAYMENT.CAPTURE.COMPLETED.
        return null;

      case 'PAYMENT.CAPTURE.COMPLETED': {
        const { resource } = event;
        return {
          paymentId: resource.id,
          externalId: resource.custom_id ?? '',
          status: 'COMPLETED',
          amount: resource.amount ? Number(resource.amount.value) : undefined,
          metadata: resource as unknown as Record<string, unknown>,
        };
      }

      default:
        this.logger.log(`Ignoring unsubscribed PayPal event ${event.event_type}`);
        return null;
    }
  }

  /**
   * Verifica la autenticidad del webhook contra PayPal.
   * La ruta del webhook es pública por diseño (las pasarelas no envían JWT), así que
   * esta firma es el único control de acceso: cualquier fallo aborta el procesamiento.
   */
  private async verifyWebhookSignature(
    event: PaypalWebhookEvent,
    headers: Record<string, string>,
  ): Promise<void> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
      throw new Error('PAYPAL_WEBHOOK_ID not configured — cannot verify PayPal webhook');
    }

    const required = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      this.logger.error(`Rejecting PayPal webhook — missing header(s): ${missing.join(', ')}`);
      throw new Error(`Missing required PayPal webhook header(s): ${missing.join(', ')}`);
    }

    const result = await this.authorizedFetch<{ verification_status: string }>(
      `${this.apiBaseUrl}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...required, webhook_id: webhookId, webhook_event: event }),
      },
    );

    if (result.verification_status !== 'SUCCESS') {
      this.logger.error(`PayPal webhook signature verification failed (${event.id})`);
      throw new Error('Invalid PayPal webhook signature');
    }
  }

  /**
   * Captura una orden aprobada. Si falla, el error se propaga a propósito: el
   * controlador responderá con un no-2xx y PayPal reintentará la entrega.
   */
  private async captureOrder(paypalOrderId: string): Promise<void> {
    this.logger.log(`Capturing PayPal order ${paypalOrderId}`);

    await this.authorizedFetch(`${this.apiBaseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
