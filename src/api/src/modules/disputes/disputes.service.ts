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
import { DisputeStateMachine } from '@ironloot/core';

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
      // PT-115 (H-011) — el envio entra en la consulta: ahi vive la fecha de entrega.
      include: { dispute: true, shipment: true },
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

    if (order.status !== 'DELIVERED' && order.status !== 'PAID' && order.status !== 'SHIPPED') {
      throw new BadRequestException('Order must be PAID, SHIPPED or DELIVERED to open a dispute');
    }

    // PT-115 (H-011) — La ventana de 14 dias se cuenta desde la ENTREGA, que es lo que declara
    // CR-007 en F-1.
    //
    // Antes esto pedia `(order as any).deliveredAt`, y `orders` NO TIENE esa columna —ni en la BD
    // ni en Prisma—. Los dos `as any` hacian que compilara y devolviera `undefined`, asi que la
    // rama de la entrega estaba muerta y la ventana respondia siempre a `updatedAt`: cualquier
    // modificacion del pedido (un cambio de estado, la liquidacion al vendedor, un ajuste
    // administrativo) reiniciaba los 14 dias.
    //
    // El dato existia todo el tiempo en `shipments.delivered_at`, que puebla
    // `shipments.service.ts:105` al marcar la entrega. `ratings.service` ya leia la entrega del
    // envio; esto solo deja de buscarla donde no esta.
    //
    // El respaldo a `updatedAt` se conserva porque `shipment` es una relacion OPCIONAL: un pedido
    // puede estar DELIVERED sin envio registrado. La diferencia es que ahora es una rama declarada
    // y no la unica que se ejecuta.
    const referenceDate: Date = order.shipment?.deliveredAt ?? order.updatedAt;

    if (!DisputeStateMachine.canOpenDispute(referenceDate)) {
      throw new BadRequestException(
        `Dispute period has expired. Disputes must be opened within ${DisputeStateMachine.windowDays} days.`,
      );
    }

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
