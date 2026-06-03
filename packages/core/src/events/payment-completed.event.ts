export interface PaymentCompletedEvent {
  eventName: 'payment.completed';
  orderId: string;
  paymentId: string;
  amount: number;
  provider: string;
  occurredAt: Date;
}
