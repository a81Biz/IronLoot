import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Shipment, ShipmentStatus } from '@prisma/client';
import { OrderStateMachine, OrderStatus as CoreOrderStatus } from '@ironloot/core';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CreateShipmentDto, UpdateShipmentStatusDto } from './dto';
import { StructuredLogger, ChildLogger } from '../../common/observability';

/**
 * PT-173 — Qué estado de pedido implica cada estado de envío.
 *
 * Sólo dos de los cuatro mueven el pedido. `PENDING` es el estado inicial del envío y `RETURNED` está
 * declarado en el enum y **nadie lo usa** — dejarlo fuera es deliberado: darle un destino aquí sería
 * decidir la política de devoluciones de pasada, y eso está fuera de alcance.
 */
const ESTADO_PEDIDO_POR_ENVIO: Partial<Record<ShipmentStatus, 'SHIPPED' | 'DELIVERED'>> = {
  [ShipmentStatus.SHIPPED]: 'SHIPPED',
  [ShipmentStatus.DELIVERED]: 'DELIVERED',
};

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

    // PT-173 — El estado del pedido que corresponde a este estado de envio. Si el envio no mueve el
    // pedido (`PENDING`, `RETURNED`), no hay transicion que validar.
    const estadoPedido = ESTADO_PEDIDO_POR_ENVIO[dto.status];

    if (estadoPedido) {
      // **La cerradura que faltaba.** `OrderStateMachine` vive en `@ironloot/core`, dice
      // `PAID -> SHIPPED -> DELIVERED` y ya se consulta en `orders.service.ts` y `refunds.service.ts`.
      // Aqui se escribia `order.status` a mano, asi que habia dos puertas al mismo estado y solo una
      // con cerradura: un pedido `PAID` saltaba a `DELIVERED` sin pasar por `SHIPPED`, y con eso el
      // cron liberaba el holdback del vendedor.
      //
      // Se comprueba ANTES de tocar el envio: si la transicion no vale, no se mueve nada. Un envio
      // `DELIVERED` con su pedido en `PAID` seria peor que el fallo original — el sistema
      // contradiciendose a si mismo.
      if (
        !OrderStateMachine.canTransition(
          shipment.order.status as unknown as CoreOrderStatus,
          estadoPedido as unknown as CoreOrderStatus,
        )
      ) {
        throw new BadRequestException(
          `Cannot move order ${shipment.orderId} from ${shipment.order.status} to ${estadoPedido}`,
        );
      }
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

    // PT-173 — Las dos escrituras van juntas o no van. Antes eran dos `update` sueltos: un fallo entre
    // ambos dejaba el envio en un estado y el pedido en otro.
    const updatedShipment = await this.prisma.$transaction(async (tx) => {
      const envio = await tx.shipment.update({ where: { id }, data: updateData });

      if (estadoPedido) {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: estadoPedido },
        });
      }

      return envio;
    });

    this.logger.info(`Shipment ${id} status updated to ${dto.status}`, {
      userId,
      location: dto.location,
    });

    return updatedShipment;
  }
}
