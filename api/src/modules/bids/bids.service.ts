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

@Injectable()
export class BidsService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly ctx: RequestContextService,
  ) {
    this.log = this.logger.child('BidsService');
  }

  async placeBid(userId: string, auctionId: string, dto: CreateBidDto): Promise<Bid> {
    this.log.debug('Placing bid', { userId, auctionId, amount: dto.amount });

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch auction with optimistic locking (future) or just lock checking
      // For now, simple fetch
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
      });

      if (!auction) {
        throw new AuctionNotFoundException(auctionId);
      }

      // 2. Validate Auction Status
      const now = new Date();
      if (
        auction.status !== AuctionStatus.ACTIVE &&
        !(auction.status === AuctionStatus.PUBLISHED && auction.startsAt <= now)
      ) {
        // If it's published and time has passed, we theoretically treat it as active
        // But better to enforce strict statuses. Let's assume a background job activates them,
        // OR we allow bidding if Published + StartsAt passed.
        // For strictness: must be Active.
        // Or simplified MVP: Published AND started is OK.
        // Let's go with: Must be PUBLISHED or ACTIVE, and within time range.
        // Let's go with: Must be PUBLISHED or ACTIVE, and within time range.
        const isActive =
          ((auction.status as string) === AuctionStatus.ACTIVE ||
            auction.status === AuctionStatus.PUBLISHED) &&
          auction.startsAt <= now &&
          auction.endsAt > now;

        if (!isActive) {
          throw new AuctionNotActiveException(auctionId, auction.status);
        }
      }

      // 3. User validations
      // Prevent bidding on own auction
      if (auction.sellerId === userId) {
        throw new BidOnOwnAuctionException(auctionId);
      }

      // 4. Amount validations
      // Must be > currentPrice
      // In a real app, we'd check increment rules (e.g. +$1 minimum)
      const minimumBid = Number(auction.currentPrice) + 1.0; // Simple rule: +1
      if (dto.amount < minimumBid) {
        throw new BidTooLowException(auctionId, dto.amount, minimumBid);
      }

      // 5. Create Bid
      const bid = await tx.bid.create({
        data: {
          amount: dto.amount,
          auctionId,
          bidderId: userId,
        },
      });

      // 6. Update Auction
      // Check for extension (Soft Close)
      // If within last 5 mins (300000 ms)
      const timeRemaining = auction.endsAt.getTime() - now.getTime();
      let newEndsAt = auction.endsAt;
      const EXTENSION_MS = 5 * 60 * 1000; // 5 mins

      if (timeRemaining < EXTENSION_MS) {
        newEndsAt = new Date(auction.endsAt.getTime() + EXTENSION_MS);
        this.log.info('Auction extended', { auctionId, oldEndsAt: auction.endsAt, newEndsAt });
      }

      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentPrice: dto.amount,
          status: AuctionStatus.ACTIVE, // Ensure it's marked active if it was Published
          endsAt: newEndsAt,
        },
      });

      this.log.info('Bid placed successfully', { bidId: bid.id, newPrice: dto.amount });

      return bid;
    });
  }

  async getBidsForAuction(auctionId: string): Promise<Bid[]> {
    return this.prisma.bid.findMany({
      where: { auctionId },
      orderBy: { createdAt: 'desc' },
      include: {
        bidder: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  }
}
