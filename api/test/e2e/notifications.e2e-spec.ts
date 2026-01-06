import request = require('supertest');
import { TestApp } from '../core/test-app';
import { AuthHelper, TestUser } from '../core/auth-helper';
import { NotificationsService } from '../../api/src/modules/notifications/notifications.service';
import { NotificationType } from '@prisma/client';

describe('Notifications Module (e2e)', () => {
  let testApp: TestApp;
  let authHelper: AuthHelper;
  let user: TestUser;
  let notificationsService: NotificationsService;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.init();
    authHelper = new AuthHelper(testApp.getApp(), testApp.getPrisma());
    notificationsService = testApp.getApp().get(NotificationsService);

    user = await authHelper.createAuthenticatedUser();
  });

  afterAll(async () => {
    if (authHelper) {
      if (user) await authHelper.cleanup(user.email);
    }
    await testApp.close();
  });

  it('should initially have 0 notifications', async () => {
    const res = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('should receive a notification when created internally', async () => {
    // Manually create notification via Service
    await notificationsService.create(
      user.id,
      NotificationType.SYSTEM,
      'Welcome',
      'Welcome to Iron Loot',
    );

    const res = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Welcome');
    expect(res.body[0].isRead).toBe(false);
  });

  it('should get unread count correctly', async () => {
    const res = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.count).toBe(1);
  });

  it('should mark notification as read', async () => {
    // Get ID first
    const listRes = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${user.token}`);

    const id = listRes.body[0].id;

    const res = await request(testApp.getApp().getHttpServer())
      .patch(`/api/v1/notifications/${id}/read`)
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    expect(res.body.isRead).toBe(true);

    // Verify Count
    const countRes = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${user.token}`);

    expect(countRes.body.count).toBe(0);
  });

  it('should mark all as read', async () => {
    // Create another one
    await notificationsService.create(user.id, NotificationType.SYSTEM, 'Alert', 'Another alert');

    await request(testApp.getApp().getHttpServer())
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${user.token}`)
      .expect(200);

    const countRes = await request(testApp.getApp().getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${user.token}`);

    expect(countRes.body.count).toBe(0);
  });
});
