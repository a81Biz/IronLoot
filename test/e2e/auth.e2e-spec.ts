import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/database/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: 1, // URI versioning
      defaultVersion: '1',
    });
    
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: '@test-e2e.com' } },
    });
    await app.close();
  });

  describe('/api/v1/auth/register (POST)', () => {
    const testUser = {
      email: `testuser-${Date.now()}@test-e2e.com`,
      username: `testuser${Date.now()}`,
      password: 'TestPassword123!',
      displayName: 'E2E Test User',
    };

    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe(testUser.email.toLowerCase());
          expect(res.body.user.username).toBe(testUser.username.toLowerCase());
          expect(res.body.tokens).toBeDefined();
          expect(res.body.tokens.accessToken).toBeDefined();
          expect(res.body.tokens.refreshToken).toBeDefined();
        });
    });

    it('should fail with duplicate email', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `duplicate-${Date.now()}@test-e2e.com`,
          username: `unique${Date.now()}`,
          password: 'TestPassword123!',
        })
        .expect(201);

      // Attempt duplicate registration
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `duplicate-${Date.now()}@test-e2e.com`,
          username: `another${Date.now()}`,
          password: 'TestPassword123!',
        })
        .expect(409);
    });

    it('should fail with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          username: 'validuser',
          password: 'TestPassword123!',
        })
        .expect(400);
    });

    it('should fail with weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'valid@test-e2e.com',
          username: 'validuser',
          password: '123', // Too weak
        })
        .expect(400);
    });
  });

  describe('/api/v1/auth/login (POST)', () => {
    const testUser = {
      email: `logintest-${Date.now()}@test-e2e.com`,
      username: `logintest${Date.now()}`,
      password: 'TestPassword123!',
    };

    beforeAll(async () => {
      // Create user for login tests
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser);
    });

    it('should fail login for unverified user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(403); // User not verified
    });

    it('should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should fail with non-existent user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@test-e2e.com',
          password: 'SomePassword123!',
        })
        .expect(401);
    });
  });

  describe('/api/v1/health (GET)', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBeDefined();
        });
    });
  });
});
