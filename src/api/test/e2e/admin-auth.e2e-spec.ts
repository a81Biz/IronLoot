import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../../src/app.module';

/**
 * PT-036 (AUD-004) — Gap B: el login admin debe estar limitado (10/min).
 * Requiere el harness e2e (Postgres + Redis) — se ejecuta en CI (test-integration).
 */
describe('Admin Auth throttle (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'gVhWufw77SwrICrpSAXKWP4htd1G7XSVvJEK1Wm5EAF';
    process.env.ADMIN_USERNAME = 'ironadmin-e2e';
    process.env.ADMIN_PASSWORD = 'strong-e2e-pass';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('B1: devuelve 429 tras superar el límite de 10/min en /admin/auth/login', async () => {
    const url = '/api/v1/admin/auth/login';
    const body = { username: 'ironadmin-e2e', password: 'wrong-on-purpose' };

    let sawTooMany = false;
    for (let i = 0; i < 12; i++) {
      const res = await request(app.getHttpServer()).post(url).send(body);
      if (res.status === 429) {
        sawTooMany = true;
        break;
      }
    }
    expect(sawTooMany).toBe(true);
  });
});
