import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRatingDto } from './dto';
import { StructuredLogger, ChildLogger } from '../../common/observability';
import { Rating } from '@prisma/client';

@Injectable()
export class RatingsService {
  private readonly logger: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    logger: StructuredLogger,
  ) {
    this.logger = logger.child('RatingsService');
  }

  async create(userId: string, dto: CreateRatingDto): Promise<Rating> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { shipment: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isBuyer = order.buyerId === userId;
    const isSeller = order.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('You are not a participant in this transaction');
    }

    if (!order.shipment || order.shipment.status !== 'DELIVERED') {
      throw new BadRequestException('Order must be delivered before rating');
    }

    const existingRating = await this.prisma.rating.findFirst({
      where: {
        orderId: dto.orderId,
        authorId: userId,
      },
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this order');
    }

    const targetId = isBuyer ? order.sellerId : order.buyerId;

    const rating = await this.prisma.rating.create({
      data: {
        orderId: dto.orderId,
        authorId: userId,
        targetId,
        score: dto.score,
        comment: dto.comment,
      },
    });

    this.logger.info(`Rating created for Order ${order.id}`, {
      ratingId: rating.id,
      authorId: userId,
      targetId,
      score: dto.score,
    });

    return rating;
  }

  async findAllByTarget(targetId: string): Promise<Rating[]> {
    return this.prisma.rating.findMany({
      where: { targetId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
