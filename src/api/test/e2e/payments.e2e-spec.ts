import request = require('supertest');
import { subastaValida, ponerEnCurso, cerrarYObtenerPedido } from '../core/auction-helper';
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

describe('Payments Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let seller: TestUser;
  let winner: TestUser;
  let auctionId: string;
  // PT-131 — Se conserva porque el escenario del cierre sigue montandose: es lo que da al
  // deposito un usuario con historia real. Que ya no se afirme sobre el pedido es consecuencia de
  // haber retirado los tests del endpoint legado, no de que el escenario sobre.
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

    // 4-5. PT-131 — El pedido lo crea el CIERRE (`POST /api/v1/orders` ya no existe), y se invoca
    //      el cierre real en vez de esperar 2,5 s a que pase el cron.
    const pedido = await cerrarYObtenerPedido(testApp.getApp(), testApp.getPrisma(), auctionId);
    if (!pedido) throw new Error('El cierre no genero pedido: el escenario no se puede montar');
    orderId = pedido.id;
    expect(orderId).toBeDefined();
  });

  afterAll(async () => {
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (winner) await authHelper.cleanup(winner.email);
    }
    await testApp.close();
  });

  /**
   * PT-131 — Los dos tests de `POST /payments/checkout` se retiraron, y el motivo importa.
   *
   * Ese endpoint **no lo invoca ningun cliente de la plataforma**. Se comprobo sobre todo `src/`:
   * el unico llamante era este mismo fichero. El deposito real del portal usa
   * `/api/v1/payments/initiate` —lo llama `public/js/pages/pages-wallet-deposit.js`— y es el flujo
   * que documenta `docs-v2/4-ingenieria/Catalogo-de-API.md:51`, el ciclo de pago de PT-080 con las
   * garantias de PT-087 (ADR-034 a ADR-040).
   *
   * Probar `checkout` obligaba a simular la pasarela o a llamar a `api-m.sandbox.paypal.com` desde
   * CI. Ninguna de las dos cosas tiene sentido para verificar un endpoint que nadie usa.
   *
   * **Lo que SI se prueba, abajo, es el flujo vigente.** Y el endpoint legado queda marcado como
   * obsoleto en el controlador; retirarlo es una decision de arquitectura registrada en PENDIENTES.
   */
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
