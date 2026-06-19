import { BidValidation, BidValidationContext } from './bid-validation';
import { AuctionStatus } from '../auction/auction-status.enum';

const baseCtx: BidValidationContext = {
  auctionStatus: AuctionStatus.ACTIVE,
  currentPrice: 100,
  bidderId: 'buyer-1',
  sellerId: 'seller-1',
  bidAmount: 150,
};

describe('BidValidation', () => {
  it('should return valid for a correct bid', () => {
    const result = BidValidation.validate(baseCtx);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  describe('Rule 1 — auction must be ACTIVE', () => {
    const inactiveStatuses = [
      AuctionStatus.DRAFT,
      AuctionStatus.PUBLISHED,
      AuctionStatus.CLOSED,
      AuctionStatus.CANCELLED,
      AuctionStatus.SUSPENDED,
      AuctionStatus.PENDING_MODERATION,
    ];

    it.each(inactiveStatuses)('should reject bid when auction status is %s', (status) => {
      const result = BidValidation.validate({ ...baseCtx, auctionStatus: status });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Auction is not active');
    });
  });

  describe('Rule 2 — bid amount must be > currentPrice', () => {
    it('should reject bid equal to current price', () => {
      const result = BidValidation.validate({ ...baseCtx, bidAmount: 100 });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Bid amount must be greater than the current price');
    });

    it('should reject bid below current price', () => {
      const result = BidValidation.validate({ ...baseCtx, bidAmount: 50 });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Bid amount must be greater than the current price');
    });
  });

  describe('Rule 3 — bidder must not be the seller', () => {
    it('should reject bid when bidder is the seller', () => {
      const result = BidValidation.validate({ ...baseCtx, bidderId: 'seller-1' });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Seller cannot bid on their own auction');
    });
  });

  describe('Rule 4 — bid amount must be > 0', () => {
    it('should reject zero bid amount', () => {
      const result = BidValidation.validate({ ...baseCtx, bidAmount: 0 });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Bid amount must be greater than zero');
    });

    it('should reject negative bid amount', () => {
      const result = BidValidation.validate({ ...baseCtx, bidAmount: -10 });
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Bid amount must be greater than zero');
    });
  });
});
