export interface BidPlacedEvent {
  eventName: 'bid.placed';
  auctionId: string;
  bidId: string;
  bidderId: string;
  amount: number;
  occurredAt: Date;
}
