import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Shipment, ShipmentStatus, NotificationType } from '@prisma/client';
import { OrderStateMachine, OrderStatus as CoreOrderStatus } from '@ironloot/core';
import { PrismaService } from '../../database/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
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

/**
 * PT-174 — Quién declara cada estado del envío.
 *
 * **Quien envía declara el envío; quien recibe confirma la recepción.** Antes todo era del vendedor, y
 * con eso liberaba su propio holdback.
 *
 * Lo que no está aquí lo declara el vendedor por defecto — es el actor natural de la logística. Se
 * expresa así, y no con una lista de los dos casos, porque **añadir un estado nuevo debe caer del lado
 * restrictivo**: si mañana aparece `RETURNED` y nadie piensa en quién lo declara, que sea el vendedor y
 * no «cualquiera».
 */
const ACTOR_POR_ESTADO_DE_ENVIO: Partial<Record<ShipmentStatus, 'buyer' | 'seller'>> = {
  [ShipmentStatus.DELIVERED]: 'buyer',
};

@Injectable()
export class ShipmentsService {
  private readonly logger: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly notifications: NotificationsService,
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

    // PT-174 — **La llave se parte por transicion, no por rol global.** Antes esto era
    // `if (order.sellerId !== userId) throw` para cualquier estado, incluido `DELIVERED`: el vendedor
    // marcaba entregado su propio envio y, con `releaseMaturedSettlements` liberando por estado,
    // **liberaba su propio holdback**. El holdback protege al comprador durante la ventana de disputa,
    // y lo podia desactivar la unica parte de la que protege.
    //
    // Se comprueba ANTES de la transicion a proposito: si se mirara despues, el vendedor recibiria un
    // 400 por el estado y aprenderia que el problema es la secuencia, no el permiso.
    const quienDebe = ACTOR_POR_ESTADO_DE_ENVIO[dto.status];

    if (quienDebe === 'buyer' && shipment.order.buyerId !== userId) {
      throw new ForbiddenException(
        'Only the buyer can confirm delivery — the seller cannot mark their own shipment as received',
      );
    }

    if (quienDebe !== 'buyer' && shipment.order.sellerId !== userId) {
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

    // PT-174 — El comprador tiene que saber que puede confirmar. Sin aviso, la confirmacion depende de
    // que entre a mirar, y de ella cuelga el pago al vendedor.
    //
    // El tipo es `ORDER_SHIPPED` y el destinatario el **comprador**: es la leccion de H-012, donde el
    // aviso al vendedor reutilizaba el tipo del comprador y los dos significaban cosas distintas.
    //
    // No lanza: un aviso no puede costarle al vendedor la declaracion de su envio. Se registra el fallo
    // — **no es un `catch` mudo**, que es lo que vigila el checkpoint D3.
    if (dto.status === ShipmentStatus.SHIPPED) {
      try {
        await this.notifications.create(
          shipment.order.buyerId,
          NotificationType.ORDER_SHIPPED,
          'Tu compra va en camino',
          'El vendedor declaro el envio. Cuando lo recibas, confirmalo desde el detalle del pedido.',
          { orderId: shipment.orderId, shipmentId: id },
        );
      } catch (e) {
        this.logger.error('No se pudo notificar el envio al comprador', e as Error, {
          orderId: shipment.orderId,
        });
      }
    }

    this.logger.info(`Shipment ${id} status updated to ${dto.status}`, {
      userId,
      location: dto.location,
    });

    return updatedShipment;
  }
}
