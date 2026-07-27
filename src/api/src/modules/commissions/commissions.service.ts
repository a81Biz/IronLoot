import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * PT-114 (H-010) — Registra la comision de una venta liquidada, con la cifra QUE YA SE ASENTO.
   *
   * `commission_records` tenia 0 filas mientras el ledger registraba 95.00 MXN de `FEE_PLATFORM`
   * cobrados: `calculateForOrder()` era el unico sitio que creaba el registro y no lo invocaba
   * nadie. El dinero se cobraba; la contabilidad no lo veia, y el informe financiero del panel
   * —que lee esta tabla, no el ledger— declaraba cero ingresos.
   *
   * **Recibe el `feePercent` en vez de resolverlo.** Es la diferencia con `calculateForOrder`, y
   * es deliberada: `captureHeldFunds` ya calculo la comision con ese mismo porcentaje y la
   * asento. Recalcularla aqui daria dos cifras que divergen en cuanto cambie la tarifa del
   * vendedor entre el cierre y esta llamada — y entonces el ledger y la contabilidad dirian cosas
   * distintas, y alguien tendria que averiguar cual miente.
   *
   * **Recibe la transaccion.** El registro nace dentro de la misma transaccion que el pedido y los
   * asientos: si falla, la venta entera se deshace. Crearlo despues, fuera, dejaria exactamente el
   * estado que este PT viene a impedir — cobrado y sin registrar.
   *
   * Idempotente por `orderId`: un reintento del cierre no produce dos asientos contables de la
   * misma venta (la misma leccion que la unicidad de `Payment.reference`, PT-087).
   */
  async recordForOrder(
    orderId: string,
    feePercent: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const cliente = tx as unknown as {
      commissionRecord: {
        findUnique: (a: unknown) => Promise<unknown>;
        create: (a: unknown) => Promise<unknown>;
      };
      order: {
        findUnique: (a: unknown) => Promise<{ sellerId: string; totalAmount: unknown } | null>;
      };
    };

    const existente = await cliente.commissionRecord.findUnique({ where: { orderId } });
    if (existente) return;

    const pedido = await cliente.order.findUnique({ where: { id: orderId } });
    if (!pedido) {
      throw new NotFoundException(`No existe el pedido ${orderId}: no se registra comision`);
    }

    const amount = new Decimal(pedido.totalAmount as never)
      .mul(feePercent)
      .div(100)
      .toDecimalPlaces(2);

    await cliente.commissionRecord.create({
      data: {
        orderId,
        sellerId: pedido.sellerId,
        amount,
        ratePercent: new Decimal(feePercent),
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Comision registrada para el pedido ${orderId}: ${amount} MXN (${feePercent}%)`,
    );
  }

  /**
   * PT-114 — Reconstruye el registro de un pedido historico, resolviendo la tarifa por su cuenta.
   *
   * **No es el camino normal**: en una venta que se acaba de liquidar, la cifra buena es la que
   * asento `captureHeldFunds`, y esa la escribe `recordForOrder`. Este metodo existe para los
   * pedidos anteriores a PT-114, donde no hay otra fuente que la tarifa vigente.
   *
   * Que existiera un metodo publico que PARECIA el camino y no lo invocaba nadie es parte de por
   * que H-010 paso desapercibido.
   */
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

  private async resolveRate(sellerId: string, _auctionId?: string): Promise<Decimal> {
    const sellerOverride = await (this.prisma as any).commissionConfig.findFirst({
      where: { type: 'SELLER', referenceId: sellerId },
    });
    if (sellerOverride) return sellerOverride.ratePercent;

    const globalRate = await (this.prisma as any).commissionConfig.findFirst({
      where: { type: 'GLOBAL' },
    });
    return globalRate?.ratePercent ?? new Decimal(10);
  }

  /**
   * PT-042 (AUD-005): public rate resolver so the settlement path (scheduler) can charge the
   * admin-configured commission rate (seller override → global → default 10) instead of a
   * hardcoded percentage — a single source of truth for the platform commission rate.
   */
  async resolveRatePercent(sellerId: string): Promise<number> {
    return Number(await this.resolveRate(sellerId));
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
