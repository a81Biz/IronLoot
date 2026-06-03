import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RefundStatus, OrderStatus } from '@prisma/client';
import { OrderStateMachine, OrderStatus as CoreOrderStatus } from '@ironloot/core';

@Injectable()
export class RefundsService {
  constructor(private readonly prisma: PrismaService) {}

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

      const buyerWallet = await tx.wallet.findUnique({ where: { userId: order.buyerId } });
      if (buyerWallet) {
        const balanceBefore = buyerWallet.balance;
        const balanceAfter = Number(balanceBefore) + amount;

        await tx.wallet.update({
          where: { userId: order.buyerId },
          data: { balance: { increment: amount } },
        });

        await tx.ledger.create({
          data: {
            walletId: buyerWallet.id,
            type: 'REFUND' as any,
            amount,
            balanceBefore,
            balanceAfter,
            referenceId: orderId,
            referenceType: 'REFUND',
            description: `Refund for order ${orderId}`,
          },
        });
      }

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
          payload: { orderId, amount, reason },
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
