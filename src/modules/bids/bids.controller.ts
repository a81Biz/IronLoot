import { Bid } from '@prisma/client';
import { Controller, Post, Get, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '@/modules/auth/decorators';
import { BidsService } from './bids.service';
import { CreateBidDto } from './dto';
import { Log, AuditedAction } from '../../common/observability/decorators';
import { AuditEventType, EntityType } from '../../common/observability/constants';

@ApiTags('bids')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('auctions/:auctionId/bids')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post()
  @ApiOperation({ summary: 'Place a bid', description: 'Place a bid on an active auction' })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  @ApiResponse({ status: 201, description: 'Bid placed successfully' })
  @AuditedAction(
    AuditEventType.BID_PLACED,
    EntityType.AUCTION,
    (args) => args[0], // auctionId
    ['amount'],
  )
  async placeBid(
    @Param('auctionId', ParseUUIDPipe) auctionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBidDto,
  ): Promise<Bid> {
    return this.bidsService.placeBid(user.id, auctionId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get auction bids', description: 'Get history of bids for an auction' })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  @Log()
  async getBids(@Param('auctionId', ParseUUIDPipe) auctionId: string): Promise<Bid[]> {
    return this.bidsService.getBidsForAuction(auctionId);
  }
}
