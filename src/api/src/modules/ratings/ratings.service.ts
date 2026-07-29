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

    // PT-145 — La guarda de arriba se queda: el 400 es la respuesta util. Pero entre ella y este
    // `create` cabe otra peticion, y hasta ahora `Rating` no tenia restriccion unica, asi que la
    // carrera no daba error — dejaba DOS valoraciones del mismo autor sobre el mismo pedido.
    // Ahora existe `@@unique([orderId, authorId])`, y el choque se traduce al MISMO 400: la
    // respuesta no debe depender de si alguien mas estaba pulsando el boton a la vez.
    let rating;
    try {
      rating = await this.prisma.rating.create({
        data: {
          orderId: dto.orderId,
          authorId: userId,
          targetId,
          score: dto.score,
          comment: dto.comment,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        // Con rastro: llegar aqui significa que la carrera ocurrio de verdad, y eso es un dato que
        // no se recupera despues (lo exigio el checkpoint D3 en PT-142).
        this.logger.warn(
          'Valoracion duplicada detectada por la restriccion unica, no por la guarda',
          {
            data: { orderId: dto.orderId, authorId: userId },
          },
        );
        throw new BadRequestException('You have already rated this order');
      }
      throw error;
    }

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
