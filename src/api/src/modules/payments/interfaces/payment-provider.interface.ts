export enum PaymentProviderEnum {
  MERCADO_PAGO = 'MERCADO_PAGO',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  HEY_BANCO = 'HEY_BANCO',
}

export interface CreatePaymentResult {
  externalId?: string;
  redirectUrl: string;
  metadata?: Record<string, unknown>;
  isIntegrated?: boolean; // New field
}

export interface WebhookResult {
  /**
   * Identificador del pago en el proveedor. Es la **clave de deduplicación** (PT-078):
   * la reentrega de un webhook con el mismo `paymentId` no vuelve a acreditar.
   * Se prefiere al identificador de notificación porque algunas pasarelas emiten varias
   * notificaciones distintas sobre un mismo pago.
   */
  paymentId: string;
  externalId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  metadata?: Record<string, unknown>;

  /**
   * Importe normalizado por el proveedor (PT-076).
   * Campo opcional y aditivo: los proveedores que no lo informan mantienen la
   * extracción histórica desde `metadata` sin cambio de comportamiento.
   */
  amount?: number;
}

export interface PaymentProvider {
  name: PaymentProviderEnum;

  /**
   * PT-080 — Identidad para el registro. Cada adaptador se declara a si mismo, de modo que
   * anadir o quitar una pasarela no obliga a editar la logica de transaccion.
   */
  readonly key: string;
  /** Nombres alternativos con los que puede llegar en la URL del webhook (ej.: `mercadopago`). */
  readonly aliases: readonly string[];

  /**
   * Checks if the provider is fully configured (e.g. env vars present)
   */
  checkStatus(): boolean;

  /**
   * Initiates a payment session/preference
   */
  createPayment(
    orderId: string,
    amount: number,
    currency: string,
    description: string,
    buyerEmail: string,
  ): Promise<CreatePaymentResult>;

  /**
   * Verifies a payment status from external provider
   */
  verifyPayment(externalId: string): Promise<WebhookResult>;

  /**
   * Processes a webhook payload
   */
  /**
   * PT-080 — Recibe cabeceras y query porque la validacion difiere por proveedor y, dentro de
   * Mercado Pago, por formato de notificacion (Webhooks vs IPN).
   */
  handleWebhook(
    payload: unknown,
    headers?: Record<string, string>,
    query?: Record<string, string>,
  ): Promise<WebhookResult | null>;

  /**
   * PT-087 — Vía garantizada: localiza el pago cuando la notificación nunca llegó.
   *
   * Es **opcional a propósito**. Cada pasarela busca con lo que tiene, y no todas pueden:
   *  - Mercado Pago busca por *nuestra* referencia (`/v1/payments/search?external_reference=`).
   *  - PayPal no ofrece búsqueda por `custom_id`: **debe** ir por el id de orden, que
   *    conocemos desde que la creamos y viaja en `providerRef`.
   *
   * Que sea opcional deja explícito en el contrato qué proveedor tiene esta garantía y cuál
   * no, en vez de esconderlo tras un `null` del reconciliador (hallazgo F-07).
   *
   * **Devuelve `null`, nunca lanza**, cuando el pago aún no existe: el reconciliador recorre
   * todos los ciclos abiertos y un caso normal no puede tumbar el lote.
   */
  findPayment?(ctx: FindPaymentContext): Promise<WebhookResult | null>;
}

/** Lo que el reconciliador sabe de una solicitud abierta al ir a buscarla en la pasarela. */
export interface FindPaymentContext {
  /** Nuestra referencia: `DEP-<userId>-<timestamp>`. */
  reference: string;
  /** El identificador que devolvió la pasarela al crear el cobro. Nulo en ciclos previos a PT-087. */
  providerRef?: string | null;
}
