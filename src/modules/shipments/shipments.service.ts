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

    const existingShipment = await this.prisma.shipment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existingShipment) {
      throw new BadRequestException('Shipment already exists for this order');
    }

    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: dto.orderId,
        provider: dto.provider,
        trackingNumber: dto.trackingNumber,
        status: ShipmentStatus.PENDING,
      },
    });

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

    this.logger.info(`Shipment ${id} status updated to ${dto.status}`, {
      userId,
      location: dto.location,
    });

    return updatedShipment;
  }
}
