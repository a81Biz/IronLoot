export enum PaymentProviderEnum {
  MERCADO_PAGO = 'MERCADO_PAGO',
  PAYPAL = 'PAYPAL',
}

export interface CreatePaymentResult {
  externalId?: string;
  redirectUrl: string;
  metadata?: Record<string, unknown>;
  isIntegrated?: boolean; // New field
}

export interface WebhookResult {
  paymentId: string; // Internal Order ID or Payment ID usually sent in metadata
  externalId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  metadata?: Record<string, unknown>;
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
