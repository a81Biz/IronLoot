import request = require('supertest');
import { subastaValida, ponerEnCurso, cerrarYObtenerPedido } from '../core/auction-helper';
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

describe('Disputes Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let buyer: TestUser;
  let auctionId: string;
  let orderId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    // 1. Create Users
    seller = await authHelper.createAuthenticatedUser({ isSeller: true });
    buyer = await authHelper.createAuthenticatedUser({ isSeller: false, saldo: 10000 });

    // 2. Create Auction
    const auctionDto: CreateAuctionDto = subastaValida({
      title: 'Dispute Test Item',
      startingPrice: 50,
    });

    const createRes = await request(testApp.getApp().getHttpServer())
      .post('/api/v1/auctions')
      .set('Authorization', `Bearer ${seller.token}`)
      .send(auctionDto)
      .expect(201);

    auctionId = createRes.body.id;

    // 3. Publish
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(200);

    // PT-131 — La subasta se crea con inicio FUTURO porque el DTO lo exige
    // (`isFutureDate`). Estos escenarios necesitan una subasta EN CURSO, asi que se
    // mueve el reloj en la base DESPUES de crearla por la via publica.
    await ponerEnCurso(testApp.getPrisma(), auctionId);
    // 4. Buyer Bids
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 60 })
      .expect(201);

    // 5-6. PT-131 — El pedido lo crea el CIERRE, no una peticion del comprador.
    //      `POST /api/v1/orders` ya no existe: `OrdersController` solo tiene `@Get()` y
    //      `@Get(':id')`. Y la espera de 3 s sobraba: se invoca el cierre real en vez de
    //      confiar en que el cron pase.
    const pedido = await cerrarYObtenerPedido(testApp.getApp(), testApp.getPrisma(), auctionId);
    if (!pedido) throw new Error('El cierre no genero pedido: el escenario no se puede montar');
    orderId = pedido.id;

    // 7. Pay Order (Direct DB update to simulate PAID)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (testApp.getPrisma() as any).order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });
  });

  afterAll(async () => {
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (buyer) await authHelper.cleanup(buyer.email);
    }
    await testApp.close();
  });

  it('should allow Buyer to create a dispute', async () => {
    const res = await request(testApp.getApp().getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({
        orderId,
        reason: 'Item defective',
        description: 'The screen is broken.',
      })
      .expect(201);

    expect(res.body.status).toBe('OPEN');
    expect(res.body.creatorId).toBe(buyer.id);
  });

  it('should prevent duplicate disputes for same order', async () => {
    await request(testApp.getApp().getHttpServer())
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({
        orderId,
        reason: 'Duplicate',
        description: 'Trying again',
      })
      .expect(400); // BadRequest
  });

  it('should allow Seller to view the dispute', async () => {
    const res = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/disputes')
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(200);

    // Should find the dispute because Seller is part of the Order
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const dispute = res.body.find((d: any) => d.order.id === orderId);
    expect(dispute).toBeDefined();
  });

  it('should allow Buyer to view specific dispute', async () => {
    // Get list first to find ID
    const listRes = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/disputes')
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);

    const disputeId = listRes.body[0].id;

    await request(testApp.getApp().getHttpServer())
      .get(`/api/v1/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);
  });
});
