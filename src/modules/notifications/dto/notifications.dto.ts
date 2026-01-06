import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Unique identifier',
  })
  id: string;

  @ApiProperty({ example: 'AUCTION_WON', description: 'Type of notification' })
  type: string;

  @ApiProperty({ example: 'You won the auction!', description: 'Notification message' })
  message: string;

  @ApiProperty({ example: false, description: 'Read status' })
  read: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: { auctionId: '123' }, description: 'Additional data' })
  data: Record<string, any>;
}

export class NotificationCountDto {
  @ApiProperty({ example: 5, description: 'Number of unread notifications' })
  count: number;
}
