import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// import * as request from 'supertest'; // Unused
import { AppModule } from '../../src/app.module'; // Adjust path if needed
import { PrismaService } from '../../src/database/prisma.service';
import { LedgerType } from '@prisma/client';
import { AuctionSchedulerService } from '../../src/modules/scheduler/auction-scheduler.service';

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
    await prisma.rating.deleteMany();
    await prisma.shipment.deleteMany();
    await prisma.commissionRecord.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.ledger.deleteMany();
    await prisma.order.deleteMany();
    await prisma.bid.deleteMany();
    await prisma.auction.deleteMany();
    // Los avisos y el monedero tambien cuelgan del usuario.
    await prisma.notification.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: { in: ['buyer_e2e@test.com', 'seller_e2e@test.com'] },
      },
    });
    // Don't delete all users in shared env, but for E2E usually safe if specific db
  });

  // NOTE: This test requires a running DB and fully configured environment.
  // If it fails with "Tests: 0 total", check Jest config paths and DB connection.
  it('should execute the full financial flow on auction close', async () => {
    // const walletService = app.get('WalletService'); // Unused
    const scheduler = app.get(AuctionSchedulerService);

    // 1. Create Seller & Buyer
    const buyer = await prisma.user.create({
      data: {
        email: 'buyer_e2e@test.com',
        username: 'buyer_e2e',
        passwordHash: 'hash',
        isSeller: false,
        wallet: { create: { balance: 2000, isActive: true } },
      },
    });
    buyerId = buyer.id;

    const seller = await prisma.user.create({
      data: {
        email: 'seller_e2e@test.com',
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
