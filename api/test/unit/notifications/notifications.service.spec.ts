import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../../../api/src/modules/notifications/notifications.service';
import { PrismaService } from '../../../api/src/database/prisma.service';
import { StructuredLogger } from '../../../api/src/common/observability';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  const mockLogger = {
    child: jest.fn().mockReturnThis(),
    info: jest.fn(),
    error: jest.fn(),
  };

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StructuredLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification', async () => {
      prisma.notification.create.mockResolvedValue({ id: '1', title: 'Test' });
      const result = await service.create('u1', 'SYSTEM' as any, 'Test', 'Msg');
      expect(result.id).toBe('1');
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark as read if exists and belongs to user', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u1' });
      prisma.notification.update.mockResolvedValue({ id: 'n1', isRead: true });

      const result = await service.markAsRead('u1', 'n1');
      expect(result.isRead).toBe(true);
    });

    it('should throw NotFound if not belongs to user', async () => {
      prisma.notification.findUnique.mockResolvedValue({ id: 'n1', userId: 'u2' });
      await expect(service.markAsRead('u1', 'n1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count', async () => {
      prisma.notification.count.mockResolvedValue(5);
      const count = await service.getUnreadCount('u1');
      expect(count).toBe(5);
    });
  });
});
