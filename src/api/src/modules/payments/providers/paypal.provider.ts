import { Injectable, Logger } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentProviderEnum,
  CreatePaymentResult,
  WebhookResult,
  FindPaymentContext,
} from '../interfaces';
import { UnauthorizedException } from '../../../common/observability';
import { PaymentTraceService } from '../payment-trace.service';
import { depositReturnUrl } from '../return-urls';

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
  readonly key = 'PAYPAL';
  readonly aliases = [] as const;

  private tokenCache: { value: string; expiresAt: number } | null = null;

  /**
   * PT-087 — La traza se inyecta **opcional**, igual que en Mercado Pago: los tests que
   * construyen el adaptador a mano siguen funcionando, y un apunte de trazabilidad nunca
   * puede costarle el depósito al usuario.
   */
  constructor(private readonly trace?: PaymentTraceService) {}

  /** Registra un paso de la traza sin que un fallo suyo pueda tumbar el pago. */
  private async traza(entry: Record<string, unknown>): Promise<void> {
    try {
      await this.trace?.record({ provider: 'PAYPAL', ...entry } as never);
    } catch (error) {
      this.logger.warn(`No se pudo registrar la traza de PayPal: ${(error as Error).message}`);
    }
  }

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
    return (await this.authorizedCall<T>(url, init)).data;
  }

  /**
   * PT-087 — Igual que `authorizedFetch`, pero devuelve además el estado HTTP y la duración,
   * que es lo que la traza necesita para sostener una disputa con la pasarela.
   */
  private async authorizedCall<T>(
    url: string,
    init: { method: string; headers?: Record<string, string>; body?: string },
  ): Promise<{ data: T; status: number; durationMs: number }> {
    const call = async (token: string) =>
      fetch(url, {
        ...init,
        headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
      });

    const startedAt = Date.now();
    let res = await call(await this.getAccessToken());

    if (res.status === 401) {
      this.logger.warn('PayPal returned 401 — refreshing access token and retrying once');
      res = await call(await this.getAccessToken(true));
    }

    if (!res.ok) {
      throw new Error(`PayPal request to ${url} failed with status ${res.status}`);
    }

    return {
      data: (await res.json()) as T,
      status: res.status,
      durationMs: Date.now() - startedAt,
    };
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

    const endpoint = `${this.apiBaseUrl}/v2/checkout/orders`;
    const peticion = {
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
            // PT-088 — Una sola fuente para las URLs de retorno. Antes apuntaban a
            // `/wallet/deposit-success`, una ruta que no existia: el pago acababa en 404.
            return_url: depositReturnUrl(orderId, 'success'),
            cancel_url: depositReturnUrl(orderId, 'cancel'),
          },
        },
      },
    };

    const {
      data: order,
      status,
      durationMs,
    } = await this.authorizedCall<{
      id: string;
      status: string;
      links: PaypalLink[];
    }>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Clave de idempotencia de PayPal: evita duplicar la orden si se reintenta.
        'PayPal-Request-Id': orderId,
      },
      body: JSON.stringify(peticion),
    });

    // PT-087 (F-06) — Qué se envió a PayPal y qué devolvió. El `Authorization` no se pasa
    // aquí a propósito: no aporta nada a la traza y no tiene por qué acercarse a ella.
    await this.traza({
      reference: orderId,
      step: 'PROVIDER_CREATE',
      direction: 'OUTBOUND',
      outcome: 'OK',
      endpoint,
      httpStatus: status,
      durationMs,
      externalId: order.id,
      data: { request: peticion, response: order },
    });

    return {
      externalId: order.id,
      redirectUrl: this.resolveApprovalUrl(order.links),
      metadata: { mode: 'orders-v2', orderId, paypalOrderId: order.id },
      isIntegrated: this.checkStatus(),
    };
  }

  /**
   * PT-092 — Cobro de verificación de una cuenta de PayPal.
   *
   * Cobra un importe pequeño **con el código visible para el titular** y devuelve el enlace donde
   * tiene que aprobarlo. El cargo prueba las tres cosas de una vez: que la cuenta existe, que
   * opera, y que **es suya** — porque aprobarlo exige iniciar sesión en PayPal.
   *
   * El código va en `description` y en `custom_id`: lo primero lo ve el titular en el resumen del
   * cobro y en su historial; lo segundo nos permite reconocerlo al volver.
   */
  async createVerificationCharge(
    reference: string,
    amount: number,
    codigo: string,
  ): Promise<{ orderId: string; approvalUrl: string }> {
    const clientUrl = process.env.CLIENT_URL || 'http://client.ironloot.local';
    const endpoint = `${this.apiBaseUrl}/v2/checkout/orders`;

    const peticion = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: { currency_code: 'MXN', value: amount.toFixed(2) },
          custom_id: reference,
          // Lo que el titular lee. Sin el codigo aqui, no tendria nada que declarar.
          description: `IronLoot verificacion - codigo ${codigo}`,
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            user_action: 'PAY_NOW',
            return_url: `${clientUrl}/wallet/payment-methods?verificado=1`,
            cancel_url: `${clientUrl}/wallet/payment-methods?cancelado=1`,
          },
        },
      },
    };

    const {
      data: order,
      status,
      durationMs,
    } = await this.authorizedCall<{ id: string; status: string; links: PaypalLink[] }>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'PayPal-Request-Id': reference },
      body: JSON.stringify(peticion),
    });

    // El codigo NO entra en la traza: es el secreto que prueba la titularidad.
    await this.traza({
      reference,
      step: 'PROVIDER_CREATE',
      direction: 'OUTBOUND',
      outcome: 'OK',
      endpoint,
      httpStatus: status,
      durationMs,
      externalId: order.id,
      detail: 'Cobro de verificacion de cuenta',
      data: { amount, currency: 'MXN', orderId: order.id },
    });

    return { orderId: order.id, approvalUrl: this.resolveApprovalUrl(order.links) };
  }

  /**
   * PT-092 — Devuelve el importe de una verificación.
   *
   * **No lanza.** Un fallo devolviendo no puede tumbar la verificación ni hacer que el vendedor
   * pierda el importe: se informa para que quede marcado como pendiente y se reintente. Misma
   * disciplina que el ciclo de pago de PT-080.
   */
  async refundCapture(
    captureId: string,
    amount: number,
    nota: string,
  ): Promise<{ refunded: boolean; refundId?: string; error?: string }> {
    const endpoint = `${this.apiBaseUrl}/v2/payments/captures/${captureId}/refund`;

    try {
      const {
        data: devolucion,
        status,
        durationMs,
      } = await this.authorizedCall<{ id: string; status: string }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: { value: amount.toFixed(2), currency_code: 'MXN' },
          note_to_payer: nota,
        }),
      });

      await this.traza({
        step: 'REFUND_RAISED',
        direction: 'OUTBOUND',
        outcome: 'OK',
        endpoint,
        httpStatus: status,
        durationMs,
        externalId: devolucion.id,
        detail: 'Importe de verificacion devuelto',
        data: { captureId, amount },
      });

      return { refunded: true, refundId: devolucion.id };
    } catch (error) {
      this.logger.error(`No se pudo devolver la captura ${captureId}: ${(error as Error).message}`);
      await this.traza({
        step: 'REFUND_RAISED',
        direction: 'OUTBOUND',
        outcome: 'ERROR',
        endpoint,
        externalId: captureId,
        detail: (error as Error).message,
        data: { captureId, amount },
      });
      return { refunded: false, error: (error as Error).message };
    }
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

    // PT-089 — Mercado Pago registraba la llegada de la notificacion y PayPal no: si algun dia
    // una alcanza la API, la traza tiene que decir que llego, con que cabeceras y que cuerpo.
    // Se registra ANTES de validar la firma, porque una notificacion rechazada tambien ocurrio.
    await this.traza({
      step: 'NOTIFICATION_RECEIVED',
      direction: 'INBOUND',
      outcome: 'OK',
      externalId: event?.resource?.id,
      detail: event?.event_type,
      data: { headers, body: event },
    });

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
      await this.traza({
        step: 'SIGNATURE_REJECTED',
        direction: 'INTERNAL',
        outcome: 'REJECTED',
        externalId: event?.resource?.id,
        detail: `Faltan cabeceras de firma: ${missing.join(', ')}`,
        data: { eventId: event?.id, eventType: event?.event_type },
      });
      // PT-087 (F-08): un rechazo de seguridad es 401, no una avería interna.
      throw new UnauthorizedException(
        `Missing required PayPal webhook header(s): ${missing.join(', ')}`,
      );
    }

    const endpoint = `${this.apiBaseUrl}/v1/notifications/verify-webhook-signature`;
    const {
      data: result,
      status,
      durationMs,
    } = await this.authorizedCall<{
      verification_status: string;
    }>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...required, webhook_id: webhookId, webhook_event: event }),
    });

    if (result.verification_status !== 'SUCCESS') {
      this.logger.error(`PayPal webhook signature verification failed (${event.id})`);
      await this.traza({
        step: 'SIGNATURE_REJECTED',
        direction: 'INTERNAL',
        outcome: 'REJECTED',
        endpoint,
        httpStatus: status,
        durationMs,
        externalId: event?.resource?.id,
        detail: `PayPal respondió verification_status=${result.verification_status}`,
        data: { eventId: event?.id, eventType: event?.event_type, response: result },
      });
      // PT-087 (F-08) — Igual que Mercado Pago desde PT-080. Antes lanzaba `Error` genérico y
      // el controlador lo traducía a 500: un rechazo de firma se presentaba como avería
      // nuestra, contaminaba la tasa de error y le decía a PayPal «reintenta».
      throw new UnauthorizedException('Invalid PayPal webhook signature');
    }

    await this.traza({
      step: 'SIGNATURE_OK',
      direction: 'INTERNAL',
      outcome: 'OK',
      endpoint,
      httpStatus: status,
      durationMs,
      externalId: event?.resource?.id,
      data: { eventId: event?.id, eventType: event?.event_type },
    });
  }

  /**
   * PT-087 (F-07) — Vía garantizada de PayPal.
   *
   * PayPal **no ofrece búsqueda por `custom_id`**, así que a diferencia de Mercado Pago no
   * puede localizar el pago por nuestra referencia: va por el id de orden que guardamos al
   * crearla (`providerRef`).
   *
   * Y hay una diferencia de fondo con Mercado Pago: en Orders v2 el dinero **no se mueve al
   * aprobar**. Una orden `APPROVED` está autorizada pero sin cobrar; si nadie la captura, no
   * hay pago. Por eso aquí se captura, no solo se consulta. Es lo que convierte el hallazgo
   * del 2026-07-27 —321.50 MXN aprobados y en el limbo— en dinero acreditado.
   */
  async findPayment(ctx: FindPaymentContext): Promise<WebhookResult | null> {
    // Los ciclos abiertos antes de PT-087 no tienen id de orden guardado: sin él no hay por
    // dónde buscar. No es un error, es un ciclo viejo; expirará a las 72 h como haría antes.
    if (!ctx.providerRef) return null;

    const endpoint = `${this.apiBaseUrl}/v2/checkout/orders/${ctx.providerRef}`;

    try {
      const {
        data: order,
        status,
        durationMs,
      } = await this.authorizedCall<PaypalOrder>(endpoint, {
        method: 'GET',
      });

      await this.traza({
        reference: ctx.reference,
        step: 'PROVIDER_CONFIRM',
        direction: 'OUTBOUND',
        outcome: 'OK',
        format: 'POLL',
        endpoint,
        httpStatus: status,
        durationMs,
        externalId: ctx.providerRef,
        detail: `Orden en estado ${order.status}`,
        data: { response: order },
      });

      // El comprador aprobó pero nadie capturó: el webhook que debía hacerlo no llegó.
      const finalizada =
        order.status === 'APPROVED' ? await this.captureAndReturn(ctx, order) : order;

      if (finalizada.status !== 'COMPLETED') return null;

      const capture = finalizada.purchase_units?.[0]?.payments?.captures?.[0];

      return {
        paymentId: capture?.id ?? finalizada.id,
        externalId: finalizada.purchase_units?.[0]?.custom_id ?? ctx.reference,
        status: 'COMPLETED',
        amount: capture?.amount ? Number(capture.amount.value) : undefined,
        metadata: finalizada as unknown as Record<string, unknown>,
      };
    } catch (error) {
      // Un fallo consultando un ciclo no puede impedir que se revisen los demás. El
      // reconciliador reprogramará esta solicitud y volverá a intentarlo.
      this.logger.warn(
        `No se pudo consultar la orden ${ctx.providerRef} en PayPal: ${(error as Error).message}`,
      );
      await this.traza({
        reference: ctx.reference,
        step: 'PROVIDER_CONFIRM',
        direction: 'OUTBOUND',
        outcome: 'ERROR',
        format: 'POLL',
        endpoint,
        externalId: ctx.providerRef,
        detail: (error as Error).message,
      });
      return null;
    }
  }

  /** Captura una orden aprobada durante el sondeo y devuelve la orden ya cobrada. */
  private async captureAndReturn(
    ctx: FindPaymentContext,
    order: PaypalOrder,
  ): Promise<PaypalOrder> {
    const endpoint = `${this.apiBaseUrl}/v2/checkout/orders/${ctx.providerRef}/capture`;
    const {
      data: capturada,
      status,
      durationMs,
    } = await this.authorizedCall<PaypalOrder>(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    await this.traza({
      reference: ctx.reference,
      step: 'PROVIDER_CONFIRM',
      direction: 'OUTBOUND',
      outcome: 'OK',
      format: 'POLL',
      endpoint,
      httpStatus: status,
      durationMs,
      externalId: ctx.providerRef,
      detail: 'Orden aprobada sin capturar: se captura por la via garantizada',
      data: { previo: order.status, response: capturada },
    });

    return capturada;
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
