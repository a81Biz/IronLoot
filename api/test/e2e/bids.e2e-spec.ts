import request = require('supertest');
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../api/src/modules/auctions/dto';

describe('Bids Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let bidder1: TestUser;
  let bidder2: TestUser;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    // Create users
    seller = await authHelper.createAuthenticatedUser({ isSeller: true });
    bidder1 = await authHelper.createAuthenticatedUser({ isSeller: false });
    bidder2 = await authHelper.createAuthenticatedUser({ isSeller: false });
  });

  afterAll(async () => {
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (bidder1) await authHelper.cleanup(bidder1.email);
      if (bidder2) await authHelper.cleanup(bidder2.email);
    }
    await testApp.close();
  });

  let auctionId: string;

  it('should prepare an active auction', async () => {
    // 1. Create Auction (Draft)
    const auctionDto: CreateAuctionDto = {
      title: 'Bidding Test Item',
      description: 'Item for bidding tests',
      startingPrice: 100,
      startsAt: new Date(Date.now() - 1000 * 60).toISOString(), // Started 1 min ago
      endsAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // Ends in 1 hour
      images: [],
    };

    const createRes = await request(testApp.getApp().getHttpServer())
      .post('/api/v1/auctions')
      .set('Authorization', `Bearer ${seller.token}`)
      .send(auctionDto)
      .expect(201);

    auctionId = createRes.body.id;

    // 2. Publish Auction
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/publish`)
      .set('Authorization', `Bearer ${seller.token}`)
      .expect(200);

    // Verify it is PUBLISHED (and effectively active because startsAt < now)
    const getRes = await request(testApp.getApp().getHttpServer())
      .get(`/api/v1/auctions/${auctionId}`)
      .expect(200);

    expect(getRes.body.status).toBe('PUBLISHED');
  });

  describe('Place Bid', () => {
    it('should allow a valid bid', async () => {
      const bidAmount = 105.0;
      const res = await request(testApp.getApp().getHttpServer())
        .post(`/api/v1/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${bidder1.token}`)
        .send({ amount: bidAmount })
        .expect(201);

      expect(Number(res.body.amount)).toBe(bidAmount);
      expect(res.body.bidderId).toBe(bidder1.id);
    });

    it('should update auction current price', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .get(`/api/v1/auctions/${auctionId}`)
        .expect(200);

      expect(Number(res.body.currentPrice)).toBe(105);
    });

    it('should prevent bid lower than current price + increment', async () => {
      // Current is 105. Next min should be 106.
      await request(testApp.getApp().getHttpServer())
        .post(`/api/v1/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${bidder2.token}`)
        .send({ amount: 105.5 }) // Only +0.50
        .expect(400); // Bad Request (BidTooLow)
    });

    it('should prevent seller from bidding', async () => {
      await request(testApp.getApp().getHttpServer())
        .post(`/api/v1/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({ amount: 200 })
        .expect(400); // 400 or 403 depending on implementation. Service throws BidOnOwnAuction (usually 400 or 403)
      // Checking BusinessException default mapping. Usually 400 Conflict or Bad Request.
    });

    it('should allow a higher bid from another user', async () => {
      await request(testApp.getApp().getHttpServer())
        .post(`/api/v1/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${bidder2.token}`)
        .send({ amount: 110 })
        .expect(201);
    });
  });

  describe('Get Bids', () => {
    it('should list bids history', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .get(`/api/v1/auctions/${auctionId}/bids`)
        .set('Authorization', `Bearer ${bidder1.token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(Number(res.body[0].amount)).toBe(110); // Most recent first
    });
  });
});
