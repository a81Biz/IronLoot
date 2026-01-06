import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  StructuredLogger,
  ChildLogger,
  ValidationException,
  AuctionNotFoundException,
  ForbiddenException,
  OrderNotFoundException,
} from '../../common/observability';
import { CreateOrderDto } from './dto';
import { Order, OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  private readonly log: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: StructuredLogger,
  ) {
    this.log = this.logger.child('OrdersService');
  }

  async createFromAuction(userId: string, dto: CreateOrderDto): Promise<Order> {
    this.log.info('Creating order from auction', { userId, auctionId: dto.auctionId });

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch Auction and Highest Bid
      // We need to fetch the highest bid to confirm winner and amount
      const auction = await tx.auction.findUnique({
        where: { id: dto.auctionId },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            take: 1,
          },
          order: true, // Check if order exists
        },
      });

      if (!auction) {
        throw new AuctionNotFoundException(dto.auctionId);
      }

      // 2. Validate Order Existence (Idempotency)
      if (auction.order) {
        if (auction.order.buyerId !== userId) {
          throw new ForbiddenException('Order already exists for another user');
        }
        this.log.info('Order already exists, returning it', { orderId: auction.order.id });
        return auction.order;
      }

      // 3. Validate Winner
      const winningBid = auction.bids[0];
      if (!winningBid) {
        throw new ValidationException('Auction has no bids, cannot create order');
      }

      if (winningBid.bidderId !== userId) {
        throw new ForbiddenException('You are not the winner of this auction');
      }

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          auctionId: dto.auctionId,
          buyerId: userId,
          sellerId: auction.sellerId,
          totalAmount: winningBid.amount,
          status: OrderStatus.PENDING_PAYMENT,
        },
      });

      this.log.info('Order created successfully', { orderId: order.id });
      return order;
    });
  }

  async findAllForUser(userId: string): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { buyerId: userId },
      include: { auction: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        auction: true,
        seller: { select: { displayName: true, email: true } },
      },
    });

    if (!order) {
      throw new OrderNotFoundException(orderId);
    }

    if (order.buyerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }
}
