import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) - should return healthy status', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'healthy');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('environment');
        expect(res.body).toHaveProperty('uptime');
      });
  });

  it('/api/v1/health (GET) - should return trace-id header', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-trace-id']).toBeDefined();
      });
  });

  it('/api/v1/health (GET) - should use provided trace-id', () => {
    const traceId = 'test-trace-id-12345';
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-trace-id', traceId)
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-trace-id']).toBe(traceId);
      });
  });
});
