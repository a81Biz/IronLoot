import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, PaymentMethod, Payment, Preference } from 'mercadopago';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
  FindPaymentContext,
} from '../interfaces';
import { WebhookSignatureValidator } from '@ironloot/core';
import { UnauthorizedException, ValidationException } from '../../../common/observability';
import { PaymentTraceService } from '../payment-trace.service';

const MP_API = 'https://api.mercadopago.com';

/** Formato de notificacion. Mercado Pago usa dos sobre la misma URL. */
type NotificationFormat = 'WEBHOOK' | 'IPN';

interface NotificationEnvelope {
  format: NotificationFormat;
  /** topic / tipo de recurso: payment | order | merchant_order | ... */
  resourceType: string;
  resourceId: string;
}

interface MpPayment {
  id: number | string;
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
}

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  private readonly logger = new Logger(MercadoPagoProvider.name);
  name = PaymentProviderEnum.MERCADO_PAGO;
  readonly key = 'MERCADO_PAGO';
  readonly aliases = ['mercadopago'] as const;
  private client: MercadoPagoConfig;

  /**
   * PT-086 — La traza es **opcional** a proposito: el adaptador debe poder instanciarse sin
   * ella (sus tests hacen `new MercadoPagoProvider()`), y un fallo de trazabilidad nunca puede
   * impedir cobrar.
   */
  constructor(private readonly trace?: PaymentTraceService) {
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

      // PT-086 — Que enviamos a la pasarela y que nos devolvio al crear el cobro.
      await this.trace?.record({
        reference: orderId,
        provider: 'MERCADO_PAGO',
        step: 'PROVIDER_CREATE',
        direction: 'OUTBOUND',
        outcome: 'OK',
        format: 'HTTP',
        endpoint: 'mercadopago.preferences.create',
        externalId: String(result.id ?? ''),
        data: {
          request: { amount, currency, description, buyerEmail, external_reference: orderId },
          response: { id: result.id, init_point: redirectUrl },
        },
      });

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

  /**
   * Procesa una notificacion de Mercado Pago.
   *
   * MP usa DOS formatos sobre la misma URL, y el discriminador es el **topic**, no la forma
   * del identificador:
   *   - Webhooks: query `data.id`; firma `x-signature` validable con el secret.
   *   - IPN:      query `topic` + `id`; MP documenta que su firma **no** es validable.
   *
   * Por eso la validacion difiere por formato. En IPN la confirmacion contra la API es
   * obligatoria y su respuesta es la unica fuente de verdad: el payload solo aporta un
   * identificador, nunca importes ni estados (RULE-04 se cumple igualmente).
   *
   * El enrutado anterior usaba /^(ORD|PAY)/i —la forma del id— y mandaba identificadores
   * `PAY...` a `/v1/orders/{id}`, que responde 400 (verificado contra la API real).
   */
  async handleWebhook(
    payload: any,
    headers: any = {},
    query: any = {},
  ): Promise<WebhookResult | null> {
    const envelope = this.normalizeNotification(payload, query);

    if (!envelope) {
      this.logger.error('Unrecognized MercadoPago notification — rejecting');
      throw new UnauthorizedException('Unrecognized MercadoPago notification');
    }

    this.logger.log(
      `MercadoPago notification: format=${envelope.format} topic=${envelope.resourceType} id=${envelope.resourceId}`,
    );

    // PT-086 — Toda notificacion queda registrada tal y como llego, cabeceras incluidas
    // (redactadas donde corresponde por el servicio de traza).
    await this.trace?.record({
      reference: '',
      provider: 'MERCADO_PAGO',
      step: 'NOTIFICATION_RECEIVED',
      direction: 'INBOUND',
      outcome: 'OK',
      format: envelope.format,
      externalId: envelope.resourceId,
      detail: `topic=${envelope.resourceType}`,
      data: { headers, query, body: payload },
    });

    if (envelope.format === 'WEBHOOK') {
      try {
        this.assertWebhookSignature(headers, envelope.resourceId);
      } catch (e) {
        await this.trace?.record({
          reference: '',
          provider: 'MERCADO_PAGO',
          step: 'SIGNATURE_REJECTED',
          direction: 'INTERNAL',
          outcome: 'ERROR',
          externalId: envelope.resourceId,
          detail: (e as Error).message,
        });
        throw e;
      }

      await this.trace?.record({
        reference: '',
        provider: 'MERCADO_PAGO',
        step: 'SIGNATURE_OK',
        direction: 'INTERNAL',
        outcome: 'OK',
        externalId: envelope.resourceId,
      });
    }

    const payment = await this.resolveCanonicalPayment(envelope);
    if (!payment) return null;

    // PT-086 — Ya se sabe a que deposito pertenecen las entradas previas: se enlazan.
    await this.trace?.attachReference(
      envelope.resourceId,
      String(payment.external_reference ?? ''),
    );
    await this.trace?.attachReference(String(payment.id), String(payment.external_reference ?? ''));

    return {
      paymentId: String(payment.id),
      externalId: String(payment.external_reference ?? ''),
      status: payment.status === 'approved' ? 'COMPLETED' : 'PENDING',
      amount: payment.transaction_amount != null ? Number(payment.transaction_amount) : undefined,
      metadata: payment as unknown as Record<string, unknown>,
    };
  }

  /** Reduce la notificacion a {formato, tipo de recurso, id}, sea cual sea el formato. */
  private normalizeNotification(payload: any, query: any): NotificationEnvelope | null {
    const dataId = query?.['data.id'];
    if (dataId) {
      const type = payload?.type ?? String(payload?.action ?? '').split('.')[0];
      return {
        format: 'WEBHOOK',
        resourceType: String(type || 'payment'),
        resourceId: String(dataId),
      };
    }

    if (query?.topic && query?.id) {
      return { format: 'IPN', resourceType: String(query.topic), resourceId: String(query.id) };
    }

    return null;
  }

  /** Solo aplica al formato Webhooks. Un fallo aqui es 401, no un error interno. */
  private assertWebhookSignature(headers: any, resourceId: string): void {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('MERCADO_PAGO_WEBHOOK_SECRET not configured');
    }

    const xSignature = headers['x-signature'];
    const xRequestId = headers['x-request-id'];

    if (!xSignature || !xRequestId) {
      this.logger.error('Missing MercadoPago signature headers — rejecting');
      throw new UnauthorizedException('Missing MercadoPago webhook signature headers');
    }

    let ts: string | undefined;
    let hash: string | undefined;
    String(xSignature)
      .split(',')
      .forEach((part: string) => {
        const [key, value] = part.split('=');
        if (!key || !value) return;
        if (key.trim() === 'ts') ts = value.trim();
        else if (key.trim() === 'v1') hash = value.trim();
      });

    if (!ts || !hash) {
      this.logger.error('Malformed x-signature header — rejecting');
      throw new UnauthorizedException('Malformed MercadoPago signature header');
    }

    // MP firma un manifiesto, no el cuerpo. La validacion HMAC vive en CORE (PT-017).
    const manifest = `id:${resourceId};request-id:${xRequestId};ts:${ts};`;
    if (!WebhookSignatureValidator.validateHmacSignature(manifest, hash, secret)) {
      this.logger.error('MercadoPago HMAC verification failed — rejecting');
      throw new UnauthorizedException('Invalid MercadoPago webhook signature');
    }
  }

  /**
   * Via garantizada (PT-080): busca el pago de una solicitud sin depender de la notificacion.
   * Devuelve null si la pasarela aun no tiene un pago aprobado para esa referencia.
   */
  /**
   * PT-087 — Vía garantizada, ahora bajo la firma del contrato compartido.
   *
   * Mercado Pago es de las pasarelas que **sí** permiten buscar por nuestra propia referencia,
   * de modo que `providerRef` no le hace falta y lo ignora. PayPal está en el caso contrario.
   */
  async findPayment(ctx: FindPaymentContext): Promise<WebhookResult | null> {
    const reference = ctx.reference;
    const payment = await this.findApprovedByReference(reference);
    if (!payment) return null;

    return {
      paymentId: String(payment.id),
      externalId: String(payment.external_reference ?? reference),
      status: 'COMPLETED',
      amount: payment.transaction_amount != null ? Number(payment.transaction_amount) : undefined,
      metadata: payment as unknown as Record<string, unknown>,
    };
  }

  /** GET autenticado contra la API de MP. Devuelve null si el recurso no resuelve. */
  private async mpGet<T>(path: string, reference = ''): Promise<T | null> {
    const started = Date.now();
    const res = await fetch(`${MP_API}${path}`, {
      headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
    });

    const body = res.ok ? ((await res.json()) as T) : null;

    // PT-086 — Queda constancia de que consultamos y de que nos respondio la pasarela.
    await this.trace?.record({
      reference,
      provider: 'MERCADO_PAGO',
      step: 'PROVIDER_CONFIRM',
      direction: 'OUTBOUND',
      outcome: res.ok ? 'OK' : 'ERROR',
      format: 'HTTP',
      endpoint: `${MP_API}${path}`,
      externalId: path.split('/').pop()?.split('?')[0] ?? '',
      httpStatus: res.status,
      durationMs: Date.now() - started,
      data: { response: body },
    });

    if (!res.ok) {
      this.logger.error(`MercadoPago API ${path} responded ${res.status}`);
      return null;
    }
    return body;
  }

  /**
   * Resuelve el pago canonico —el id numerico, unico resoluble en /v1/payments/{id}—
   * cualquiera que sea el recurso notificado. Es la clave de deduplicacion.
   */
  private async resolveCanonicalPayment(env: NotificationEnvelope): Promise<MpPayment | null> {
    switch (env.resourceType) {
      case 'payment':
        return this.mpGet<MpPayment>(`/v1/payments/${env.resourceId}`);

      case 'order': {
        const order = await this.mpGet<{ external_reference?: string }>(
          `/v1/orders/${env.resourceId}`,
        );
        return order?.external_reference
          ? this.findApprovedByReference(order.external_reference)
          : null;
      }

      case 'merchant_order': {
        const mo = await this.mpGet<{ external_reference?: string }>(
          `/merchant_orders/${env.resourceId}`,
        );
        return mo?.external_reference ? this.findApprovedByReference(mo.external_reference) : null;
      }

      default:
        this.logger.log(`Ignoring unsubscribed MercadoPago topic "${env.resourceType}"`);
        return null;
    }
  }

  /**
   * Una referencia se genera nueva en cada solicitud, de modo que **un solo pago aprobado**
   * por referencia es lo esperado. Varios es una anomalia: implica que la pasarela cobro mas
   * de una vez sobre una sola solicitud y probablemente haya que devolver dinero.
   */
  private async findApprovedByReference(reference: string): Promise<MpPayment | null> {
    const search = await this.mpGet<{ results?: MpPayment[] }>(
      `/v1/payments/search?external_reference=${encodeURIComponent(reference)}&sort=date_created&criteria=desc`,
    );

    const approved = (search?.results ?? []).filter((p) => p.status === 'approved');

    if (approved.length > 1) {
      this.logger.error(`Anomalia: ${approved.length} pagos aprobados para ${reference}`);
      throw new ValidationException(
        `Anomalia: varios pagos aprobados bajo la referencia ${reference}`,
        { reference, paymentIds: approved.map((p) => String(p.id)) },
      );
    }

    return approved[0] ?? null;
  }
}
