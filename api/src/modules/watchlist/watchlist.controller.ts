import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Log, AuditedAction, AuditEventType, EntityType } from '../../common/observability';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { WatchlistService } from './watchlist.service';
import { CreateWatchlistDto, WatchlistItemResponseDto } from './dto';

@ApiTags('watchlist')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly service: WatchlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user watchlist' })
  @ApiResponse({
    status: 200,
    description: 'List of watched auctions with embedded details',
    type: [WatchlistItemResponseDto],
  })
  @Log()
  async getWatchlist(@Request() req: any): Promise<WatchlistItemResponseDto[]> {
    return this.service.findAll(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add auction to watchlist' })
  @ApiResponse({
    status: 200,
    description: 'Auction added to watchlist (or already exists)',
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @AuditedAction(
    AuditEventType.WATCHLIST_ADD,
    EntityType.WATCHLIST,
    (args: any) => args[0].user?.id,
    ['auctionId'],
  )
  async addToWatchlist(@Request() req: any, @Body() dto: CreateWatchlistDto): Promise<void> {
    await this.service.add(req.user.id, dto);
  }

  @Delete(':auctionId')
  @ApiOperation({ summary: 'Remove auction from watchlist' })
  @ApiResponse({
    status: 204,
    description: 'Auction removed from watchlist (idempotent)',
  })
  @AuditedAction(
    AuditEventType.WATCHLIST_REMOVE,
    EntityType.WATCHLIST,
    (args: any) => args[0].user?.id,
    ['auctionId'], // Extracts parameter for audit payload
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromWatchlist(
    @Request() req: any,
    @Param('auctionId') auctionId: string,
  ): Promise<void> {
    await this.service.remove(req.user.id, auctionId);
  }
}
