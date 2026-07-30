import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RefundStatus, OrderStatus } from '@prisma/client';
import { OrderStateMachine, OrderStatus as CoreOrderStatus } from '@ironloot/core';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class RefundsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * PT-191 (AUD-010) — **El movimiento de dinero sale de aquí y pasa por `WalletService`.**
   *
   * ## Lo que hacía este método, y por qué era la octava vía al saldo
   *
   * Acreditaba al comprador con `findUnique` + `update({ balance: { increment } })`, **sin `FOR UPDATE`**.
   * Es exactamente el defecto que PT-146 (RULE-24) corrigió en siete caminos — pero los siete estaban
   * dentro de `WalletService`, y **éste está fuera**, así que aquella medición no lo vio. Dos puertas al
   * mismo saldo y sólo una con cerradura, otra vez.
   *
   * Y peor: `if (buyerWallet) { … }`. Un comprador **sin monedero** —nunca depositó, pagó por pasarela—
   * dejaba el pedido en `REFUNDED` y **no cobraba nada**, sin error y sin traza. `asegurarMonedero()`
   * (RULE-22) existe exactamente para eso desde PT-142.
   *
   * ## Y sólo acreditaba: no cargaba a nadie
   *
   * Ése es el defecto caro. El importe aparecía en el monedero del comprador **sin salir del monedero
   * del vendedor**: dinero impreso y un ledger que no cuadra. Ahora el movimiento entero es
   * `WalletService.reversarVenta()`, que bloquea los dos monederos en orden fijo y conserva el importe.
   */
  async createRefund(orderId: string, amount: number, reason: string, initiatedBy: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { refundRequest: true },
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.refundRequest) throw new BadRequestException('Refund already exists for this order');

    if (
      !OrderStateMachine.canTransition(
        order.status as unknown as CoreOrderStatus,
        CoreOrderStatus.REFUNDED,
      )
    ) {
      throw new BadRequestException(`Order cannot be refunded from status: ${order.status}`);
    }

    if (amount <= 0 || amount > Number(order.totalAmount)) {
      throw new BadRequestException('Invalid refund amount');
    }

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refundRequest.create({
        data: {
          orderId,
          amount,
          currency: 'MXN',
          reason,
          status: RefundStatus.PENDING_REFUND,
          initiatedBy,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REFUNDED },
      });

      // PT-191 (AUD-010) — El dinero se mueve por un solo sitio, y ese sitio tiene el cerrojo.
      // Sale del vendedor (holdback primero) y entra al comprador: el importe se conserva.
      const reversa = await this.walletService.reversarVenta(
        order.buyerId,
        order.sellerId,
        amount,
        orderId,
        tx,
      );

      await tx.auditEvent.create({
        data: {
          eventType: 'refund.created',
          entityType: 'RefundRequest',
          entityId: refund.id,
          actorType: 'user',
          actorUserId: initiatedBy,
          result: 'SUCCESS',
          traceId: `refund-${Date.now()}`,
          env: process.env.NODE_ENV ?? 'development',
          service: 'admin',
          // El descubierto se deja escrito en la traza: es una deuda del vendedor, y quien
          // audite el reembolso tiene que poder verla sin recalcularla.
          payload: { orderId, amount, reason, ...reversa },
        },
      });

      return refund;
    });
  }

  async listRefunds(status?: RefundStatus, page = 1, limit = 20) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where,
        include: { order: { select: { id: true, totalAmount: true, buyerId: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.refundRequest.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async updateStatus(id: string, status: RefundStatus) {
    return this.prisma.refundRequest.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' || status === 'FAILED' ? { resolvedAt: new Date() } : {}),
      },
    });
  }
}
