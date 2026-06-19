import request = require('supertest');
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
// import { ShipmentProvider, ShipmentStatus } from '@prisma/client';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

describe('Shipments Module (e2e)', () => {
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
    buyer = await authHelper.createAuthenticatedUser({ isSeller: false });

    // 2. Create Auction
    const auctionDto: CreateAuctionDto = {
      title: 'Shipment Test Item',
      description: 'Desc',
      startingPrice: 100,
      startsAt: new Date(Date.now() - 1000 * 60).toISOString(),
      endsAt: new Date(Date.now() + 1000 * 2).toISOString(),
      images: [],
    };

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

    // 4. Buyer Bids
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ amount: 150 })
      .expect(201);

    // 5. Wait for Close
    await new Promise((r) => setTimeout(r, 3000));

    // 6. Create Order
    const orderRes = await request(testApp.getApp().getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyer.token}`)
      .send({ auctionId })
      .expect(201);

    orderId = orderRes.body.id;

    // 7. Pay Order (Directly via Prisma to simulate state, or via Payments Flow)
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

  describe('POST /shipments', () => {
    it('should create a shipment when authenticated as seller', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          orderId,
          provider: 'DHL',
          trackingNumber: 'TRACK123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.provider).toBe('DHL');
      expect(response.body.status).toBe('PENDING');
    });

    it('should fail if user is not seller', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          orderId,
          provider: 'FEDEX',
        })
        .expect(403);
    });
  });

  describe('GET /shipments/:id', () => {
    let shipmentId: string;

    beforeAll(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shipment = await (testApp.getPrisma() as any).shipment.findUnique({
        where: { orderId },
      });
      shipmentId = shipment.id;
    });

    it('should allow buyer to view shipment', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .get(`/api/v1/shipments/${shipmentId}`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .expect(200);

      expect(response.body.id).toBe(shipmentId);
    });

    it('should allow seller to view shipment', async () => {
      await request(testApp.getApp().getHttpServer())
        .get(`/api/v1/shipments/${shipmentId}`)
        .set('Authorization', `Bearer ${seller.token}`)
        .expect(200);
    });
  });
});
