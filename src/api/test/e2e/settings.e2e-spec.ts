import request = require('supertest');
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';

describe('User Settings Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let user: TestUser;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());

    user = await authHelper.createAuthenticatedUser({ isSeller: false });
  });

  afterAll(async () => {
    if (authHelper && user) {
      await authHelper.cleanup(user.email);
    }
    await testApp.close();
  });

  describe('/api/v1/users/me/settings (GET)', () => {
    it('should return default settings', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .get('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.language).toBe('es'); // Default from schema
      expect(response.body.notifications.email).toBe(true);
      expect(response.body.notifications.inApp).toBe(true);
    });

    it('should require authentication', async () => {
      await request(testApp.getApp().getHttpServer()).get('/api/v1/users/me/settings').expect(401);
    });
  });

  describe('/api/v1/users/me/settings (PATCH)', () => {
    it('should update top-level settings', async () => {
      const updateData = { language: 'en' };
      const response = await request(testApp.getApp().getHttpServer())
        .patch('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.language).toBe('en');
      // Should preserve other settings
      expect(response.body.notifications.email).toBe(true);
    });

    it('should update nested settings (deep merge)', async () => {
      const updateData = { notifications: { email: false } };
      const response = await request(testApp.getApp().getHttpServer())
        .patch('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.notifications.email).toBe(false);
      expect(response.body.notifications.inApp).toBe(true); // Should preserve sibling
      expect(response.body.language).toBe('en'); // Should preserve parent sibling
    });

    it('should reject invalid keys (Whitelist)', async () => {
      const updateData = { invalidKey: 'hack' };
      await request(testApp.getApp().getHttpServer())
        .patch('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData)
        .expect(400);
    });

    it('should reject invalid types', async () => {
      const updateData = { notifications: { email: 'not-a-boolean' } };
      await request(testApp.getApp().getHttpServer())
        .patch('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${user.token}`)
        .send(updateData)
        .expect(400);
    });

    it('should persist changes', async () => {
      const response = await request(testApp.getApp().getHttpServer())
        .get('/api/v1/users/me/settings')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(response.body.language).toBe('en');
      expect(response.body.notifications.email).toBe(false);
    });
  });
});
