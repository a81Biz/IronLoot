import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// import * as request from 'supertest'; // Unused
import { AppModule } from '../../src/app.module'; // Adjust path if needed
import { PrismaService } from '../../src/database/prisma.service';
import { LedgerType } from '@prisma/client';
import { AuctionSchedulerService } from '../../src/modules/scheduler/auction-scheduler.service';

const EMAIL_COMPRADOR = 'buyer_e2e@test.com';
const EMAIL_VENDEDOR = 'seller_e2e@test.com';

describe('Orders Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sellerId: string;
  let buyerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();

    // PT-131 — El borrado tiene que respetar las claves ajenas, y el orden estaba incompleto.
    //
    //     Foreign key constraint violated: `shipments_order_id_fkey`
    //
    // Cuando se escribio esto, un pedido no tenia envios, valoraciones ni comisiones colgando.
    // Ahora si. Se borra de las hojas hacia la raiz — y las tablas nuevas se anaden AQUI, que es
    // la deuda que este orden explicito deja a la vista en vez de esconder.
    //
    // PT-143 — El orden era correcto y el ALCANCE no: eran once `deleteMany()` **sin filtro**, es
    // decir once tablas truncadas enteras. Jest corre las suites en paralelo, asi que mientras
    // `ratings.e2e` preparaba su pedido, esta suite se lo borraba: de ahi sus `expected 201, got
    // 404` y que los fallos cambiaran de sitio entre corridas.
    //
    // Y habia un riesgo mayor que el paralelismo: `deleteMany()` sin filtro borra sobre la base a
    // la que apunte `DATABASE_URL`, y la de desarrollo de este repositorio sostiene validaciones
    // PTSA. El propio `auth-helper` lo temia por escrito y se quedo en un comentario.
    //
    // Ahora se borra **solo lo de esta suite**, resolviendo los ids desde sus dos usuarios.
    await limpiarDatosDeEstaSuite();
  });

  /**
   * Borra lo que crea esta suite y nada mas, de las hojas hacia la raiz.
   *
   * Si los dos usuarios no existen todavia —primera corrida— no hay nada que borrar y las consultas
   * devuelven listas vacias: la funcion es idempotente a proposito, porque un `beforeAll` que falla
   * cuando la base esta limpia es un `beforeAll` que solo funciona la segunda vez.
   */
  async function limpiarDatosDeEstaSuite(): Promise<void> {
    const usuarios = await prisma.user.findMany({
      where: { email: { in: [EMAIL_COMPRADOR, EMAIL_VENDEDOR] } },
      select: { id: true },
    });
    if (usuarios.length === 0) return;

    const userIds = usuarios.map((u) => u.id);

    const subastas = await prisma.auction.findMany({
      where: { sellerId: { in: userIds } },
      select: { id: true },
    });
    const auctionIds = subastas.map((a) => a.id);

    const pedidos = await prisma.order.findMany({
      where: { OR: [{ buyerId: { in: userIds } }, { sellerId: { in: userIds } }] },
      select: { id: true },
    });
    const orderIds = pedidos.map((o) => o.id);

    const monederos = await prisma.wallet.findMany({
      where: { userId: { in: userIds } },
      select: { id: true },
    });
    const walletIds = monederos.map((w) => w.id);

    // Hojas primero. El orden es el mismo que ya habia; lo que cambia es que cada borrado lleva su
    // `where`.
    await prisma.rating.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.shipment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.commissionRecord.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.ledger.deleteMany({ where: { walletId: { in: walletIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.bid.deleteMany({ where: { auctionId: { in: auctionIds } } });
    await prisma.auction.deleteMany({ where: { id: { in: auctionIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.wallet.deleteMany({ where: { id: { in: walletIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  // NOTE: This test requires a running DB and fully configured environment.
  // If it fails with "Tests: 0 total", check Jest config paths and DB connection.
  it('should execute the full financial flow on auction close', async () => {
    // const walletService = app.get('WalletService'); // Unused
    const scheduler = app.get(AuctionSchedulerService);

    // 1. Create Seller & Buyer
    const buyer = await prisma.user.create({
      data: {
        email: EMAIL_COMPRADOR,
        username: 'buyer_e2e',
        passwordHash: 'hash',
        isSeller: false,
        wallet: { create: { balance: 2000, isActive: true } },
      },
    });
    buyerId = buyer.id;

    const seller = await prisma.user.create({
      data: {
        email: EMAIL_VENDEDOR,
        username: 'seller_e2e',
        passwordHash: 'hash',
        isSeller: true,
      },
    });
    sellerId = seller.id;

    // 2. Create Auction
    const auction = await prisma.auction.create({
      data: {
        title: 'Test Item E2E',
        description: 'Desc',
        slug: 'test-item-e2e',
        startingPrice: 100,
        currentPrice: 500,
        startsAt: new Date(),
        endsAt: new Date(Date.now() - 1000), // Expired
        sellerId: seller.id,
        status: 'ACTIVE',
      },
    });

    // 3. Create Bid (Winner) - Simulate Hold
    await prisma.wallet.update({
      where: { userId: buyerId },
      data: { heldFunds: 500, balance: 1500 }, // Total 2000
    });

    await prisma.bid.create({
      data: {
        amount: 500,
        auctionId: auction.id,
        bidderId: buyerId,
      },
    });

    // 4. Run Scheduler (Close Auction)
    await scheduler.closeExpiredAuctions();

    // 5. Verify Order Created
    const order = await prisma.order.findUnique({ where: { auctionId: auction.id } });
    expect(order).toBeDefined();
    expect(order!.buyerId).toBe(buyerId);
    expect(order!.sellerId).toBe(sellerId);
    expect(Number(order!.totalAmount)).toBe(500);

    // 6. Verify Buyer Ledger (Released Hold -> Debit)
    const buyerWallet = await prisma.wallet.findUnique({ where: { userId: buyerId } });
    expect(buyerWallet).toBeDefined();
    expect(Number(buyerWallet!.heldFunds)).toBe(0);

    const buyerDebit = await prisma.ledger.findFirst({
      where: { walletId: buyerWallet!.id, type: LedgerType.DEBIT_ORDER },
    });
    expect(buyerDebit).toBeDefined();

    // 7. Verify Seller Ledger (Credit Sale + Fee)
    const sellerWallet = await prisma.wallet.findUnique({ where: { userId: sellerId } });
    expect(sellerWallet).toBeDefined();
    // PT-131 — PT-071 introdujo la RETENCION DE LIQUIDACION: el neto del vendedor no entra en
    // `balance`, entra en `pendingBalance` hasta que se libera. El spec seguia mirando el sitio
    // de antes. El importe (500 - 10 %) no cambia; cambia donde vive.
    expect(Number(sellerWallet!.pendingBalance)).toBe(450); // 500 - 10 %, retenido
    expect(Number(sellerWallet!.balance)).toBe(0);

    const credit = await prisma.ledger.findFirst({
      where: { walletId: sellerWallet!.id, type: LedgerType.CREDIT_SALE },
    });
    expect(credit).toBeDefined();
    expect(Number(credit!.amount)).toBe(500);
  });

  afterAll(async () => {
    await app.close();
  });
});
