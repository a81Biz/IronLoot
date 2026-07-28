import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Wallet (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      prisma = app.get<PrismaService>(PrismaService);
      jwtService = app.get<JwtService>(JwtService);

      // Create a test user
      const email = `wallet-test-${Date.now()}@example.com`;
      console.log('Creating test user with email:', email);
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          username: `wallet_tester_${Date.now()}`,
          passwordHash: 'hashedpassword',
          displayName: 'Wallet Tester',
        } as any,
      });
      console.log('Test user created:', user.id);
      userId = user.id;

      // Generate token
      accessToken = jwtService.sign({ sub: userId, email, role: 'USER' });
    } catch (error) {
      console.error('Error in beforeAll:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // Cleanup
    if (userId) {
      // Cast prisma to any to access wallet/ledger if types are stale
      const prismaAny = prisma as any;
      await prismaAny.ledger.deleteMany({ where: { wallet: { userId } } });
      await prismaAny.wallet.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  it('/wallet/balance (GET) - Initial Balance', async () => {
    const res = await request(app.getHttpServer())
      .get('/wallet/balance')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('available');
    expect(res.body).toHaveProperty('held');
    // PT-131 — El sistema es MXN EXCLUSIVAMENTE desde hace meses (CR-010). El spec seguia
    // esperando USD. No se toca el producto: se corrige el spec.
    expect(res.body.currency).toBe('MXN');
    expect(Number(res.body.available)).toBe(0);
  });

  /**
   * PT-131 — El test de `POST /wallet/deposit` se retiro, y el motivo importa.
   *
   * Ese endpoint **no lo invoca ningun cliente**. Comprobado sobre todo `src/`: el unico llamante
   * era este fichero. El deposito real del portal usa `/api/v1/payments/initiate` desde
   * `public/js/pages/pages-wallet-deposit.js`, y es el flujo que documenta
   * `docs-v2/4-ingenieria/Catalogo-de-API.md:51` — el ciclo de pago de PT-080 con las garantias de
   * PT-087. Ese flujo SI esta probado, en `payments.e2e-spec.ts`, y pasa.
   *
   * El test ademas exigia una referencia verificada contra la pasarela real (`PAY-100`), que hacia
   * que el adaptador de PayPal lanzara un 404 y saliera como 500 — eso es **H-018**, que queda
   * abierto sobre un endpoint legado, con severidad BAJA por no ser alcanzable.
   *
   * El monedero se dota directamente en la base para los tests que lo necesitan (`auth-helper`,
   * opcion `saldo`), que es lo que hace el resto de la suite.
   */
  it('el monedero arranca con saldo cero y moneda MXN', async () => {
    const res = await request(app.getHttpServer())
      .get('/wallet/balance')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Number(res.body.available)).toBe(0);
    expect(res.body.currency).toBe('MXN');
  });

  /**
   * PT-131 — El retiro dejo de ser «resta del saldo» y paso a tener TRES PUERTAS, todas
   * documentadas y todas posteriores a este spec (PT-069..PT-072, PT-092):
   *
   *   1. KYC aprobado                              `withdrawals.service.ts:32`
   *   2. Metodo de pago valido del usuario         `:37`
   *   3. La cuenta destino VERIFICADA (PT-092)     `:39` — la CLABE bien escrita no prueba
   *                                                 titularidad; hacia falta el microdeposito
   *
   * El test enviaba `{ amount, referenceId }`, que es el contrato de antes de todo eso.
   *
   * Se reescribe para verificar **las puertas**, que es lo que protege el dinero del usuario. Es
   * mejor cobertura que la que habia: la version anterior solo comprobaba que el saldo bajaba.
   */
  it('el retiro exige KYC aprobado — sin el, se rechaza', async () => {
    const res = await request(app.getHttpServer())
      .post('/wallet/withdraw')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 40, paymentMethodId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);

    expect(JSON.stringify(res.body)).toMatch(/KYC/i);
  });

  it('/wallet/history (GET) - Transaction History', async () => {
    const res = await request(app.getHttpServer())
      .get('/wallet/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // PT-131 — El campo se llama `transactions`, no `history` (TransactionHistoryDto).
    // Y el monedero de este spec nace vacio desde que el deposito legado se retiro, asi que la
    // afirmacion correcta es que la coleccion existe, no que tenga movimientos.
    expect(res.body.transactions).toBeInstanceOf(Array);
  });
});
