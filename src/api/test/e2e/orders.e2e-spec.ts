import request = require('supertest');
import { subastaValida, ponerEnCurso, cerrarYObtenerPedido } from '../core/auction-helper';
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

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
    winner = await authHelper.createAuthenticatedUser({ isSeller: false, saldo: 10000 });
    loser = await authHelper.createAuthenticatedUser({ isSeller: false, saldo: 10000 });
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
    const auctionDto: CreateAuctionDto = subastaValida({
      title: 'Order Test Item',
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
    // 3. User 'winner' places bid
    await request(testApp.getApp().getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/bids`)
      .set('Authorization', `Bearer ${winner.token}`)
      .send({ amount: 110 })
      .expect(201);

    // 4. PT-131 — El pedido lo crea el CIERRE de la subasta, no una peticion del ganador.
    //    `POST /api/v1/orders` ya no existe: `OrdersController` solo tiene `@Get()` y `@Get(':id')`.
    //    Antes esto esperaba 2,5 s a que expirara una subasta de 2 segundos; hoy la duracion minima
    //    es de una hora, asi que se adelanta el final y se invoca el cierre real.
    pedido = await cerrarYObtenerPedido(testApp.getApp(), testApp.getPrisma(), auctionId);
  });

  let pedido: { id: string; totalAmount: unknown; buyerId: string; sellerId: string } | null;

  describe('El pedido lo produce el cierre de la subasta', () => {
    it('el cierre crea el pedido para el ganador', () => {
      expect(pedido).not.toBeNull();
      expect(pedido!.buyerId).toBe(winner.id);
      expect(Number(pedido!.totalAmount)).toBe(110);
    });

    it('el perdedor no aparece como comprador', () => {
      // Antes esto era `POST /orders` con el token del perdedor esperando 403. Ya no hay endpoint
      // que abusar: el ganador lo decide el cierre, y esta es la afirmacion equivalente.
      expect(pedido!.buyerId).not.toBe(loser.id);
    });

    it('cerrar dos veces no duplica el pedido (idempotencia)', async () => {
      // La idempotencia sigue importando, pero el sujeto cambio: antes era «llamar dos veces al
      // endpoint»; hoy es «que el cron pase dos veces por la misma subasta». La restriccion unica
      // sobre `orders.auction_id` es lo que lo garantiza — la misma que PT-117 hizo saltar cuando
      // una subasta con pedido volvio a ACTIVE.
      const segunda = await cerrarYObtenerPedido(testApp.getApp(), testApp.getPrisma(), auctionId);

      expect(segunda!.id).toBe(pedido!.id);
      expect(await testApp.getPrisma().order.count({ where: { auctionId } })).toBe(1);
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
