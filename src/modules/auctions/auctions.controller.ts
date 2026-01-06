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
import { JwtAuthGuard } from '@/modules/auth/guards';
import { CurrentUser, AuthenticatedUser, Public } from '@/modules/auth/decorators';
import { AuctionsService } from './auctions.service';
import { CreateAuctionDto, UpdateAuctionDto, AuctionResponseDto } from './dto';

@ApiTags('Auctions')
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not a seller' })
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
  @Public()
  @ApiOperation({ summary: 'List auctions', description: 'Get a list of auctions with filtering' })
  @ApiQuery({
    name: 'status',
    enum: AuctionStatus,
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'sellerId', required: false, description: 'Filter by seller ID' })
  @ApiResponse({ status: 200, description: 'List of auctions', type: [AuctionResponseDto] })
  async findAll(
    @Query('status') status?: AuctionStatus,
    @Query('sellerId') sellerId?: string,
  ): Promise<AuctionResponseDto[]> {
    return this.auctionsService.findAll({ status, sellerId });
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
  @ApiResponse({ status: 403, description: 'Not owner or not in DRAFT state' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
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
  async publish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuctionResponseDto> {
    return this.auctionsService.publish(user.id, id);
  }
}
