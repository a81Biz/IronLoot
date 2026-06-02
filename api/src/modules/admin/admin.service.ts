import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      totalUsers,
      activeUsers,
      totalAuctions,
      activeAuctions,
      totalBids,
      totalOrders,
      pendingOrders,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { state: 'ACTIVE' } }),
      this.prisma.auction.count(),
      this.prisma.auction.count({ where: { status: 'ACTIVE' } }),
      this.prisma.bid.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [newUsersToday, todayPayments] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, newToday: newUsersToday },
      auctions: { total: totalAuctions, active: activeAuctions },
      bids: { total: totalBids },
      orders: { total: totalOrders, pending: pendingOrders },
      revenue: { today: Number(todayPayments._sum.amount || 0) },
    };
  }

  async getUsers(page = 1, limit = 20, q?: string) {
    const skip = (page - 1) * limit;
    const where = q
      ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { username: { contains: q, mode: 'insensitive' as const } }] }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, username: true, state: true, isSeller: true, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateUser(id: string, data: { state?: string; isSeller?: boolean }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async getAuctions(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [data, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { seller: { select: { email: true, username: true } } },
      }),
      this.prisma.auction.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async cancelAuction(id: string) {
    return this.prisma.auction.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async getOrders(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { email: true } },
          seller: { select: { email: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { buyer: { select: { email: true } } } } },
      }),
      this.prisma.payment.count(),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getDisputes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.dispute.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { email: true } } },
      }),
      this.prisma.dispute.count(),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditEvent.count(),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getPaymentConfig() {
    const rows = await this.prisma.systemConfig.findMany({
      where: { key: { in: ['PAYMENT_PROVIDERS_ENABLED', 'PRIMARY_CARD_PROVIDER'] } },
    });

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    return {
      enabledProviders: map['PAYMENT_PROVIDERS_ENABLED']
        ? JSON.parse(map['PAYMENT_PROVIDERS_ENABLED'])
        : ['MERCADO_PAGO', 'PAYPAL'],
      primaryCardProvider: map['PRIMARY_CARD_PROVIDER'] || 'MERCADO_PAGO',
    };
  }

  async updatePaymentConfig(providers: string[], primaryCardProvider: string) {
    await Promise.all([
      this.prisma.systemConfig.upsert({
        where: { key: 'PAYMENT_PROVIDERS_ENABLED' },
        update: { value: JSON.stringify(providers) },
        create: { key: 'PAYMENT_PROVIDERS_ENABLED', value: JSON.stringify(providers) },
      }),
      this.prisma.systemConfig.upsert({
        where: { key: 'PRIMARY_CARD_PROVIDER' },
        update: { value: primaryCardProvider },
        create: { key: 'PRIMARY_CARD_PROVIDER', value: primaryCardProvider },
      }),
    ]);

    return { enabledProviders: providers, primaryCardProvider };
  }
}
