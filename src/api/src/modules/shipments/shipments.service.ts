import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Shipment, ShipmentStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateShipmentDto, UpdateShipmentStatusDto } from './dto';
import { StructuredLogger, ChildLogger } from '../../common/observability';

@Injectable()
export class ShipmentsService {
  private readonly logger: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    logger: StructuredLogger,
  ) {
    this.logger = logger.child('ShipmentsService');
  }

  async create(userId: string, dto: CreateShipmentDto): Promise<Shipment> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can create a shipment');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException('Order must be PAID before shipping');
    }

    // La guarda se queda: rechazar con 400 es la respuesta util, y es la que el llamante espera.
    const existingShipment = await this.prisma.shipment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existingShipment) {
      throw new BadRequestException('Shipment already exists for this order');
    }

    // PT-142 — Pero entre la guarda y el `create` cabe otra peticion: las dos pasan la
    // comprobacion, una crea y la otra recibe `P2002`. El usuario veria **500 donde le
    // corresponde 400**, y solo si tiene la mala suerte de coincidir con otro.
    // Se traduce al mismo error que la guarda: la respuesta no debe depender de si alguien mas
    // estaba pulsando el boton a la vez.
    let shipment;
    try {
      shipment = await this.prisma.shipment.create({
        data: {
          orderId: dto.orderId,
          provider: dto.provider,
          trackingNumber: dto.trackingNumber,
          status: ShipmentStatus.PENDING,
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        // Se deja rastro a proposito. Llegar aqui significa que DOS peticiones pasaron la guarda de
        // arriba a la vez: el usuario recibe el 400 que le toca, pero saber que la carrera ocurre
        // de verdad —y con que frecuencia— es informacion que no se puede recuperar despues.
        this.logger.warn('Envio duplicado detectado por la restriccion unica, no por la guarda', {
          data: { orderId: dto.orderId, userId },
        });
        throw new BadRequestException('Shipment already exists for this order');
      }
      throw error;
    }

    this.logger.info(`Shipment created for Order ${order.id}`, {
      shipmentId: shipment.id,
      userId,
    });

    return shipment;
  }

  async findOne(userId: string, id: string): Promise<Shipment> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.order.buyerId !== userId && shipment.order.sellerId !== userId) {
      throw new ForbiddenException('You are not authorized to view this shipment');
    }

    return shipment;
  }

  async updateStatus(userId: string, id: string, dto: UpdateShipmentStatusDto): Promise<Shipment> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.order.sellerId !== userId) {
      throw new ForbiddenException('Only the seller can update shipment status');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status: dto.status,
    };

    if (dto.status === ShipmentStatus.SHIPPED && !shipment.shippedAt) {
      updateData.shippedAt = new Date();
    } else if (dto.status === ShipmentStatus.DELIVERED && !shipment.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const updatedShipment = await this.prisma.shipment.update({
      where: { id },
      data: updateData,
    });

    // Update Order status based on Shipment status
    if (dto.status === ShipmentStatus.SHIPPED) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'SHIPPED' },
      });
    } else if (dto.status === ShipmentStatus.DELIVERED) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED' },
      });
    }

    this.logger.info(`Shipment ${id} status updated to ${dto.status}`, {
      userId,
      location: dto.location,
    });

    return updatedShipment;
  }
}
