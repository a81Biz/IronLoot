import { Injectable } from '@nestjs/common';
import { Bid, AuctionStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  ChildLogger,
  AuctionNotFoundException,
  AuctionNotActiveException,
  BidTooLowException,
  BidOnOwnAuctionException,
  RequestContextService,
} from '../../common/observability';
import { CreateBidDto } from './dto';

import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class BidsService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly ctx: RequestContextService,
    private readonly walletService: WalletService,
  ) {
    this.log = this.logger.child('BidsService');
  }

  async placeBid(userId: string, auctionId: string, dto: CreateBidDto): Promise<Bid> {
    this.log.debug('Placing bid', { userId, auctionId, amount: dto.amount });

    // 1. Funds Check & Hold (Must happen before transaction to prevent locking issues or external calls inside tx if possible)
    // However, for consistency, we might want it inside. But WalletService uses its own transactions.
    // NestJS transactions via Prisma: If we pass `tx` to WalletService methods, we can compose them.
    // But WalletService methods create their own transactions using `this.prisma.$transaction`.
    // Prisma doesn't support nested transactions easily unless we pass the tx client.
    // For now, let's do it optimistically OUTSIDE the main auction lock, OR accept that we first Hold, then Bid.
    // If Bid fails, we must Release.

    // Step 1: Hold Funds
    try {
      await this.walletService.holdFunds(
        userId,
        dto.amount,
        auctionId,
        `Bid for auction ${auctionId}`,
      );
    } catch (error) {
      this.log.warn('Failed to hold funds for bid', { userId, auctionId, error: error.message });
      throw error; // Rethrow (likely BadRequestException for insufficient funds)
    }

    try {
      return await this.prisma
        .$transaction(async (tx) => {
          // ... (Existing validations: auction, time, status, owner, min bid)
          const auction = await tx.auction.findUnique({
            where: { id: auctionId },
            include: { bids: { orderBy: { amount: 'desc' }, take: 1 } }, // Fetch highest bid
          });

          if (!auction) throw new AuctionNotFoundException(auctionId);

          // ... (validations)
          const now = new Date();
          if (auction.startsAt > now || auction.endsAt <= now) {
            throw new AuctionNotActiveException(auctionId, auction.status);
          }
          if (
            auction.status !== AuctionStatus.ACTIVE &&
            auction.status !== AuctionStatus.PUBLISHED
          ) {
            throw new AuctionNotActiveException(auctionId, auction.status);
          }
          if (auction.sellerId === userId) {
            throw new BidOnOwnAuctionException(auctionId);
          }

          const currentPrice = Number(auction.currentPrice);
          const minimumBid = currentPrice + 1.0;

          // Check against DTO
          if (dto.amount < minimumBid) {
            throw new BidTooLowException(auctionId, dto.amount, minimumBid);
          }

          // Create Bid
          const bid = await tx.bid.create({
            data: {
              amount: dto.amount,
              auctionId,
              bidderId: userId,
            },
          });

          // Update Auction
          const timeRemaining = auction.endsAt.getTime() - now.getTime();
          let newEndsAt = auction.endsAt;
          const EXTENSION_MS = 5 * 60 * 1000;
          if (timeRemaining < EXTENSION_MS) {
            newEndsAt = new Date(auction.endsAt.getTime() + EXTENSION_MS);
          }

          await tx.auction.update({
            where: { id: auctionId },
            data: {
              currentPrice: dto.amount,
              status: AuctionStatus.ACTIVE,
              endsAt: newEndsAt,
            },
          });

          return { bid, previousTopBid: auction.bids[0] };
        })
        .then(async ({ bid, previousTopBid }) => {
          // Success!
          // If there was a previous bidder, release their funds
          if (previousTopBid) {
            try {
              await this.walletService.releaseFunds(
                previousTopBid.bidderId,
                Number(previousTopBid.amount),
                auctionId,
                `Outbid on auction ${auctionId}`,
              );
            } catch (e) {
              this.log.error('Failed to release funds for outbid user', e as Error, {
                userId: previousTopBid.bidderId,
                auctionId,
              });
              // Don't fail the current bid, but this needs admin attention
            }
          }
          this.log.info('Bid placed successfully', { bidId: bid.id });
          return bid;
        });
    } catch (e) {
      // If main logic fails, Release the held funds for current user
      await this.walletService.releaseFunds(
        userId,
        dto.amount,
        auctionId,
        `Rollback failed bid ${auctionId}`,
      );
      throw e;
    }
  }

  async getBidsForAuction(auctionId: string): Promise<Bid[]> {
    return this.prisma.bid.findMany({
      where: { auctionId },
      orderBy: { createdAt: 'desc' },
      include: { bidder: { select: { id: true, username: true, avatarUrl: true } } },
    });
  }

  async getUserActiveBids(userId: string): Promise<Bid[]> {
    return this.prisma.bid.findMany({
      where: {
        bidderId: userId,
        auction: { status: AuctionStatus.ACTIVE },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        auction: {
          select: {
            id: true,
            title: true,
            slug: true,
            currentPrice: true,
            endsAt: true,
            images: true,
            status: true,
          },
        },
      },
    });
  }
}
