import { AuctionStatus } from '../../domain/auction/auction-status.enum';
import { IAuctionRepository } from '../../contracts/auction-repository.interface';
import { IBidRepository } from '../../contracts/bid-repository.interface';
import { IOrderRepository } from '../../contracts/order-repository.interface';
import { IWalletRepository } from '../../contracts/wallet-repository.interface';
import { AuctionClosedEvent } from '../../events/auction-closed.event';
import { OrderCreatedEvent } from '../../events/order-created.event';

export interface CloseAuctionResult {
  success: boolean;
  winnerId: string | null;
  orderId: string | null;
  events: Array<AuctionClosedEvent | OrderCreatedEvent>;
  error?: string;
}

export class CloseAuctionUseCase {
  constructor(
    private readonly auctionRepo: IAuctionRepository,
    private readonly bidRepo: IBidRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly walletRepo: IWalletRepository,
  ) {}

  async execute(auctionId: string): Promise<CloseAuctionResult> {
    const auction = await this.auctionRepo.findById(auctionId);
    if (!auction) {
      return { success: false, winnerId: null, orderId: null, events: [], error: 'Auction not found' };
    }

    if (auction.status !== AuctionStatus.ACTIVE) {
      return { success: false, winnerId: null, orderId: null, events: [], error: 'Auction is not ACTIVE' };
    }

    const winningBid = await this.bidRepo.findHighestBid(auctionId);
    await this.auctionRepo.updateStatus(auctionId, AuctionStatus.CLOSED);

    const events: Array<AuctionClosedEvent | OrderCreatedEvent> = [];

    const closedEvent: AuctionClosedEvent = {
      eventName: 'auction.closed',
      auctionId,
      winnerId: winningBid?.bidderId ?? null,
      winningBidId: winningBid?.id ?? null,
      finalPrice: winningBid?.amount ?? null,
      occurredAt: new Date(),
    };
    events.push(closedEvent);

    if (!winningBid) {
      return { success: true, winnerId: null, orderId: null, events };
    }

    const order = await this.orderRepo.create(
      auctionId,
      winningBid.bidderId,
      auction.sellerId,
      winningBid.amount,
    );

    const orderEvent: OrderCreatedEvent = {
      eventName: 'order.created',
      auctionId,
      orderId: order.id,
      buyerId: winningBid.bidderId,
      sellerId: auction.sellerId,
      amount: winningBid.amount,
      occurredAt: new Date(),
    };
    events.push(orderEvent);

    return { success: true, winnerId: winningBid.bidderId, orderId: order.id, events };
  }
}
