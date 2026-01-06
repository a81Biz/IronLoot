import request = require('supertest');
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../api/src/modules/auctions/dto';

describe('Orders Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let winner: TestUser;
  let loser: TestUser;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    // Create users
    seller = await authHelper.createAuthenticatedUser({ isSeller: true });
    winner = await authHelper.createAuthenticatedUser({ isSeller: false });
    loser = await authHelper.createAuthenticatedUser({ isSeller: false });
  });

  afterAll(async () => {
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (winner) await authHelper.cleanup(winner.email);
      if (loser) await authHelper.cleanup(loser.email);
    }
    await testApp.close();
  });

  let auctionId: string;

  it('should prepare a closed auction with a winner', async () => {
    // 1. Create Auction
    const auctionDto: CreateAuctionDto = {
      title: 'Order Test Item',
      description: 'Item for order tests',
      startingPrice: 50,
      startsAt: new Date(Date.now() - 1000 * 60).toISOString(),
      endsAt: new Date(Date.now() + 1000 * 2).toISOString(), // Ends in 2 seconds
      images: [],
    };

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

    // 3. User 'winner' places bid
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${winner.token}`)
      .send({ amount: 60 })
      .expect(201);

    // 4. Wait for auction to expire (simple wait for test)
    await new Promise((r) => setTimeout(r, 2500));
  });

  describe('Create Order', () => {
    it('should prevent non-winner from creating order', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${loser.token}`)
        .send({ auctionId })
        .expect(403);
    });

    it('should allow winner to create order', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${winner.token}`)
        .send({ auctionId })
        .expect(201);

      expect(res.body.status).toBe('PENDING_PAYMENT');
      expect(Number(res.body.totalAmount)).toBe(60);
    });

    it('should return existing order if called again (idempotency)', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${winner.token}`)
        .send({ auctionId })
        .expect(201); // Or 200, depending on implementation choice. Service returns order.

      expect(Number(res.body.totalAmount)).toBe(60);
    });
  });

  describe('Get Orders', () => {
    it('should list user orders', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${winner.token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].auction).toBeDefined();
    });
  });
});
