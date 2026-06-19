import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';

describe('User Profile Sync (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

  const testUser = {
    email: 'sync-test@example.com',
    password: 'SecurePass123!',
    username: 'syncuser',
    displayName: 'Sync User',
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

    await app.init();
    prisma = app.get(PrismaService);

    // Cleanup
    await prisma.session?.deleteMany({});
    await prisma.user?.deleteMany({ where: { email: testUser.email } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.session?.deleteMany({});
      await prisma.user?.deleteMany({ where: { email: testUser.email } });
    }
    await app.close();
  });

  it('1. Register User', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    userId = res.body.user.id;
    accessToken = res.body.tokens.accessToken;

    expect(userId).toBeDefined();
  });

  it('2. Verify Parity between /auth/me and /users/me (Initial State)', async () => {
    const authMe = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const usersMe = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Check key fields
    expect(authMe.body.username).toBe(testUser.username);
    expect(authMe.body.emailVerified).toBe(false); // Default

    expect(usersMe.body.username).toBe(testUser.username);
    expect(usersMe.body.emailVerified).toBe(false);

    // Parity Check
    expect(authMe.body.username).toBe(usersMe.body.username);
    expect(authMe.body.emailVerified).toBe(usersMe.body.emailVerified);
    // Note: auth/me might return profile as undefined if null, users/me might return it as null/undefined.
    // We check looser equality or specific fields.
  });

  it('3. Verify Email and Check Parity Again', async () => {
    // Manually verify in DB
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        state: 'ACTIVE', // Required for profile updates
      },
    });

    const authMe = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const usersMe = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(authMe.body.emailVerified).toBe(true);
    expect(usersMe.body.emailVerified).toBe(true);
    expect(authMe.body.emailVerified).toBe(usersMe.body.emailVerified);
  });

  it('4. Update Profile (Add Legal Name) and Check Parity', async () => {
    // Update profile via users endpoint with NESTED structure
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        profile: {
          legalName: 'Legal Sync Entity',
          country: 'US',
        },
      })
      .expect(200);

    const authMe = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const usersMe = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // Expect legalName to be present
    expect(authMe.body.profile.legalName).toBe('Legal Sync Entity');
    expect(usersMe.body.profile.legalName).toBe('Legal Sync Entity');

    expect(authMe.body.profile.legalName).toBe(usersMe.body.profile.legalName);
  });
});
