import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StructuredLogger, ChildLogger } from '../../common/observability';
import { Notification, NotificationType, Prisma } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger: ChildLogger;

  constructor(
    private readonly prisma: PrismaService,
    logger: StructuredLogger,
  ) {
    this.logger = logger.child('NotificationsService');
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Prisma.InputJsonValue = {},
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data,
      },
    });

    this.logger.info(`Notification created for User ${userId}`, {
      notificationId: notification.id,
      type,
    });

    return notification;
  }

  async findAllByUser(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }
}
