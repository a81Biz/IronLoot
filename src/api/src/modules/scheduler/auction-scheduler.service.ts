import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WalletService } from '../wallet/wallet.service';
import { AuctionStatus, OrderStatus, NotificationType, DisputeStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { DistributedLockService } from '../../common/redis/distributed-lock.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CommissionsService } from '../commissions/commissions.service';
// PT-013: Domain events from @ironloot/core
import { AuctionClosedEvent } from '@ironloot/core';

@Injectable()
export class AuctionSchedulerService {
  private readonly logger = new Logger(AuctionSchedulerService.name);

  // Lock TTL: 60 seconds (2x max observed execution time)
  // Measurement: closeExpiredAuctions() executes in ~15-30s under typical load:
  // - Auction query: ~100ms
  // - Per-auction transaction: ~20-50ms
  // - Fund captures + ledger: ~50-100ms each
  // - Notifications: ~50-200ms each (async)
  // Worst case: 100+ auctions * (100ms) ≈ 15-30s
  // TTL set to 2x (60s) for safety and clock skew tolerance
  private readonly lockTtl = 60;

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly distributedLockService: DistributedLockService,
    private readonly systemConfig: SystemConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly commissionsService: CommissionsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Running auction scheduler...');

    // Non-critical operations (can run on any instance)
    await this.startScheduledAuctions();

    // CRITICAL: Acquire distributed lock before closing auctions
    // Prevents race conditions in multi-instance deployments
    const closeLock = await this.distributedLockService.acquireLock(
      'lock:auction-close',
      this.lockTtl,
    );
    if (!closeLock) {
      this.logger.log('auction-close: lock held by another instance, skipping');
      return;
    }

    this.logger.debug('auction-close: lock acquired, starting execution');
    const startTime = Date.now();

    try {
      await this.closeExpiredAuctions();
      const duration = Date.now() - startTime;
      this.logger.debug(`auction-close: completed in ${duration}ms`);
    } catch (error) {
      this.logger.error(`auction-close: failed to close auctions`, error);
      throw error;
    } finally {
      // Always release lock, even if execution fails
      const released = await this.distributedLockService.releaseLock(
        'lock:auction-close',
        closeLock,
      );
      if (!released) {
        this.logger.warn('auction-close: lock release failed (possibly expired and reacquired)');
      } else {
        this.logger.debug('auction-close: lock released');
      }
    }
  }

  /**
   * Published -> Active (excludes PENDING_MODERATION)
   */
  async startScheduledAuctions() {
    const now = new Date();
    const result = await (this.prisma.auction as any).updateMany({
      where: {
        status: AuctionStatus.PUBLISHED,
        startsAt: { lte: now },
      },
      data: {
        status: AuctionStatus.ACTIVE,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Started ${result.count} auctions`);
    }
  }

  async getSoftCloseWindowSec(): Promise<number> {
    return this.systemConfig.getNumber('AUCTION_SOFT_CLOSE_WINDOW_SEC', 120);
  }

  /**
   * Active -> Closed (Process Winner)
   */
  async closeExpiredAuctions() {
    const now = new Date();

    // Find expired auctions that are still active
    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.ACTIVE,
        endsAt: { lte: now },
      },
      include: {
        bids: {
          orderBy: { amount: 'desc' },
          take: 1,
        },
      },
    });

    for (const auction of expiredAuctions) {
      this.logger.log(`Processing expired auction ${auction.id}`);

      try {
        // Atomic: mark closed + create order + capture funds in one TX (PT-033)
        await this.prisma.$transaction(
          async (tx) => {
            // 1. Mark as CLOSED
            await tx.auction.update({
              where: { id: auction.id },
              data: { status: AuctionStatus.CLOSED },
            });

            const winnerBid = auction.bids[0];
            if (winnerBid) {
              // PT-042 (AUD-005): charge the admin-configured commission rate.
              const feePercent = await this.commissionsService.resolveRatePercent(auction.sellerId);
              // PT-071 — neto del vendedor (bruto − comisión), que entra a pendingBalance.
              const gross = Number(winnerBid.amount);
              const sellerNet = Number((gross - (gross * feePercent) / 100).toFixed(2));

              // 2. Create Order (PAID — funds captured atomically below)
              const pedido = await tx.order.create({
                data: {
                  auctionId: auction.id,
                  buyerId: winnerBid.bidderId,
                  sellerId: auction.sellerId,
                  totalAmount: winnerBid.amount,
                  status: OrderStatus.PAID,
                  sellerNet, // PT-071
                },
              });

              // 3. Capture Funds (atomic with order creation — pass outer tx)
              await this.walletService.captureHeldFunds(
                winnerBid.bidderId,
                auction.sellerId,
                Number(winnerBid.amount),
                auction.id,
                `Auction Won: ${auction.title}`,
                tx,
                feePercent,
              );

              // 4. PT-114 (H-010) — Registrar la comision, con la MISMA cifra que se acaba de
              // asentar y dentro de esta misma transaccion.
              //
              // Antes no se registraba nunca: `commission_records` tenia 0 filas mientras el
              // ledger acumulaba `FEE_PLATFORM` cobrados. El informe financiero del panel lee
              // esta tabla, no el ledger, asi que declaraba cero ingresos por comision.
              //
              // Se le pasa `feePercent` —el mismo que uso `captureHeldFunds`— en vez de dejar que
              // lo resuelva: dos calculos independientes de la misma comision divergen en cuanto
              // cambie la tarifa del vendedor, y entonces habria dos cifras y ninguna forma de
              // saber cual vale.
              await this.commissionsService.recordForOrder(pedido.id, feePercent, tx);
            }
          },
          { timeout: 15000 },
        );

        // Post-transaction: notifications and loser fund releases (non-atomic, failures are tolerated)
        const winnerBid = auction.bids[0];
        if (winnerBid) {
          try {
            // Notify Winner
            this.notificationsService
              .create(
                winnerBid.bidderId,
                NotificationType.AUCTION_WON,
                'You won the auction!',
                `Congratulations! You have won "${auction.title}" for $${winnerBid.amount}.`,
                { entityType: 'ORDER', entityId: auction.id, amount: Number(winnerBid.amount) }, // Strict payload
              )
              .catch((e) => this.logger.error('Failed to notify winner', e));

            // Notify Seller
            this.notificationsService
              .create(
                auction.sellerId,
                // PT-117 (H-012) — El vendedor tiene su propio tipo: comprar y vender son eventos
                // distintos, y el tipo debe poder distinguirlos aunque el titulo ya lo haga.
                NotificationType.AUCTION_SOLD,
                'Auction Sold!',
                `Your auction "${auction.title}" has been sold for $${winnerBid.amount}.`,
                { entityType: 'ORDER', entityId: auction.id },
              )
              .catch((e) => this.logger.error('Failed to notify seller', e));

            // RELEASE FUNDS FOR LOSING BIDDERS
            // Only release the highest bid for each unique losing bidder
            const highestBidPerUser = await this.prisma.bid.groupBy({
              by: ['bidderId'],
              where: {
                auctionId: auction.id,
                bidderId: { not: winnerBid.bidderId }, // Exclude winner
              },
              _max: { amount: true },
            });

            for (const loserBid of highestBidPerUser) {
              const amountToRelease = loserBid._max.amount;
              if (amountToRelease) {
                try {
                  await this.walletService.releaseFunds(
                    loserBid.bidderId,
                    Number(amountToRelease),
                    auction.id,
                    `Auction ended - releasing hold for ${auction.title}`,
                  );

                  // Notify Loser
                  this.notificationsService
                    .create(
                      loserBid.bidderId,
                      NotificationType.AUCTION_LOST,
                      'Auction ended',
                      `The auction "${auction.title}" has ended. Your funds ($${amountToRelease}) have been released.`,
                      { auctionId: auction.id },
                    )
                    .catch((e) =>
                      this.logger.error(`Failed to notify loser ${loserBid.bidderId}`, e),
                    );
                } catch (e) {
                  this.logger.error(
                    `Failed to release funds for loser ${loserBid.bidderId} in auction ${auction.id}`,
                    e,
                  );
                }
              }
            }
          } catch (e) {
            this.logger.error(`Failed post-TX notifications/releases for auction ${auction.id}`, e);
          }
        }
        // PT-013: Emit domain event via EventEmitter2 after auction close
        // This satisfies CORE architecture requirement (AC-M3) without removing existing direct calls
        try {
          const winningBid = auction.bids[0];
          const closedEvent: AuctionClosedEvent = {
            eventName: 'auction.closed',
            auctionId: auction.id,
            winnerId: winningBid?.bidderId ?? null,
            winningBidId: winningBid?.id ?? null,
            finalPrice: winningBid ? Number(winningBid.amount) : null,
            occurredAt: new Date(),
          };
          this.eventEmitter.emit('auction.closed', closedEvent);
        } catch (emitError) {
          this.logger.warn(`Failed to emit auction.closed event for ${auction.id}`, emitError);
        }
      } catch (error) {
        this.logger.error(`Failed to close auction ${auction.id}`, error);
      }
    }
  }

  /**
   * PT-071 — Libera a disponible el neto de ventas cuya retención maduró:
   * pedido DELIVERED (recepción confirmada) O vencida la ventana de disputa.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async releaseMaturedSettlements(): Promise<void> {
    const disputeDays = Number(process.env.DISPUTE_WINDOW_DAYS || 14);
    const cutoff = new Date(Date.now() - disputeDays * 24 * 60 * 60 * 1000);

    // PT-174 — La espera cuelga de la CONFIRMACION del comprador, no del estado del pedido.
    //
    // Antes esta consulta llevaba `{ status: OrderStatus.DELIVERED }`: liberaba **en cuanto** el pedido
    // estaba entregado. Y hasta PT-174 el unico que podia marcarlo entregado era el vendedor, asi que
    // **el vendedor liberaba su propio holdback**. El holdback protege al comprador durante la ventana
    // de disputa, y lo desactivaba la parte de la que protege.
    //
    // Decision de negocio (opcion B): **72 h desde la confirmacion**. Es un parametro, no una politica
    // incrustada — se puede revocar cambiando la variable.
    //
    // Se lee de `shipment.deliveredAt` y **no** de `order.updatedAt`: es la leccion de H-011, que medi­a
    // la ventana de disputa desde la ultima modificacion en vez de desde la entrega. El reloj cuelga del
    // hecho, no de la ultima vez que alguien toco la fila.
    const holdbackHours = Number(process.env.SETTLEMENT_HOLDBACK_HOURS ?? 72);
    const confirmCutoff = new Date(Date.now() - holdbackHours * 60 * 60 * 1000);

    const matured = await this.prisma.order.findMany({
      where: {
        sellerSettledAt: null,
        sellerNet: { not: null },
        // PT-191 (AUD-010) — **Una disputa viva congela la liquidación.**
        //
        // Esta condición no estaba, y su ausencia era la mitad cara del hallazgo. El holdback existe
        // *exactamente* para proteger al comprador durante la ventana de disputa (PT-174), y el cron lo
        // soltaba igual con la disputa abierta encima de la mesa: a las 72 h de la entrega el dinero se
        // iba, y cuando llegaba la resolución a favor del comprador ya no había de dónde sacarlo.
        //
        // `RESOLVED` y `CLOSED` no aparecen a propósito: una disputa resuelta a favor del vendedor debe
        // dejar fluir la liquidación, y una resuelta a favor del comprador ya revirtió la venta —el
        // pedido queda `REFUNDED` y `sellerNet` ya no le pertenece—.
        //
        // Es la contrapartida de `reversarVenta()`: sin esta línea, aquélla acabaría escribiendo
        // descubiertos en vez de mover holdback, que es lo mismo pero cobrándoselo a la plataforma.
        //
        // **La forma importa.** Se escribe `NOT: { dispute: { is: {...} } }` y no `dispute: { is: null }`
        // ni `isNot`: `is: null` congelaría también los pedidos cuya disputa ya se resolvió —el dinero
        // no se liberaría **nunca**—, y la semántica de `isNot` sobre una relación opcional ausente no
        // es evidente sobre una relación ausente.
        //
        // **Verificado leyendo el SQL que genera Prisma**, no la documentación — y no con un conteo,
        // porque la base local está vacía y un `0 === 0` habría dado un verde hueco (la lección de
        // PT-122). Lo que emite es:
        //
        //     LEFT JOIN disputes j1 ON j1.order_id = orders.id
        //     WHERE NOT ( j1.status IN ('OPEN','IN_MEDIATION') AND j1.id IS NOT NULL )
        //
        // Con la lógica ternaria de SQL: **sin disputa** → `NULL AND FALSE` = FALSE → `NOT` → **pasa**;
        // **disputa viva** → `TRUE AND TRUE` → **congela**; **disputa resuelta** → `FALSE AND TRUE` =
        // FALSE → **pasa**. El `j1.id IS NOT NULL` que Prisma añade es exactamente lo que salva el caso
        // nulo: sin él, `NULL AND TRUE` = NULL, `NOT NULL` = NULL, y **ningún** pedido sin disputa
        // pasaría el filtro. Es decir: la liquidación se habría parado entera, en silencio.
        NOT: {
          dispute: { is: { status: { in: [DisputeStatus.OPEN, DisputeStatus.IN_MEDIATION] } } },
        },
        OR: [
          // Confirmado por el comprador, y ya pasaron las horas de retencion.
          { shipment: { deliveredAt: { lte: confirmCutoff } } },
          // **El vencimiento.** La mentira simetrica: un comprador que nunca confirma no puede retener
          // el dinero del vendedor para siempre. Antes existia como el otro brazo de este `OR`, por
          // accidente; ahora es una regla declarada y con prueba.
          { createdAt: { lte: cutoff } },
        ],
      },
      select: { id: true, sellerId: true, sellerNet: true },
    });

    for (const order of matured) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.walletService.releaseSettlement(
            order.sellerId,
            Number(order.sellerNet),
            order.id,
            tx,
          );
          await tx.order.update({
            where: { id: order.id },
            data: { sellerSettledAt: new Date() },
          });
        });
        this.logger.log(`Settlement released for order ${order.id} (net ${order.sellerNet})`);
      } catch (e) {
        this.logger.error(`Failed to release settlement for order ${order.id}`, e as Error);
      }
    }
  }
}
