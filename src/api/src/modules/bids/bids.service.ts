import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Bid, AuctionStatus, NotificationType } from '@prisma/client';
// PT-013: Import domain validation from @ironloot/core (CORE domain logic)
import { BidValidation, AuctionStatus as CoreAuctionStatus } from '@ironloot/core';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  ChildLogger,
  AuctionNotFoundException,
  AuctionNotActiveException,
  BidTooLowException,
  BidOnOwnAuctionException,
  RequestContextService,
  AuditEventType,
  EntityType,
  AuditResult,
  ValidationException,
} from '../../common/observability';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBidDto } from './dto';
import { WalletService } from '../wallet/wallet.service';
import { AuditPersistenceService } from '../audit/audit-persistence.service';
import { AuctionsGateway } from '../auctions/auctions.gateway';

@Injectable()
export class BidsService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
    private readonly ctx: RequestContextService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly audit: AuditPersistenceService,
    private readonly auctionsGateway: AuctionsGateway,
  ) {
    this.log = this.logger.child('BidsService');
  }

  async placeBid(userId: string, auctionId: string, dto: CreateBidDto): Promise<Bid> {
    const traceId = this.ctx.getTraceId();
    this.log.debug('Placing bid', { userId, auctionId, amount: dto.amount });

    try {
      // 1. Fetch Auction and Validation Check
      const auction = await this.prisma.auction.findUnique({
        where: { id: auctionId },
        include: { bids: { orderBy: { amount: 'desc' }, take: 1 } },
      });

      if (!auction) {
        throw new AuctionNotFoundException(auctionId);
      }

      const now = new Date();
      if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.PUBLISHED) {
        throw new AuctionNotActiveException(auctionId, auction.status);
      }

      if (auction.endsAt < now) {
        throw new AuctionNotActiveException(auctionId, auction.status);
      }

      // PT-017: Enforce CORE BidValidation — replaces duplicate seller and amount checks.
      // Status check above (line 57) allows PUBLISHED in addition to ACTIVE; CORE only
      // validates ACTIVE. For PUBLISHED auctions we skip the status error from CORE and
      // only enforce the seller-restriction and amount rules.
      const coreValidation = BidValidation.validate({
        auctionStatus: auction.status as unknown as CoreAuctionStatus,
        currentPrice: Number(auction.currentPrice),
        bidderId: userId,
        sellerId: auction.sellerId,
        bidAmount: dto.amount,
      });
      if (!coreValidation.valid && coreValidation.reason !== 'Auction is not active') {
        if (coreValidation.reason?.includes('Seller cannot bid')) {
          throw new BidOnOwnAuctionException(auctionId);
        }
        throw new BidTooLowException(auctionId, dto.amount, Number(auction.currentPrice) + 1);
      }

      // Check if user is outbidding themselves (self-outbid — not covered by BidValidation)
      const previousTopBid = auction.bids[0];
      if (previousTopBid && previousTopBid.bidderId === userId) {
        throw new BidOnOwnAuctionException(auctionId);
      }

      // 2. Hold Funds (Optimistic lock approach - hold first, then try to bid)
      await this.walletService.holdFunds(
        userId,
        dto.amount,
        auctionId,
        `Bid on auction ${auction.title}`,
      );

      // Variables for WebSocket (needs to be available outside tx)
      const EXTENSION_MS = 5 * 60 * 1000;
      let timeRemaining = 0;
      let newEndsAt = auction.endsAt;

      // Calculate extension before tx/inside tx logic if needed, but for logging/events we need it out here.
      // But `auction.endsAt` is fixed snapshot. `now` is fixed.
      // So we can calculate it here safely since we hold the optimistic lock or just assume standard flow.
      timeRemaining = auction.endsAt.getTime() - now.getTime();
      if (timeRemaining < EXTENSION_MS) {
        newEndsAt = new Date(auction.endsAt.getTime() + EXTENSION_MS);
      }

      // 3. Database Transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create Bid
        const newBid = await tx.bid.create({
          data: {
            amount: dto.amount,
            auctionId,
            bidderId: userId,
          },
        });

        // Update Auction
        await tx.auction.update({
          where: { id: auctionId },
          data: {
            currentPrice: dto.amount,
            status: AuctionStatus.ACTIVE,
            endsAt: newEndsAt, // Using outer variable
          },
        });

        return newBid;
      });

      // 4. Side Effects (Post-Transaction)

      // Release Previous Bidder Funds
      if (previousTopBid) {
        try {
          // Release funds and notify
          await this.walletService.releaseFunds(
            previousTopBid.bidderId,
            Number(previousTopBid.amount),
            auctionId,
            `Outbid on auction ${auctionId}`,
          );

          this.notificationsService
            .create(
              previousTopBid.bidderId,
              NotificationType.BID_OUTBID,
              'You have been outbid!',
              `A higher bid of $${dto.amount} has been placed on "${auction.title}".`,
              { auctionId, newBidAmount: Number(dto.amount) },
            )
            .catch((e) => this.log.error('Failed to send outbid notification', e));
        } catch (e) {
          this.log.error('Failed to release funds/notify outbid user', e as Error, {
            userId: previousTopBid.bidderId,
            auctionId,
          });
        }
      }

      this.log.info(`Bid placed successfully`, { bidId: result.id });

      // 5. Emit WebSocket Events
      this.auctionsGateway.emitNewBid(auctionId, {
        id: result.id,
        amount: Number(result.amount),
        bidderName: userId, // ideally username
        createdAt: result.createdAt,
      });

      if (timeRemaining < EXTENSION_MS) {
        this.auctionsGateway.emitAuctionExtended(auctionId, newEndsAt);
      }

      // Audit
      this.audit
        .recordAudit(
          traceId,
          AuditEventType.BID_PLACED,
          EntityType.BID,
          result.id,
          AuditResult.SUCCESS,
          { actorUserId: userId, payload: { auctionId, amount: dto.amount } },
        )
        .catch((e) => this.log.error('Failed to audit bid placement', e));

      return result;
    } catch (error) {
      // Compensation: Release held funds if main logic fails
      try {
        await this.walletService.releaseFunds(
          userId,
          dto.amount,
          auctionId,
          `Rollback failed bid ${auctionId}`,
        );
      } catch (e) {
        // Ignore if funds weren't held
      }

      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ValidationException ||
        error instanceof ForbiddenException ||
        error instanceof AuctionNotFoundException ||
        error instanceof AuctionNotActiveException ||
        error instanceof BidTooLowException ||
        error instanceof BidOnOwnAuctionException
      ) {
        throw error;
      }

      this.log.error('Failed to place bid', error);
      throw error;
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

  async getUserBids(userId: string): Promise<Bid[]> {
    return this.prisma.bid.findMany({
      where: { bidderId: userId },
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
