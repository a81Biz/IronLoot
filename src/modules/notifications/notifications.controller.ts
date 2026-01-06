import { Controller, Get, Patch, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '../../modules/auth/decorators';
import { NotificationsService } from './notifications.service';
import { Log } from '../../common/observability/decorators';
import { NotificationDto, NotificationCountDto } from './dto/notifications.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List my notifications' })
  @ApiResponse({ status: 200, description: 'List of notifications', type: [NotificationDto] })
  @Log()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<NotificationDto[]> {
    const notifications = await this.notificationsService.findAllByUser(user.id);
    // Simple mapper if needed, otherwise rely on structural compatibility
    return notifications as any;
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get unread count' })
  @ApiResponse({ status: 200, description: 'Unread count', type: NotificationCountDto })
  @Log()
  getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<NotificationCountDto> {
    return this.notificationsService.getUnreadCount(user.id).then((count) => ({ count }));
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark all as read' })
  @ApiResponse({ status: 200, description: 'All marked as read' })
  @Log()
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  @ApiResponse({ status: 200, description: 'Updated notification', type: NotificationDto })
  @Log()
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationDto> {
    const notification = await this.notificationsService.markAsRead(user.id, id);
    return notification as any;
  }
}
