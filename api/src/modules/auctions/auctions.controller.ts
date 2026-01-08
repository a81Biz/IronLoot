import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuctionStatus } from '@prisma/client';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, AuthenticatedUser, Public } from '@/modules/auth/decorators';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto, UpdateAuctionDto, AuctionResponseDto } from './dto';
import { Log, AuditedAction } from '../../common/observability/decorators';
import { AuditEventType, EntityType } from '../../common/observability/constants';
import { UnauthorizedException } from '../../common/observability';

@ApiTags('auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  /**
   * Create a new auction
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create auction',
    description: 'Create a new auction in DRAFT state. **Requires authentication** (Seller only).',
  })
  @ApiResponse({ status: 201, description: 'Auction created', type: AuctionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not a seller' })
  @AuditedAction(AuditEventType.AUCTION_CREATED, EntityType.AUCTION, (args, result) => result.id, [
    'title',
    'startingPrice',
  ])
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAuctionDto,
  ): Promise<AuctionResponseDto> {
    return this.auctionsService.create(user.id, dto);
  }

  /**
   * List auctions (Public)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard) // Allow user context if token present, but don't require it
  @ApiOperation({ summary: 'List auctions', description: 'Get a list of auctions with filtering' })
  @ApiQuery({
    name: 'status',
    enum: AuctionStatus,
    required: false,
    description: 'Filter by status (Public view allows ACTIVE/PUBLISHED only)',
  })
  @ApiQuery({
    name: 'sellerId',
    required: false,
    description: 'Filter by seller ID',
  })
  @ApiQuery({
    name: 'mine',
    required: false,
    type: Boolean,
    description: 'Show only my auctions (Requires Auth). Overrides sellerId.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default 10)',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of auctions' })
  @ApiResponse({ status: 401, description: 'Unauthorized (if mine=true and no auth)' })
  @Log()
  async findAll(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query('status') status?: AuctionStatus,
    @Query('sellerId') sellerId?: string,
    @Query('mine') mine?: string, // Boolean query params often come as strings
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<{ data: AuctionResponseDto[]; total: number; page: number; limit: number }> {
    const isMine = mine === 'true';

    if (isMine && !user) {
      throw new UnauthorizedException('Authentication required for mine=true');
    }

    return this.auctionsService.findAll({
      status,
      sellerId,
      page,
      limit,
      mine: isMine,
      currentUserId: user?.id,
    });
  }

  /**
   * Get auction details
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get auction details' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Auction details', type: AuctionResponseDto })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @Log()
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AuctionResponseDto> {
    return this.auctionsService.findOne(id);
  }

  /**
   * Update auction
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update auction',
    description:
      'Update auction details (only in DRAFT state). **Requires authentication** (Owner only).',
  })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Auction updated', type: AuctionResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Not owner or not in DRAFT state' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @AuditedAction(AuditEventType.AUCTION_UPDATED, EntityType.AUCTION, (args) => args[1])
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuctionDto,
  ): Promise<AuctionResponseDto> {
    return this.auctionsService.update(user.id, id, dto);
  }

  /**
   * Publish auction
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish auction',
    description: 'Change status from DRAFT to PUBLISHED. **Requires authentication** (Owner only).',
  })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Auction published', type: AuctionResponseDto })
  @ApiResponse({ status: 403, description: 'Not owner or not in DRAFT state' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  @AuditedAction(AuditEventType.AUCTION_PUBLISHED, EntityType.AUCTION, (args) => args[1])
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuctionResponseDto> {
    return this.auctionsService.publish(user.id, id);
  }
}
