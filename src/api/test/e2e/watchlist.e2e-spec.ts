import request = require('supertest');
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

describe('Watchlist Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let user: TestUser;
  let auctionId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    // Create users
    seller = await authHelper.createAuthenticatedUser({ isSeller: true });
    user = await authHelper.createAuthenticatedUser({ isSeller: false });

    // Create an auction to watch
    const auctionDto: CreateAuctionDto = {
      title: 'Watchlist Test Auction',
      description: 'Auction for watchlist testing',
      startingPrice: 50,
      startsAt: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // Starts in 5 mins
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString(), // Ends in 2 hours
      images: [],
    };

    const response = await request(testApp.getApp().getHttpServer())
      .post('/api/v1/auctions')
      .set('Authorization', `Bearer ${seller.token}`)
      .send(auctionDto)
      .expect(201);

    auctionId = response.body.id;

    // Publish it so it's visible (though watchlist might allow drafts if logic permits, but let's stick to standard flow)
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(200);
  });

  afterAll(async () => {
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (user) await authHelper.cleanup(user.email);
    }
    await testApp.close();
  });

  describe('/api/v1/watchlist (GET)', () => {
    it('should return empty list initially', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should require authentication', async () => {
      await request(testApp.getApp().getHttpServer()).get('/api/v1/watchlist').expect(401);
    });
  });

  describe('/api/v1/watchlist (POST)', () => {
    it('should add auction to watchlist', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ auctionId })
        .expect(200);
    });

    it('should return 200 OK if already in watchlist (Idempotency)', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ auctionId })
        .expect(200);
    });

    it('should return 404 if auction does not exist', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/watchlist')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ auctionId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('should verify item is in watchlist with embedded auction', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].auctionId).toBe(auctionId);
      expect(response.body[0].auction).toBeDefined();
      expect(response.body[0].auction.id).toBe(auctionId);
      expect(response.body[0].auction.title).toBe('Watchlist Test Auction');
    });
  });

  describe('/api/v1/watchlist/:auctionId (DELETE)', () => {
    it('should remove auction from watchlist', async () => {
      await request(testApp.getApp().getHttpServer())
        .delete(`/api/v1/watchlist/${auctionId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(204);
    });

    it('should return 204 No Content if not found (Idempotency)', async () => {
      await request(testApp.getApp().getHttpServer())
        .delete(`/api/v1/watchlist/${auctionId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(204);
    });

    it('should verify list is empty', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .get('/api/v1/watchlist')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });
  });
});
