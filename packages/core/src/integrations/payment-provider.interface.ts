export interface PaymentLink {
  url: string;
  externalId: string;
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export interface IPaymentProvider {
  initiatePayment(orderId: string, amount: number, currency: string): Promise<PaymentLink>;
  validateWebhook(payload: string, headers: Record<string, string>): boolean;
  getTransactionStatus(externalId: string): Promise<PaymentStatus>;
}
