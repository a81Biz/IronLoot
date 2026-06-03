export interface OrderCreatedEvent {
  eventName: 'order.created';
  auctionId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  occurredAt: Date;
}
