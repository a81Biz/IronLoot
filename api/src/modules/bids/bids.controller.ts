import { Bid } from '@prisma/client';
import { Controller, Post, Get, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, AuthenticatedUser, Public } from '@/modules/auth/decorators';
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
  @Public() // Audit #20: Public access to bids
  @ApiOperation({ summary: 'Get auction bids', description: 'Get history of bids for an auction' })
  @ApiParam({ name: 'auctionId', description: 'Auction ID' })
  @Log()
  async getBids(@Param('auctionId', ParseUUIDPipe) auctionId: string): Promise<Bid[]> {
    return this.bidsService.getBidsForAuction(auctionId);
  }
}

@ApiTags('bids')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('bids')
export class UserBidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get('my-active')
  @ApiOperation({
    summary: 'Get my active bids',
    description: 'Get list of active auctions user has bid on',
  })
  @ApiResponse({ status: 200, description: 'List of active bids' })
  @Log({ message: 'Get my active bids' })
  async getMyActiveBids(@CurrentUser() user: AuthenticatedUser): Promise<Bid[]> {
    return this.bidsService.getUserActiveBids(user.id);
  }

  @Get('my-history')
  @ApiOperation({
    summary: 'Get my bid history',
    description: 'Get list of all auctions user has bid on',
  })
  @ApiResponse({ status: 200, description: 'List of all bids' })
  @Log({ message: 'Get my bid history' })
  async getMyBids(@CurrentUser() user: AuthenticatedUser): Promise<Bid[]> {
    return this.bidsService.getUserBids(user.id);
  }
}
