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
  handleWebhook(payload: unknown): Promise<WebhookResult | null>;
}
