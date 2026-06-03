import { CloseAuctionUseCase } from './close-auction.use-case';
import { IAuctionRepository, AuctionSummary } from '../../contracts/auction-repository.interface';
import { IBidRepository, BidSummary } from '../../contracts/bid-repository.interface';
import { IOrderRepository, OrderSummary } from '../../contracts/order-repository.interface';
import { IWalletRepository } from '../../contracts/wallet-repository.interface';
import { AuctionStatus } from '../../domain/auction/auction-status.enum';
import { OrderStatus } from '../../domain/order/order-status.enum';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

function makeAuctionRepo(auction: AuctionSummary | null): IAuctionRepository {
  return {
    findById: jest.fn().mockResolvedValue(auction),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    updateCurrentPrice: jest.fn().mockResolvedValue(undefined),
  };
}

function makeBidRepo(highest: BidSummary | null): IBidRepository {
  return {
    findHighestBid: jest.fn().mockResolvedValue(highest),
    createBid: jest.fn(),
  };
}

function makeOrderRepo(created: OrderSummary): IOrderRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByAuctionId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(created),
    updateStatus: jest.fn().mockResolvedValue(undefined),
  };
}

function makeWalletRepo(): IWalletRepository {
  return {
    findByUserId: jest.fn(),
    lockFunds: jest.fn(),
    releaseFunds: jest.fn(),
    creditBalance: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const activeAuction: AuctionSummary = {
  id: 'auction-1',
  currentPrice: 500,
  sellerId: 'seller-1',
  status: AuctionStatus.ACTIVE,
  endsAt: new Date(),
  softCloseWindowSec: 120,
};

const winningBid: BidSummary = {
  id: 'bid-99',
  auctionId: 'auction-1',
  bidderId: 'buyer-1',
  amount: 500,
  createdAt: new Date(),
};

const createdOrder: OrderSummary = {
  id: 'order-1',
  auctionId: 'auction-1',
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  totalAmount: 500,
  status: OrderStatus.PENDING_PAYMENT,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CloseAuctionUseCase', () => {
  it('happy path — should close auction with a winner and create order', async () => {
    const auctionRepo = makeAuctionRepo(activeAuction);
    const bidRepo = makeBidRepo(winningBid);
    const orderRepo = makeOrderRepo(createdOrder);
    const useCase = new CloseAuctionUseCase(auctionRepo, bidRepo, orderRepo, makeWalletRepo());

    const result = await useCase.execute('auction-1');

    expect(result.success).toBe(true);
    expect(result.winnerId).toBe('buyer-1');
    expect(result.orderId).toBe('order-1');
    expect(result.events).toHaveLength(2);
    expect(result.events[0].eventName).toBe('auction.closed');
    expect(result.events[1].eventName).toBe('order.created');
    expect(auctionRepo.updateStatus).toHaveBeenCalledWith('auction-1', AuctionStatus.CLOSED);
    expect(orderRepo.create).toHaveBeenCalledWith('auction-1', 'buyer-1', 'seller-1', 500);
  });

  it('should close auction with no winner when there are no bids', async () => {
    const auctionRepo = makeAuctionRepo(activeAuction);
    const bidRepo = makeBidRepo(null);
    const orderRepo = makeOrderRepo(createdOrder);
    const useCase = new CloseAuctionUseCase(auctionRepo, bidRepo, orderRepo, makeWalletRepo());

    const result = await useCase.execute('auction-1');

    expect(result.success).toBe(true);
    expect(result.winnerId).toBeNull();
    expect(result.orderId).toBeNull();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].eventName).toBe('auction.closed');
    expect((result.events[0] as any).winnerId).toBeNull();
    expect(orderRepo.create).not.toHaveBeenCalled();
  });

  it('should return error when auction is not found', async () => {
    const useCase = new CloseAuctionUseCase(
      makeAuctionRepo(null),
      makeBidRepo(null),
      makeOrderRepo(createdOrder),
      makeWalletRepo(),
    );

    const result = await useCase.execute('auction-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Auction not found');
    expect(result.events).toHaveLength(0);
  });

  it('should return error when auction is not ACTIVE', async () => {
    const publishedAuction: AuctionSummary = { ...activeAuction, status: AuctionStatus.PUBLISHED };
    const useCase = new CloseAuctionUseCase(
      makeAuctionRepo(publishedAuction),
      makeBidRepo(null),
      makeOrderRepo(createdOrder),
      makeWalletRepo(),
    );

    const result = await useCase.execute('auction-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Auction is not ACTIVE');
  });
});
