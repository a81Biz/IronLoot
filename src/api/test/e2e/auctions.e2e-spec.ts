import request = require('supertest');
import { ponerEnCurso, subastaValida } from '../core/auction-helper';
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { CreateAuctionDto } from '../../src/modules/auctions/dto';

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
    buyer = await authHelper.createAuthenticatedUser({ isSeller: false, saldo: 10000 });
  });

  afterAll(async () => {
    // Cleanup users (cascades to auctions)
    if (authHelper) {
      if (seller) await authHelper.cleanup(seller.email);
      if (buyer) await authHelper.cleanup(buyer.email);
    }
    await testApp.close();
  });

  // PT-131 — Era un `const` a nivel de modulo con DOS defectos:
  //
  //   1. Duracion de 59 minutos (inicio +1 min, fin +60 min). El DTO exige minimo 1 HORA.
  //   2. Se evaluaba al IMPORTAR el fichero. Para cuando corria el test, `startsAt` ya estaba en
  //      el pasado — y el DTO exige fecha futura.
  //
  // Ahora es una funcion: cada llamada devuelve fechas frescas y validas.
  const nuevaSubasta = (): CreateAuctionDto => ({
    ...subastaValida({ title: 'Test Auction', startingPrice: 100 }),
    description: 'This is a test auction',
    images: ['https://example.com/image.jpg'],
  });

  let auctionId: string;

  describe('/api/v1/auctions (POST)', () => {
    it('should allow seller to create an auction', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .post('/api/v1/auctions')
        .set('Authorization', `Bearer ${seller.token}`)
        .send(nuevaSubasta())
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Test Auction');
      expect(response.body.status).toBe('DRAFT');

      auctionId = response.body.id;
    });

    it('should deny non-seller', async () => {
      await request(testApp.getApp().getHttpServer())
        .post('/api/v1/auctions')
        .set('Authorization', `Bearer ${buyer.token}`)
        .send(nuevaSubasta())
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

      // PT-131 — El listado dejo de ser un array pelado y pasa a respuesta PAGINADA
      // (`{ data, total, page, limit }`). Es el mismo cambio que PT-067/068 hizo en el historial.
      // El spec seguia esperando el array de antes.
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
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

      // PT-131 — La subasta se crea con inicio FUTURO porque el DTO lo exige
      // (`isFutureDate`). Estos escenarios necesitan una subasta EN CURSO, asi que se
      // mueve el reloj en la base DESPUES de crearla por la via publica.
      await ponerEnCurso(testApp.getPrisma(), auctionId);
      expect(response.body.status).toBe('PUBLISHED');
    });
  });
});
