import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../modules/auth/guards';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  // let service: NotificationsService;

  const mockNotificationsService = {
    findAllByUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockUser = { id: 'user-id' } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    // service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return user notifications', async () => {
      const result = [{ id: 'notif-1' }];
      mockNotificationsService.findAllByUser.mockResolvedValue(result);

      expect(await controller.findAll(mockUser, 20, 0)).toBe(result);
      expect(mockNotificationsService.findAllByUser).toHaveBeenCalledWith(mockUser.id, 20, 0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);
      const result = await controller.getUnreadCount(mockUser);
      expect(result).toEqual({ count: 5 });
      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      const result = { count: 3 };
      mockNotificationsService.markAllAsRead.mockResolvedValue(result);

      expect(await controller.markAllAsRead(mockUser)).toBe(result);
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('markAsRead', () => {
    it('should mark one as read', async () => {
      const result = { id: 'notif-1', read: true };
      mockNotificationsService.markAsRead.mockResolvedValue(result);

      expect(await controller.markAsRead(mockUser, 'notif-1')).toBe(result);
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(mockUser.id, 'notif-1');
    });
  });
});
