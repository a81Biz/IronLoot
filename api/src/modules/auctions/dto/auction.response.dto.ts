import { ApiProperty } from '@nestjs/swagger';
import { AuctionStatus } from '@prisma/client';

export class AuctionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  status: AuctionStatus;

  @ApiProperty({ type: Number })
  startingPrice: number;

  @ApiProperty({ type: Number })
  currentPrice: number;

  @ApiProperty()
  startsAt: Date;

  @ApiProperty()
  endsAt: Date;

  @ApiProperty()
  sellerId: string;

  @ApiProperty({ required: false })
  sellerName?: string;

  @ApiProperty({ isArray: true })
  images: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
