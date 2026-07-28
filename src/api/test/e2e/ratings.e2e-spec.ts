import request = require('supertest');
import { subastaValida, ponerEnCurso, cerrarYObtenerPedido } from '../core/auction-helper';
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

describe('Ratings Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let buyer: TestUser;
  let auctionId: string;
  let orderId: string;
  let shipmentId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    // 1. Create Users
    seller = await authHelper.createAuthenticatedUser({ isSeller: true });
    buyer = await authHelper.createAuthenticatedUser({ isSeller: false, saldo: 10000 });

    // 2. Create Auction
    const auctionDto: CreateAuctionDto = subastaValida({
      title: 'Rating Test Item',
      startingPrice: 100,
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
      .send({ amount: 150 })
      .expect(201);

    // 5-6. PT-131 — El pedido lo crea el CIERRE, no una peticion del comprador.
    //      `POST /api/v1/orders` ya no existe: `OrdersController` solo tiene `@Get()` y
    //      `@Get(':id')`. Y la espera de 3 s sobraba: se invoca el cierre real en vez de
    //      confiar en que el cron pase.
    const pedido = await cerrarYObtenerPedido(testApp.getApp(), testApp.getPrisma(), auctionId);
    if (!pedido) throw new Error('El cierre no genero pedido: el escenario no se puede montar');
    orderId = pedido.id;

    // 7. Pay Order (Direct DB update)
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

  describe('Flow: Shipment -> Delivery -> Rating', () => {
    it('should create shipment (Seller)', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/shipments')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          orderId,
          provider: 'DHL',
          trackingNumber: 'TRACK123',
        })
        .expect(201);

      shipmentId = res.body.id;
    });

    it('should update shipment to DELIVERED (Seller)', async () => {
      await request(testApp.getApp().getHttpServer())
        .patch(`/api/v1/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${seller.token}`)
        .send({ status: 'DELIVERED' })
        .expect(200);
    });

    it('should allow Buyer to rate Seller', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/ratings')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          orderId,
          score: 5,
          comment: 'Excellent service!',
        });

      expect(res.status).toBe(201);

      expect(res.body.targetId).toBe(seller.id);
      expect(res.body.score).toBe(5);
    });

    it('should allow Seller to rate Buyer', async () => {
      const res = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/ratings')
        .set('Authorization', `Bearer ${seller.token}`)
        .send({
          orderId,
          score: 4,
          comment: 'Good buyer, fast payment.',
        });

      if (res.status !== 201) {
        console.error('Seller Rate Buyer Failed:', JSON.stringify(res.body, null, 2));
      }
      expect(res.status).toBe(201);

      expect(res.body.targetId).toBe(buyer.id);
    });

    it('should prevent duplicate rating', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/ratings')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send({
          orderId,
          score: 1,
        })
        .expect(400);
    });

    it('should list ratings for Seller', async () => {
      // PT-131 — La ruta NO lleva `@Public()`, asi que la cubre el `JwtAuthGuard` global y exige
      // sesion. El spec la pedia sin token y recibia 401.
      //
      // OBSERVACION, no corregida aqui: la reputacion de un vendedor es informacion que un
      // comprador consulta ANTES de registrarse. Que exija sesion puede ser deliberado o puede ser
      // un efecto colateral de haber hecho global el guard. **No se toca el producto** — queda
      // anotado en PENDIENTES para que alguien lo decida.
      const res = await request(testApp.getApp().getHttpServer())
        .get(`/api/v1/users/${seller.id}/ratings`)
        .set('Authorization', `Bearer ${buyer.token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].comment).toBe('Excellent service!');
    });
  });
});
