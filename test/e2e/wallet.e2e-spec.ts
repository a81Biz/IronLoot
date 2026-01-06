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
    expect(res.body.currency).toBe('USD');
    expect(Number(res.body.available)).toBe(0);
  });

  it('/wallet/deposit (POST) - Deposit Funds', async () => {
    const depositAmount = 100;
    const res = await request(app.getHttpServer())
      .post('/wallet/deposit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: depositAmount, referenceId: 'e2e-dep-1' })
      .expect(201);

    expect(res.body.wallet).toBeDefined();
    expect(Number(res.body.wallet.balance)).toBe(depositAmount);
  });

  it('/wallet/withdraw (POST) - Withdraw Funds', async () => {
    const withdrawAmount = 40;
    const res = await request(app.getHttpServer())
      .post('/wallet/withdraw')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: withdrawAmount, referenceId: 'e2e-with-1' })
      .expect(201);

    expect(res.body.wallet).toBeDefined();
    // 100 - 40 = 60
    expect(Number(res.body.wallet.balance)).toBe(60);
  });

  it('/wallet/withdraw (POST) - Insufficient Funds', async () => {
    await request(app.getHttpServer())
      .post('/wallet/withdraw')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 1000, referenceId: 'e2e-fail' })
      .expect(400); // Bad Request
  });

  it('/wallet/history (GET) - Transaction History', async () => {
    const res = await request(app.getHttpServer())
      .get('/wallet/history')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.history).toBeInstanceOf(Array);
    expect(res.body.history.length).toBeGreaterThanOrEqual(2); // Deposit + Withdraw
  });
});
