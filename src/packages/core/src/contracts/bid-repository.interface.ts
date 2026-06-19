export interface BidSummary {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  createdAt: Date;
}

export interface IBidRepository {
  findHighestBid(auctionId: string): Promise<BidSummary | null>;
  createBid(auctionId: string, bidderId: string, amount: number): Promise<BidSummary>;
}
