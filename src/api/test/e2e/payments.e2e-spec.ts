import request = require('supertest');
import { subastaValida, ponerEnCurso } from '../core/auction-helper';
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

describe('Payments Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let winner: TestUser;
  let auctionId: string;
  let orderId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    // Create users
    seller = await authHelper.createAuthenticatedUser({ isSeller: true });
    winner = await authHelper.createAuthenticatedUser({ isSeller: false, saldo: 10000 });

    // --- Setup Data (Auction -> Bid -> Win -> Order) ---

    // 1. Create Auction
    const auctionDto: CreateAuctionDto = subastaValida({
      title: 'Payment Test Item',
      startingPrice: 50,
    });

    const createRes = await request(testApp.getApp().getHttpServer())
      .post('/api/v1/auctions')
      .set('Authorization', `Bearer ${seller.token}`)
      .send(auctionDto)
      .expect(201);

    auctionId = createRes.body.id;

    // 2. Publish
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(200);

    // PT-131 — La subasta se crea con inicio FUTURO porque el DTO lo exige
    // (`isFutureDate`). Estos escenarios necesitan una subasta EN CURSO, asi que se
    // mueve el reloj en la base DESPUES de crearla por la via publica.
    await ponerEnCurso(testApp.getPrisma(), auctionId);
    // 3. Place Bid
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${winner.token}`)
      .send({ amount: 60 })
      .expect(201);

    // 4. Wait for expiration
    await new Promise((r) => setTimeout(r, 2500));

    // 5. Create Order
    const orderRes = await request(testApp.getApp().getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${winner.token}`)
      .send({ auctionId })
      .expect(201);

    orderId = orderRes.body.id;
  });

  afterAll(async () => {
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (winner) await authHelper.cleanup(winner.email);
    }
    await testApp.close();
  });

  describe('POST /payments/checkout', () => {
    it('should initiate a checkout session (MOCK)', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${winner.token}`)
        .send({
          orderId,
          provider: 'MERCADO_PAGO',
        })
        .expect(201);

      expect(res.body.redirectUrl).toBeDefined();
      expect(res.body.externalId).toBeDefined();
      // Verify new enhancement: isIntegrated flag
      expect(res.body.isIntegrated).toBe(false); // Default is false (mock)
    });

    it('should fail if order does not exist', async () => {
      const fakeUuid = '00000000-0000-0000-0000-000000000000';
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/payments/checkout')
        .set('Authorization', `Bearer ${winner.token}`)
        .send({
          orderId: fakeUuid,
          provider: 'PAYPAL',
        })
        .expect(404); // Or 400 depending on service logic
    });
  });
  describe('POST /payments/initiate', () => {
    it('should initiate a wallet deposit', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${winner.token}`)
        .send({
          amount: 100,
          provider: 'PAYPAL',
        })
        .expect(201);

      expect(res.body.redirectUrl).toBeDefined();
    });

    it('should fail with invalid amount', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${winner.token}`)
        .send({
          amount: -50,
          provider: 'PAYPAL',
        })
        .expect(400);
    });
  });
});
