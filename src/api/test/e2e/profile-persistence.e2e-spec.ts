import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module'; // Correct relative path
import { PrismaService } from '../../src/database/prisma.service'; // Needed for manual update
import { UserState } from '@prisma/client';

describe('Profile Persistence (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    // No global prefix for simplicity unless main.ts sets it.
    // main.ts sets 'api' prefix. We must respect that or set it here.
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const email = `test_persist_${Date.now()}@example.com`;
  const password = 'Password123!';
  const username = `user_${Date.now()}`;

  it('should register a new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, username, password })
      .expect(201);

    expect(res.body.user.email).toBe(email);

    // Manual verification to allow login
    await prisma.user.update({
      where: { email },
      data: { state: UserState.ACTIVE, emailVerifiedAt: new Date() },
    });
  });

  it('should login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    accessToken = res.body.tokens.accessToken;
    refreshToken = res.body.tokens.refreshToken;
    expect(accessToken).toBeDefined();
  });

  it('should update profile displayName', async () => {
    const newName = 'Persisted Name';
    const res = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ displayName: newName })
      .expect(200);

    expect(res.body.displayName).toBe(newName);

    // Verify persistence via GET
    const getRes = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(getRes.body.displayName).toBe(newName);
  });

  it('should refresh token and see updated displayName', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const newAccessToken = res.body.accessToken;
    expect(newAccessToken).toBeDefined();

    // Verify with new token
    const getRes = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    expect(getRes.body.displayName).toBe('Persisted Name');

    // Optional: Decode token to verify payload if we had a decoding util
    // But GET /users/me proves it enough if it relies on the same DB data.
  });
});
