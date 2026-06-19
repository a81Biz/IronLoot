import { ApiProperty } from '@nestjs/swagger';
import { AuctionResponseDto } from '../../auctions/dto/auction.response.dto';

export class WatchlistItemResponseDto {
  @ApiProperty({ example: 'w_123' })
  id: string;

  @ApiProperty({ example: 'auc_123' })
  auctionId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: AuctionResponseDto })
  auction: AuctionResponseDto;
}
