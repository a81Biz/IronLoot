import request = require('supertest');
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../api/src/modules/auctions/dto';

describe('Auctions Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let buyer: TestUser;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    // Create a seller
    seller = await authHelper.createAuthenticatedUser({ isSeller: true });
    // Create a buyer
    buyer = await authHelper.createAuthenticatedUser({ isSeller: false });
  });

  afterAll(async () => {
    // Cleanup users (cascades to auctions)
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (buyer) await authHelper.cleanup(buyer.email);
    }
    await testApp.close();
  });

  const auctionDto: CreateAuctionDto = {
    title: 'Test Auction',
    description: 'This is a test auction',
    startingPrice: 100,
    startsAt: new Date(Date.now() + 1000 * 60).toISOString(), // Starts in 1 min
    endsAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // Ends in 1 hour
    images: ['https://example.com/image.jpg'],
  };

  let auctionId: string;

  describe('/api/v1/auctions (POST)', () => {
    it('should allow seller to create an auction', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/auctions')
        .set('Authorization', `Bearer ${seller.token}`)
        .send(auctionDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(auctionDto.title);
      expect(response.body.status).toBe('DRAFT');

      auctionId = response.body.id;
    });

    it('should deny non-seller', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/auctions')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send(auctionDto)
        .expect(403);
    });
  });

  describe('/api/v1/auctions (GET)', () => {
    it('should list auctions', async () => {
      // Create another auction just in case
      // Note: By default findAll lists active/published. Our auction is DRAFT.
      // So we shouldn't see it yet unless we filter specifically or publish it

      const response = await request(testApp.getApp().getHttpServer())
        .get('/api/v1/auctions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should retrieve auction details', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .get(`/api/v1/auctions/${auctionId}`)
        .expect(200);

      expect(response.body.id).toBe(auctionId);
    });
  });

  describe('/api/v1/auctions/:id (PATCH)', () => {
    it('should update auction (Draft)', async () => {
      const updateData = { title: 'Updated Title' };
      const response = await request(testApp.getApp().getHttpServer())
        .patch(`/api/v1/auctions/${auctionId}`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
    });
  });

  describe('/api/v1/auctions/:id/publish (POST)', () => {
    it('should publish auction', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .post(`/api/v1/auctions/${auctionId}/publish`)
        .set('Authorization', `Bearer ${seller.token}`)
        .expect(200);

      expect(response.body.status).toBe('PUBLISHED');
    });
  });
});
