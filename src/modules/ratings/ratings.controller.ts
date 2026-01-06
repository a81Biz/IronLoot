import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../modules/auth/guards';
import { CurrentUser, AuthenticatedUser } from '../../modules/auth/decorators';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto';
import { Rating } from '@prisma/client';

@ApiTags('ratings')
@Controller()
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post('ratings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rate a transaction' })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRatingDto): Promise<Rating> {
    return this.ratingsService.create(user.id, dto);
  }

  @Get('users/:userId/ratings')
  @ApiOperation({ summary: 'Get ratings for a user' })
  @ApiResponse({ status: 200, description: 'List of ratings' })
  findAllByTarget(@Param('userId', ParseUUIDPipe) userId: string): Promise<Rating[]> {
    return this.ratingsService.findAllByTarget(userId);
  }
}
