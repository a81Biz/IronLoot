import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async calculateForOrder(orderId: string): Promise<void> {
    const existing = await (this.prisma as any).commissionRecord.findUnique({ where: { orderId } });
    if (existing) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { auction: true },
    });
    if (!order) return;

    const rate = await this.resolveRate(order.sellerId, order.auction?.id);
    const amount = new Decimal(order.totalAmount).mul(rate).div(100).toDecimalPlaces(2);

    await (this.prisma as any).commissionRecord.create({
      data: {
        orderId,
        sellerId: order.sellerId,
        amount,
        ratePercent: rate,
        status: 'PENDING',
      },
    });

    this.logger.log(`Commission calculated for order ${orderId}: ${amount} MXN (${rate}%)`);
  }

  private async resolveRate(sellerId: string, auctionId?: string): Promise<Decimal> {
    const sellerOverride = await (this.prisma as any).commissionConfig.findFirst({
      where: { type: 'SELLER', referenceId: sellerId },
    });
    if (sellerOverride) return sellerOverride.ratePercent;

    const globalRate = await (this.prisma as any).commissionConfig.findFirst({
      where: { type: 'GLOBAL' },
    });
    return globalRate?.ratePercent ?? new Decimal(10);
  }

  async getConfig(): Promise<any[]> {
    return (this.prisma as any).commissionConfig.findMany({ orderBy: { type: 'asc' } });
  }

  async upsertGlobalRate(ratePercent: number, updatedBy: string): Promise<void> {
    const existing = await (this.prisma as any).commissionConfig.findFirst({
      where: { type: 'GLOBAL' },
    });
    if (existing) {
      await (this.prisma as any).commissionConfig.update({
        where: { id: existing.id },
        data: { ratePercent: new Decimal(ratePercent), updatedBy },
      });
    } else {
      await (this.prisma as any).commissionConfig.create({
        data: { type: 'GLOBAL', ratePercent: new Decimal(ratePercent), updatedBy },
      });
    }
  }

  async upsertSellerRate(sellerId: string, ratePercent: number, updatedBy: string): Promise<void> {
    const existing = await (this.prisma as any).commissionConfig.findFirst({
      where: { type: 'SELLER', referenceId: sellerId },
    });
    if (existing) {
      await (this.prisma as any).commissionConfig.update({
        where: { id: existing.id },
        data: { ratePercent: new Decimal(ratePercent), updatedBy },
      });
    } else {
      await (this.prisma as any).commissionConfig.create({
        data: {
          type: 'SELLER',
          referenceId: sellerId,
          ratePercent: new Decimal(ratePercent),
          updatedBy,
        },
      });
    }
  }

  async deleteConfig(id: string): Promise<void> {
    await (this.prisma as any).commissionConfig.delete({ where: { id } });
  }

  async getRecords(page = 1, limit = 20, status?: string): Promise<any> {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      (this.prisma as any).commissionRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { calculatedAt: 'desc' },
      }),
      (this.prisma as any).commissionRecord.count({ where }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async markCollected(id: string): Promise<void> {
    await (this.prisma as any).commissionRecord.update({
      where: { id },
      data: { status: 'COLLECTED' },
    });
  }
}
