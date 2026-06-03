export interface RefundProcessedEvent {
  eventName: 'refund.processed';
  orderId: string;
  refundAmount: number;
  buyerId: string;
  occurredAt: Date;
}
