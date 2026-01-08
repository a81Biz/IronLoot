import { ApiProperty } from '@nestjs/swagger';

export class BidResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 105.5 })
  amount: number;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  auctionId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  bidderId: string;

  @ApiProperty()
  createdAt: Date;
}
