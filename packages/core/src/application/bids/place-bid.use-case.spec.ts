import { PlaceBidUseCase, PlaceBidDto } from './place-bid.use-case';
import { IAuctionRepository, AuctionSummary } from '../../contracts/auction-repository.interface';
import { IBidRepository, BidSummary } from '../../contracts/bid-repository.interface';
import { IWalletRepository, WalletSummary } from '../../contracts/wallet-repository.interface';
import { AuctionStatus } from '../../domain/auction/auction-status.enum';

// ---------------------------------------------------------------------------
// In-memory stubs
// ---------------------------------------------------------------------------

function makeAuctionRepo(auction: AuctionSummary | null): IAuctionRepository {
  return {
    findById: jest.fn().mockResolvedValue(auction),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    updateCurrentPrice: jest.fn().mockResolvedValue(undefined),
  };
}

function makeBidRepo(created: BidSummary): IBidRepository {
  return {
    findHighestBid: jest.fn().mockResolvedValue(null),
    createBid: jest.fn().mockResolvedValue(created),
  };
}

function makeWalletRepo(wallet: WalletSummary | null): IWalletRepository {
  return {
    findByUserId: jest.fn().mockResolvedValue(wallet),
    lockFunds: jest.fn().mockResolvedValue(undefined),
    releaseFunds: jest.fn().mockResolvedValue(undefined),
    creditBalance: jest.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const activeAuction: AuctionSummary = {
  id: 'auction-1',
  currentPrice: 100,
  sellerId: 'seller-1',
  status: AuctionStatus.ACTIVE,
  endsAt: new Date(Date.now() + 3600_000),
  softCloseWindowSec: 120,
};

const richWallet: WalletSummary = {
  id: 'wallet-1',
  userId: 'buyer-1',
  balance: 1000,
  heldFunds: 0,
};

const createdBid: BidSummary = {
  id: 'bid-1',
  auctionId: 'auction-1',
  bidderId: 'buyer-1',
  amount: 150,
  createdAt: new Date(),
};

const validDto: PlaceBidDto = {
  auctionId: 'auction-1',
  bidderId: 'buyer-1',
  amount: 150,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlaceBidUseCase', () => {
  it('happy path — should place bid, lock funds, and emit event', async () => {
    const auctionRepo = makeAuctionRepo(activeAuction);
    const bidRepo = makeBidRepo(createdBid);
    const walletRepo = makeWalletRepo(richWallet);
    const useCase = new PlaceBidUseCase(auctionRepo, bidRepo, walletRepo);

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(true);
    expect(result.bidId).toBe('bid-1');
    expect(result.event?.eventName).toBe('bid.placed');
    expect(result.event?.amount).toBe(150);
    expect(walletRepo.lockFunds).toHaveBeenCalledWith('buyer-1', 150, 'auction-1');
    expect(auctionRepo.updateCurrentPrice).toHaveBeenCalledWith('auction-1', 150);
  });

  it('should return error when auction is not found', async () => {
    const useCase = new PlaceBidUseCase(
      makeAuctionRepo(null),
      makeBidRepo(createdBid),
      makeWalletRepo(richWallet),
    );

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Auction not found');
  });

  it('should return error when auction is not ACTIVE', async () => {
    const closedAuction: AuctionSummary = { ...activeAuction, status: AuctionStatus.CLOSED };
    const useCase = new PlaceBidUseCase(
      makeAuctionRepo(closedAuction),
      makeBidRepo(createdBid),
      makeWalletRepo(richWallet),
    );

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Auction is not active');
  });

  it('should return error when seller tries to bid on their own auction', async () => {
    const useCase = new PlaceBidUseCase(
      makeAuctionRepo(activeAuction),
      makeBidRepo(createdBid),
      makeWalletRepo({ ...richWallet, userId: 'seller-1' }),
    );

    const result = await useCase.execute({ ...validDto, bidderId: 'seller-1' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Seller cannot bid on their own auction');
  });

  it('should return error when bidder has insufficient funds', async () => {
    const poorWallet: WalletSummary = { ...richWallet, balance: 100, heldFunds: 0 };
    const useCase = new PlaceBidUseCase(
      makeAuctionRepo(activeAuction),
      makeBidRepo(createdBid),
      makeWalletRepo(poorWallet),
    );

    // bid amount (150) > available balance (100)
    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Insufficient funds');
  });

  it('should return error when wallet is not found', async () => {
    const useCase = new PlaceBidUseCase(
      makeAuctionRepo(activeAuction),
      makeBidRepo(createdBid),
      makeWalletRepo(null),
    );

    const result = await useCase.execute(validDto);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Wallet not found');
  });
});
