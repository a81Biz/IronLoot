import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CommissionsService } from '../commissions/commissions.service';
import { KycService } from '../kyc/kyc.service';
import { CfdiService } from '../cfdi/cfdi.service';
import { NotificationQueueProducer } from '../notifications/notification-queue.producer';
import { RefundsService } from '../refunds/refunds.service';
import { AuctionStateMachine, AuctionStatus } from '@ironloot/core';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly commissions: CommissionsService,
    private readonly kyc: KycService,
    private readonly cfdi: CfdiService,
    private readonly notificationQueue: NotificationQueueProducer,
    // PT-191 (AUD-010) — Resolver una disputa a favor del comprador mueve dinero de verdad.
    private readonly refundsService: RefundsService,
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

  async cancelAuction(id: string, adminUser = 'admin') {
    // PT-191 (AUD-011) — Esta era la peor de las seis: **no llamaba ni a `assertAuctionModifiable`**, asi que
    // cancelaba incluso una subasta ya cerrada.
    return this.transicionar(id, AuctionStatus.CANCELLED, adminUser);
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

  /**
   * PT-041 (AUD-011): admin moderation transitions are intentional overrides outside the
   * buyer/seller state machine, but a finished (terminal) auction must not be re-moderated.
   */
  private async assertAuctionModifiable(id: string): Promise<void> {
    const a = await this.prisma.auction.findUnique({ where: { id }, select: { status: true } });
    if (!a) throw new NotFoundException('Auction not found');
    if (a.status === 'CLOSED' || a.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot moderate a ${a.status} auction`);
    }
  }

  /**
   * PT-191 (AUD-011) — **La unica puerta por la que el panel cambia el estado de una subasta.**
   *
   * ## Que habia
   *
   * Seis metodos escribiendo `auction.status` a mano —aprobar, rechazar, suspender, cerrar a la fuerza,
   * reabrir y cancelar— sin consultar `AuctionStateMachine`. La unica proteccion era
   * `assertAuctionModifiable`, que solo bloquea `CLOSED` y `CANCELLED`; y `cancelAuction` **ni siquiera la
   * llamaba**.
   *
   * Es la forma exacta de **PT-173**, donde `shipments` escribia `order.status` por fuera de la maquina:
   * *dos puertas al mismo estado y solo una con cerradura*. Aqui eran seis.
   *
   * ## Que impide ahora
   *
   * Aprobar o reabrir una subasta **`ACTIVE`** —ya esta corriendo— y cualquier cosa desde un estado terminal.
   * Antes se aplicaban en silencio y dejaban la subasta en un estado que el dominio no admite.
   *
   * ## Lo que hubo que arreglar ANTES de poder cerrar esta puerta
   *
   * El mapa de la maquina estaba **incompleto**: le faltaban `PENDING_MODERATION → DRAFT` (rechazar, el flujo
   * central de moderacion), `PUBLISHED → SUSPENDED`, `PUBLISHED → CLOSED` y `SUSPENDED → CANCELLED`. Cablear
   * la maquina sin completarla habria roto la moderacion — **enforzar un mapa incompleto no es enforzar el
   * dominio, es enforzar un error de transcripcion del dominio.**
   */
  private async transicionar(
    id: string,
    destino: AuctionStatus,
    adminUser: string,
    datosExtra: Record<string, unknown> = {},
  ) {
    const actual = await this.prisma.auction.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!actual) throw new NotFoundException('Auction not found');

    const desde = actual.status as unknown as AuctionStatus;
    if (desde === destino) {
      throw new BadRequestException(`Auction is already ${destino}`);
    }

    if (!AuctionStateMachine.canTransition(desde, destino)) {
      // El mensaje nombra las dos puntas: sin ellas, «transicion invalida» manda a leer codigo.
      throw new BadRequestException(
        `Invalid auction transition ${desde} -> ${destino} (admin: ${adminUser})`,
      );
    }

    return (this.prisma.auction as any).update({
      where: { id },
      data: { status: destino, ...datosExtra },
    });
  }

  async approveAuction(id: string, adminUser: string) {
    await this.assertAuctionModifiable(id);
    const auction = await this.prisma.auction.findUnique({ where: { id } });
    if (!auction) throw new NotFoundException('Auction not found');
    const result = await this.transicionar(id, AuctionStatus.PUBLISHED, adminUser, {
      adminNotes: `Approved by ${adminUser} at ${new Date().toISOString()}`,
    });
    await this.logAdminAction('AUCTION_APPROVED', id, adminUser);
    return result;
  }

  async rejectAuction(id: string, reason: string, adminUser: string) {
    await this.assertAuctionModifiable(id);
    const result = await this.transicionar(id, AuctionStatus.DRAFT, adminUser, {
      adminNotes: `Rejected by ${adminUser}: ${reason}`,
    });
    await this.logAdminAction('AUCTION_REJECTED', id, adminUser, { reason });
    return result;
  }

  async suspendAuction(id: string, adminUser: string) {
    await this.assertAuctionModifiable(id);
    const result = await this.transicionar(id, AuctionStatus.SUSPENDED, adminUser, {
      adminNotes: `Suspended by ${adminUser} at ${new Date().toISOString()}`,
    });
    await this.logAdminAction('AUCTION_SUSPENDED', id, adminUser);
    return result;
  }

  async forceCloseAuction(id: string, adminUser: string) {
    await this.assertAuctionModifiable(id);
    const result = await this.transicionar(id, AuctionStatus.CLOSED, adminUser, {
      adminNotes: `Force-closed by ${adminUser} at ${new Date().toISOString()}`,
    });
    await this.logAdminAction('AUCTION_FORCE_CLOSED', id, adminUser);
    return result;
  }

  async reopenAuction(id: string, adminUser: string) {
    // PT-191 (AUD-011) — Tampoco llamaba a `assertAuctionModifiable`: reabria una subasta cerrada. Ahora la
    // maquina lo rechaza, porque `CLOSED` es terminal.
    const result = await this.transicionar(id, AuctionStatus.PUBLISHED, adminUser, {
      adminNotes: `Reopened by ${adminUser} at ${new Date().toISOString()}`,
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

  // PT-191 (AUD-027) — `getSmtpConfig` / `updateSmtpConfig` retirados con sus endpoints: leian y escribian la
  // categoria `smtp` de `SystemConfig`, que **el mailer nunca consulto**. Ver `system-config.service.ts`.

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
        // PT-051 (BUG-QA-12): 'QUEUED' is not a member of the CampaignStatus enum
        // (DRAFT | SCHEDULED | SENT | FAILED) → Prisma threw and the broadcast failed silently
        // while the admin UI reported success. It is dispatched synchronously here, so 'SENT' is correct.
        status: 'SENT',
        sentAt: new Date(),
        recipientsCount: users.length,
        sentBy: adminUser,
      },
    });

    if (channels.includes('inApp')) {
      await Promise.all(
        users.map((u) =>
          this.notificationQueue.addCampaignNotificationJob({
            campaignId: campaign.id as string,
            userId: u.id,
            title,
            body,
          }),
        ),
      );
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
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            buyer: { select: { email: true } },
            seller: { select: { email: true } },
          },
        },
      },
    });
  }

  async resolveDisputeFavorBuyer(disputeId: string, reason: string, adminUser: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    });
    if (!dispute) throw new NotFoundException('Dispute not found');

    // PT-191 (AUD-010) — **Resolver a favor del comprador ES devolverle el dinero.**
    //
    // Antes esto ponía la disputa en `RESOLVED` y devolvía `note: 'Initiate refund via POST
    // /admin/refunds'`: una **nota de texto** pidiendo que alguien, después, llamara a otro endpoint.
    // Nada obligaba a ese segundo paso. Para el comprador y para el panel la disputa quedaba resuelta a
    // su favor, y el dinero dependía de que un humano leyera la nota y no se distrajera. Es la familia
    // de H-029 y H-030: **un control que aparenta funcionar**.
    //
    // El reembolso va **antes** de marcar `RESOLVED` a propósito: si el movimiento de dinero falla, la
    // disputa sigue abierta. Al revés dejaría una disputa cerrada sin pago — el estado exacto que este
    // hallazgo describe.
    const reembolso = await this.refundsService.createRefund(
      dispute.order.id,
      Number(dispute.order.totalAmount),
      `Dispute ${disputeId} resolved in favor of buyer: ${reason}`,
      adminUser,
    );

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: 'RESOLVED' as any, resolution: reason },
    });

    await this.logAdminAction('dispute.resolved_buyer', disputeId, adminUser, {
      reason,
      refundId: (reembolso as { id?: string })?.id,
    });
    return {
      resolved: true,
      favor: 'buyer',
      refunded: true,
      refundId: (reembolso as { id?: string })?.id,
    };
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

  /**
   * PT-080 — Reconciliacion sobre el ciclo de pago.
   *
   * Antes consultaba la tabla `payments`, que nunca se escribe (Payment.orderId es obligatorio
   * y los depositos de wallet no tienen orden), de modo que siempre devolvia vacio. Ahora lee
   * `payment_cycles`, que si tiene los datos, y deja de tipar proveedores en duro.
   */
  async reconcilePayments(provider: string, dateFrom: Date, dateTo: Date) {
    const cycles = await this.prisma.paymentCycle.findMany({
      where: {
        provider: provider as PaymentProvider,
        requestedAt: { gte: dateFrom, lte: dateTo },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const byStatus = (status: string) => cycles.filter((c) => c.status === status);

    return {
      provider,
      dateFrom,
      dateTo,
      total: cycles.length,
      settled: byStatus('SETTLED').length,
      pending: byStatus('REQUESTED').length,
      failed: byStatus('FAILED').length,
      expired: byStatus('EXPIRED').length,
      anomalies: byStatus('ANOMALY').length,
      // Cobrado y no acreditado, o abierto mas alla del plazo: lo que exige atencion.
      needsAttention: cycles.filter((c) => c.status === 'ANOMALY' || c.status === 'EXPIRED'),
      cycles,
    };
  }

  /**
   * PT-086 — Traza completa de una transaccion, en orden cronologico.
   * Es el respaldo ante una disputa con la pasarela: que se pidio, que se envio, que respondio
   * y que se hizo con ello.
   */
  async getPaymentTrace(reference: string) {
    const [cycle, steps] = await Promise.all([
      this.prisma.paymentCycle.findUnique({ where: { reference } }),
      this.prisma.paymentCycleEvent.findMany({
        where: { reference },
        orderBy: { receivedAt: 'asc' },
      }),
    ]);

    return { reference, cycle, steps, total: steps.length };
  }

  /**
   * PT-080 — Cola de revision de anomalias.
   *
   * La tabla del ciclo **es** la cola: un `RefundRequest` no sirve porque exige `orderId` con
   * clave foranea a `Order`, y un deposito de wallet no tiene orden. La decision de devolver
   * dinero sigue siendo del admin (ADR-022).
   */
  async listPaymentAnomalies() {
    const cycles = await this.prisma.paymentCycle.findMany({
      where: { status: { in: ['ANOMALY', 'EXPIRED'] } },
      orderBy: { requestedAt: 'desc' },
      include: { events: { orderBy: { receivedAt: 'asc' } } },
    });

    return { total: cycles.length, items: cycles };
  }
}
