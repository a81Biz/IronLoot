import { AuctionStatus } from '../domain/auction/auction-status.enum';

export interface AuctionSummary {
  id: string;
  currentPrice: number;
  sellerId: string;
  status: AuctionStatus;
  endsAt: Date;
  softCloseWindowSec: number;
}

export interface IAuctionRepository {
  findById(id: string): Promise<AuctionSummary | null>;
  updateStatus(id: string, status: AuctionStatus): Promise<void>;
  updateCurrentPrice(id: string, price: number, endsAt?: Date): Promise<void>;
}
