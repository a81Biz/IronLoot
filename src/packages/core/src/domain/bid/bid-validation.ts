import { AuctionStatus } from '../auction/auction-status.enum';

export interface BidValidationContext {
  auctionStatus: AuctionStatus;
  currentPrice: number;
  bidderId: string;
  sellerId: string;
  bidAmount: number;
}

export interface BidValidationResult {
  valid: boolean;
  reason?: string;
}

export class BidValidation {
  /**
   * Validates all business rules for placing a bid.
   * Rules are evaluated in priority order so that the most actionable
   * error is returned first.
   */
  static validate(ctx: BidValidationContext): BidValidationResult {
    if (ctx.auctionStatus !== AuctionStatus.ACTIVE) {
      return { valid: false, reason: 'Auction is not active' };
    }

    if (ctx.bidAmount <= 0) {
      return { valid: false, reason: 'Bid amount must be greater than zero' };
    }

    if (ctx.bidderId === ctx.sellerId) {
      return { valid: false, reason: 'Seller cannot bid on their own auction' };
    }

    if (ctx.bidAmount <= ctx.currentPrice) {
      return { valid: false, reason: 'Bid amount must be greater than the current price' };
    }

    return { valid: true };
  }
}
