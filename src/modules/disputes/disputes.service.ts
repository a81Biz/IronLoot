import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDisputeDto } from './dto';
import { StructuredLogger, ChildLogger } from '../../common/observability';
import { Dispute } from '@prisma/client';

@Injectable()
export class DisputesService {
  private readonly logger: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    logger: StructuredLogger,
  ) {
    this.logger = logger.child('DisputesService');
  }

  async create(userId: string, dto: CreateDisputeDto): Promise<Dispute> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { dispute: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isParticipant = order.buyerId === userId || order.sellerId === userId;
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this order');
    }

    if (order.dispute) {
      throw new BadRequestException('A dispute already exists for this order');
    }

    // Optional: Validar estado de la orden (e.g. solo si es PAID o SHIPPED)
    // if (order.status === 'PENDING_PAYMENT') ...

    const dispute = await this.prisma.dispute.create({
      data: {
        orderId: dto.orderId,
        creatorId: userId,
        reason: dto.reason,
        description: dto.description,
      },
    });

    this.logger.info(`Dispute created for Order ${dto.orderId}`, {
      disputeId: dispute.id,
      creatorId: userId,
    });

    return dispute;
  }

  async findAllByUser(userId: string): Promise<Dispute[]> {
    return this.prisma.dispute.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { order: { buyerId: userId } },
          { order: { sellerId: userId } },
        ],
      },
      include: {
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, disputeId: string): Promise<Dispute> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: true,
        creator: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const isParticipant =
      dispute.creatorId === userId ||
      dispute.order.buyerId === userId ||
      dispute.order.sellerId === userId;

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this dispute');
    }

    return dispute;
  }
}
