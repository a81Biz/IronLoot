import { BidValidation } from '../../domain/bid/bid-validation';
import { WalletCalculation } from '../../domain/wallet/wallet-calculation';
import { IAuctionRepository } from '../../contracts/auction-repository.interface';
import { IBidRepository } from '../../contracts/bid-repository.interface';
import { IWalletRepository } from '../../contracts/wallet-repository.interface';
import { BidPlacedEvent } from '../../events/bid-placed.event';

export interface PlaceBidDto {
  auctionId: string;
  bidderId: string;
  amount: number;
}

export interface PlaceBidResult {
  success: boolean;
  bidId?: string;
  event?: BidPlacedEvent;
  error?: string;
}

export class PlaceBidUseCase {
  constructor(
    private readonly auctionRepo: IAuctionRepository,
    private readonly bidRepo: IBidRepository,
    private readonly walletRepo: IWalletRepository,
  ) {}

  async execute(dto: PlaceBidDto): Promise<PlaceBidResult> {
    const auction = await this.auctionRepo.findById(dto.auctionId);
    if (!auction) return { success: false, error: 'Auction not found' };

    const validation = BidValidation.validate({
      auctionStatus: auction.status,
      currentPrice: auction.currentPrice,
      bidderId: dto.bidderId,
      sellerId: auction.sellerId,
      bidAmount: dto.amount,
    });

    if (!validation.valid) return { success: false, error: validation.reason };

    const wallet = await this.walletRepo.findByUserId(dto.bidderId);
    if (!wallet) return { success: false, error: 'Wallet not found' };

    if (!WalletCalculation.canLockFunds(wallet.balance, wallet.heldFunds, dto.amount)) {
      return { success: false, error: 'Insufficient funds' };
    }

    await this.walletRepo.lockFunds(dto.bidderId, dto.amount, dto.auctionId);
    const bid = await this.bidRepo.createBid(dto.auctionId, dto.bidderId, dto.amount);
    await this.auctionRepo.updateCurrentPrice(dto.auctionId, dto.amount);

    const event: BidPlacedEvent = {
      eventName: 'bid.placed',
      auctionId: dto.auctionId,
      bidId: bid.id,
      bidderId: dto.bidderId,
      amount: dto.amount,
      occurredAt: new Date(),
    };

    return { success: true, bidId: bid.id, event };
  }
}
