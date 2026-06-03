import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CommissionsService } from '../commissions/commissions.service';
import { KycService } from '../kyc/kyc.service';
import { CfdiService } from '../cfdi/cfdi.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly commissions: CommissionsService,
    private readonly kyc: KycService,
    private readonly cfdi: CfdiService,
  ) {}

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
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { username: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          state: true,
          isSeller: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async updateUser(id: string, data: { state?: string; isSeller?: boolean }) {
    return this.prisma.user.update({ where: { id }, data: data as any });
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

    const map = Object.fromEntries(rows.map((r: any) => [r.key, r.value]));

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

  // ─── Extended stats for dashboard ──────────────────────────────────────────

  async getExtendedStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalAuctions,
      activeAuctions,
      scheduledAuctions,
      totalBids,
      totalOrders,
      pendingOrders,
      totalSellers,
      todayPayments,
      monthPayments,
      failedPayments,
      pendingPayments,
      pendingCommissions,
      cfdiPending,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { state: 'ACTIVE' } }),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.auction.count(),
      this.prisma.auction.count({ where: { status: 'ACTIVE' } }),
      this.prisma.auction.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.bid.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
      this.prisma.user.count({ where: { isSeller: true } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      (this.prisma as any).commissionRecord.count({ where: { status: 'PENDING' } }).catch(() => 0),
      (this.prisma as any).cfdiRecord.count({ where: { status: 'PENDING' } }).catch(() => 0),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newToday: newUsersToday,
        sellers: totalSellers,
        buyers: totalUsers - totalSellers,
      },
      auctions: { total: totalAuctions, active: activeAuctions, scheduled: scheduledAuctions },
      bids: { total: totalBids },
      orders: { total: totalOrders, pending: pendingOrders },
      revenue: {
        today: Number(todayPayments._sum.amount || 0),
        month: Number(monthPayments._sum.amount || 0),
      },
      payments: { failed: failedPayments, pending: pendingPayments },
      commissions: { pending: pendingCommissions },
      cfdi: { pending: cfdiPending },
    };
  }

  async getRevenueByDay(days = 90): Promise<Array<{ date: string; amount: number }>> {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const payments = await this.prisma.payment.findMany({
      where: { status: 'COMPLETED', createdAt: { gte: from } },
      select: { createdAt: true, amount: true },
    });

    const byDay: Record<string, number> = {};
    for (const p of payments) {
      const key = p.createdAt.toISOString().substring(0, 10);
      byDay[key] = (byDay[key] ?? 0) + Number(p.amount);
    }

    return Object.entries(byDay)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getNewUsersByDay(days = 30): Promise<Array<{ date: string; count: number }>> {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    });

    const byDay: Record<string, number> = {};
    for (const u of users) {
      const key = u.createdAt.toISOString().substring(0, 10);
      byDay[key] = (byDay[key] ?? 0) + 1;
    }

    return Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ─── Audit helper (immutable log for admin actions) ───────────────────────

  private async logAdminAction(
    eventType: string,
    entityId: string,
    adminUser: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          eventType,
          timestamp: new Date(),
          traceId: `admin-${Date.now()}`,
          env: process.env.NODE_ENV ?? 'production',
          service: 'admin',
          actorType: 'user',
          actorUserId: undefined,
          entityType: 'AUCTION',
          entityId,
          result: 'SUCCESS',
          payload: { adminUser, ...payload } as any,
        },
      });
    } catch {
      // Audit failure must never break the action
    }
  }

  // ─── Auction extended management ───────────────────────────────────────────

  async getAuctionDetail(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        seller: { select: { email: true, username: true } },
        bids: {
          take: 10,
          orderBy: { amount: 'desc' },
          include: { bidder: { select: { email: true } } },
        },
      },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    return auction;
  }

  async approveAuction(id: string, adminUser: string) {
    const auction = await this.prisma.auction.findUnique({ where: { id } });
    if (!auction) throw new NotFoundException('Auction not found');
    const result = await (this.prisma.auction as any).update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        adminNotes: `Approved by ${adminUser} at ${new Date().toISOString()}`,
      },
    });
    await this.logAdminAction('AUCTION_APPROVED', id, adminUser);
    return result;
  }

  async rejectAuction(id: string, reason: string, adminUser: string) {
    const result = await (this.prisma.auction as any).update({
      where: { id },
      data: { status: 'DRAFT', adminNotes: `Rejected by ${adminUser}: ${reason}` },
    });
    await this.logAdminAction('AUCTION_REJECTED', id, adminUser, { reason });
    return result;
  }

  async suspendAuction(id: string, adminUser: string) {
    const result = await (this.prisma.auction as any).update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        adminNotes: `Suspended by ${adminUser} at ${new Date().toISOString()}`,
      },
    });
    await this.logAdminAction('AUCTION_SUSPENDED', id, adminUser);
    return result;
  }

  async forceCloseAuction(id: string, adminUser: string) {
    const result = await (this.prisma.auction as any).update({
      where: { id },
      data: {
        status: 'CLOSED',
        adminNotes: `Force-closed by ${adminUser} at ${new Date().toISOString()}`,
      },
    });
    await this.logAdminAction('AUCTION_FORCE_CLOSED', id, adminUser);
    return result;
  }

  async reopenAuction(id: string, adminUser: string) {
    const result = await (this.prisma.auction as any).update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        adminNotes: `Reopened by ${adminUser} at ${new Date().toISOString()}`,
      },
    });
    await this.logAdminAction('AUCTION_REOPENED', id, adminUser);
    return result;
  }

  // ─── Lots management ───────────────────────────────────────────────────────

  async getLots(page = 1, limit = 20, blocked?: string) {
    const skip = (page - 1) * limit;
    const where: any = blocked !== undefined ? { isBlocked: blocked === 'true' } : {};
    const [data, total] = await Promise.all([
      (this.prisma.auction as any).findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          images: true,
          status: true,
          isBlocked: true,
          seller: { select: { email: true } },
          _count: { select: { bids: true } },
        },
      }),
      (this.prisma.auction as any).count({ where }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async blockLot(id: string, adminUser: string) {
    const result = await (this.prisma.auction as any).update({
      where: { id },
      data: { isBlocked: true, adminNotes: `Blocked by ${adminUser}` },
    });
    await this.logAdminAction('LOT_BLOCKED', id, adminUser);
    return result;
  }

  async unblockLot(id: string, adminUser: string) {
    const result = await (this.prisma.auction as any).update({
      where: { id },
      data: { isBlocked: false, adminNotes: `Unblocked by ${adminUser}` },
    });
    await this.logAdminAction('LOT_UNBLOCKED', id, adminUser);
    return result;
  }

  async updateLot(id: string, data: { adminNotes?: string }) {
    return (this.prisma.auction as any).update({ where: { id }, data });
  }

  // ─── Payments with filters ─────────────────────────────────────────────────

  async getPaymentsFiltered(
    page = 1,
    limit = 20,
    status?: string,
    provider?: string,
    from?: string,
    to?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { buyer: { select: { email: true } } } } },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  async getFinancialReport(from: Date, to: Date) {
    const [payments, commissionRecords] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: from, lte: to } },
        select: { amount: true, createdAt: true },
      }),
      (this.prisma as any).commissionRecord.findMany({
        where: { calculatedAt: { gte: from, lte: to } },
        select: { amount: true, calculatedAt: true },
      }),
    ]);

    const salesTotal = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const commissionsTotal = commissionRecords.reduce(
      (s: number, c: any) => s + Number(c.amount),
      0,
    );

    const byDay: Record<string, { sales: number; commissions: number }> = {};
    for (const p of payments) {
      const k = p.createdAt.toISOString().substring(0, 10);
      if (!byDay[k]) byDay[k] = { sales: 0, commissions: 0 };
      byDay[k].sales += Number(p.amount);
    }
    for (const c of commissionRecords) {
      const k = c.calculatedAt.toISOString().substring(0, 10);
      if (!byDay[k]) byDay[k] = { sales: 0, commissions: 0 };
      byDay[k].commissions += Number(c.amount);
    }

    return {
      sales_total: salesTotal,
      commissions_total: commissionsTotal,
      net_income: salesTotal - commissionsTotal,
      by_day: Object.entries(byDay)
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  async getOperationalReport(from: Date, to: Date) {
    const [auctions, bids, newUsers] = await Promise.all([
      this.prisma.auction.groupBy({
        by: ['status'],
        _count: { _all: true },
        where: { createdAt: { gte: from, lte: to } },
      }),
      this.prisma.bid.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
    ]);

    const totalAuctions = auctions.reduce((s, a) => s + a._count._all, 0);
    const closedAuctions = auctions.find((a) => a.status === 'CLOSED')?._count._all ?? 0;
    const byStatus: Record<string, number> = {};
    for (const a of auctions) byStatus[a.status] = a._count._all;

    return {
      auctions_total: totalAuctions,
      by_status: byStatus,
      conversion_rate: totalAuctions > 0 ? Math.round((closedAuctions / totalAuctions) * 100) : 0,
      avg_bids_per_auction: totalAuctions > 0 ? Math.round(bids / totalAuctions) : 0,
      new_users: newUsers,
    };
  }

  async getFiscalReport(from: Date, to: Date) {
    const [emitted, cancelled, pending] = await Promise.all([
      (this.prisma as any).cfdiRecord.count({
        where: { status: 'EMITTED', createdAt: { gte: from, lte: to } },
      }),
      (this.prisma as any).cfdiRecord.count({
        where: { status: 'CANCELLED', createdAt: { gte: from, lte: to } },
      }),
      (this.prisma as any).cfdiRecord.count({
        where: { status: 'PENDING', createdAt: { gte: from, lte: to } },
      }),
    ]);
    return {
      cfdi_emitted: emitted,
      cfdi_cancelled: cancelled,
      cfdi_pending: pending,
      iva_total: 0,
    };
  }

  // ─── Platform configuration ────────────────────────────────────────────────

  async getPlatformConfig() {
    const [auctions, users] = await Promise.all([
      this.systemConfig.getByCategory('auctions'),
      this.systemConfig.getByCategory('users'),
    ]);
    return { auctions, users };
  }

  async updatePlatformConfig(updates: Record<string, string>, adminUser: string) {
    const allowedCategories = ['auctions', 'users'];
    for (const [key, value] of Object.entries(updates)) {
      const record: any = await (this.prisma.systemConfig as any).findUnique({ where: { key } });
      if (record && allowedCategories.includes(record.category ?? 'general')) {
        await this.systemConfig.set(key, value, adminUser);
      }
    }
    return this.getPlatformConfig();
  }

  async getSmtpConfig() {
    return this.systemConfig.getByCategory('smtp');
  }

  async updateSmtpConfig(updates: Record<string, string>, adminUser: string) {
    await this.systemConfig.updateCategory('smtp', updates, adminUser);
  }

  async getStorageConfig() {
    return this.systemConfig.getByCategory('storage');
  }

  async updateStorageConfig(updates: Record<string, string>, adminUser: string) {
    await this.systemConfig.updateCategory('storage', updates, adminUser);
  }

  // ─── Audit logs with filters ───────────────────────────────────────────────

  async getAuditLogsFiltered(
    page = 1,
    limit = 50,
    filters: {
      userId?: string;
      module?: string;
      action?: string;
      from?: string;
      to?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (filters.userId) where.actorUserId = filters.userId;
    if (filters.action) where.eventType = { contains: filters.action, mode: 'insensitive' };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditEvent.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ─── Moderation ────────────────────────────────────────────────────────────

  async getModerationQueue(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma.auction as any).findMany({
        where: { status: 'PENDING_MODERATION' as any },
        skip,
        take: limit,
        orderBy: { updatedAt: 'asc' },
        include: { seller: { select: { email: true, username: true } } },
      }),
      (this.prisma.auction as any).count({ where: { status: 'PENDING_MODERATION' as any } }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async approveModeration(id: string, adminUser: string) {
    await (this.prisma.auction as any).update({ where: { id }, data: { status: 'PUBLISHED' } });
    await (this.prisma as any).moderationLog.create({
      data: { auctionId: id, action: 'APPROVED', reviewedBy: adminUser },
    });
  }

  async rejectModeration(
    id: string,
    reasonCode: string,
    notes: string | undefined,
    adminUser: string,
  ) {
    await (this.prisma.auction as any).update({
      where: { id },
      data: { status: 'DRAFT', adminNotes: `Rejected: ${reasonCode}` },
    });
    await (this.prisma as any).moderationLog.create({
      data: { auctionId: id, action: 'REJECTED', reasonCode, notes, reviewedBy: adminUser },
    });
  }

  // ─── Notifications ─────────────────────────────────────────────────────────

  async sendBulkNotification(
    segment: string,
    title: string,
    body: string,
    channels: string[],
    adminUser: string,
  ) {
    const where: any = {};
    if (segment === 'SELLERS') where.isSeller = true;
    if (segment === 'SUSPENDED') where.state = 'SUSPENDED';
    if (segment === 'BUYERS') where.isSeller = false;

    const users = await this.prisma.user.findMany({ where, select: { id: true } });

    const campaign = await (this.prisma as any).notificationCampaign.create({
      data: {
        title,
        body,
        segment: segment as any,
        channelsJson: channels,
        status: 'SENT',
        sentAt: new Date(),
        recipientsCount: users.length,
        sentBy: adminUser,
      },
    });

    if (channels.includes('inApp')) {
      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          type: 'SYSTEM',
          title,
          message: body,
        })),
        skipDuplicates: true,
      });
    }

    return campaign;
  }

  async getCampaigns(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (this.prisma as any).notificationCampaign.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).notificationCampaign.count(),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ─── User detail ───────────────────────────────────────────────────────────

  async getUserDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        ordersAsBuyer: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { auction: { select: { title: true } } },
        },
        bids: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { auction: { select: { title: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // ─── KYC delegation ────────────────────────────────────────────────────────

  getKycQueue(page: number, status?: string) {
    return this.kyc.getQueue(page, 20, status);
  }
  getKycSubmission(id: string) {
    return this.kyc.getSubmission(id);
  }
  approveKyc(id: string, adminUser: string) {
    return this.kyc.approve(id, adminUser);
  }
  rejectKyc(id: string, reason: string, adminUser: string) {
    return this.kyc.reject(id, reason, adminUser);
  }
  requestKycCorrection(id: string, notes: string, adminUser: string) {
    return this.kyc.requestCorrection(id, notes, adminUser);
  }

  // ─── CFDI delegation ───────────────────────────────────────────────────────

  getCfdiList(page: number, status?: string) {
    return this.cfdi.list(page, 20, status);
  }
  getCfdi(orderId: string) {
    return this.cfdi.getCfdi(orderId);
  }
  generateCfdi(orderId: string) {
    return this.cfdi.generate(orderId);
  }
  cancelCfdi(orderId: string) {
    return this.cfdi.cancel(orderId);
  }
  getCfdiConfig() {
    return this.cfdi.getConfig();
  }
  updateCfdiConfig(data: any, adminUser: string) {
    return this.cfdi.updateConfig(data, adminUser);
  }

  // ─── Commissions delegation ────────────────────────────────────────────────

  getCommissionsConfig() {
    return this.commissions.getConfig();
  }
  getCommissionsRecords(page: number, status?: string) {
    return this.commissions.getRecords(page, 20, status);
  }
  upsertGlobalRate(rate: number, adminUser: string) {
    return this.commissions.upsertGlobalRate(rate, adminUser);
  }
  upsertSellerRate(sellerId: string, rate: number, adminUser: string) {
    return this.commissions.upsertSellerRate(sellerId, rate, adminUser);
  }
  markCommissionCollected(id: string) {
    return this.commissions.markCollected(id);
  }
  deleteCommissionConfig(id: string) {
    return this.commissions.deleteConfig(id);
  }

  // ─── Dispute Resolution (PT-013) ──────────────────────────────────────────

  async getDisputeById(disputeId: string) {
    return this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        creator: { select: { id: true, email: true, username: true } },
        order: { select: { id: true, totalAmount: true, status: true, buyer: { select: { email: true } }, seller: { select: { email: true } } } },
      },
    });
  }

  async resolveDisputeFavorBuyer(disputeId: string, reason: string, adminUser: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'RESOLVED' as any },
    });

    await this.logAdminAction('dispute.resolved_buyer', disputeId, adminUser, { reason });
    return { resolved: true, favor: 'buyer', note: 'Initiate refund via POST /admin/refunds' };
  }

  async resolveDisputeFavorSeller(disputeId: string, reason: string, adminUser: string) {
    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'RESOLVED' as any },
    });
    await this.logAdminAction('dispute.resolved_seller', disputeId, adminUser, { reason });
    return { resolved: true, favor: 'seller' };
  }

  async requestDisputeEvidence(disputeId: string, message: string, adminUser: string) {
    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'IN_MEDIATION' as any },
    });
    await this.logAdminAction('dispute.evidence_requested', disputeId, adminUser, { message });
    return { status: 'IN_MEDIATION', message };
  }

  // ─── Reconciliation (PT-013) ──────────────────────────────────────────────

  async reconcilePayments(provider: 'MERCADO_PAGO' | 'PAYPAL', dateFrom: Date, dateTo: Date) {
    const internalPayments = await this.prisma.payment.findMany({
      where: {
        provider: provider as any,
        createdAt: { gte: dateFrom, lte: dateTo },
        status: 'COMPLETED',
      },
      select: { id: true, externalId: true, amount: true, status: true },
    });

    // Provider API integration is pending — return internal records with note
    return {
      provider,
      dateFrom,
      dateTo,
      internalCount: internalPayments.length,
      internalOnly: internalPayments,
      providerOnly: [],
      matched: [],
      note: `Provider API reconciliation for ${provider} requires API credentials. Internal records shown.`,
    };
  }
}
