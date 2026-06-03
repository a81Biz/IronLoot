export interface AuctionClosedEvent {
  eventName: 'auction.closed';
  auctionId: string;
  winnerId: string | null;
  winningBidId: string | null;
  finalPrice: number | null;
  occurredAt: Date;
}
